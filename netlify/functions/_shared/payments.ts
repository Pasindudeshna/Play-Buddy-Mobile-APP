import { FieldValue, Firestore, Timestamp } from "firebase-admin/firestore";

type MatchDoc = {
  players: string[];
  date: string;
  timeSlot: { start: Timestamp; end: Timestamp };
  selectedVenueId: string | null;
};

type VenueOptionDoc = {
  name: string;
  facilityId: string | null;
};

type FacilityDoc = {
  ownerId: string;
  pricePerHour: number;
  currency: string;
  openingTime?: string;
  closingTime?: string;
  slotDurationMinutes?: number;
};

type BookingDoc = {
  status: string;
  paymentStatus: string;
};

function formatTime(ts: Timestamp): string {
  return ts.toDate().toISOString().slice(11, 16);
}

function isBookable(facility: FacilityDoc): boolean {
  return typeof facility.pricePerHour === "number" && facility.pricePerHour > 0;
}

/** Shared validation: match exists, caller is a player, venue confirmed and bookable. */
async function loadBookableMatch(db: Firestore, uid: string, matchId: string) {
  const matchSnap = await db.doc(`matches/${matchId}`).get();
  if (!matchSnap.exists) throw new Error("not-found:Match not found.");

  const match = matchSnap.data() as MatchDoc;
  if (!match.players.includes(uid)) {
    throw new Error("permission-denied:Only matched players can act on this booking.");
  }
  if (!match.selectedVenueId) {
    throw new Error("failed-precondition:No venue has been confirmed for this match yet.");
  }

  const venueSnap = await db.doc(`matches/${matchId}/venueOptions/${match.selectedVenueId}`).get();
  if (!venueSnap.exists) throw new Error("not-found:Confirmed venue not found.");
  const venue = venueSnap.data() as VenueOptionDoc;
  if (!venue.facilityId) {
    throw new Error("failed-precondition:This venue isn't a bookable ground.");
  }

  const facilitySnap = await db.doc(`facilities/${venue.facilityId}`).get();
  if (!facilitySnap.exists) throw new Error("not-found:Facility not found.");
  const facility = facilitySnap.data() as FacilityDoc;
  if (!isBookable(facility)) {
    throw new Error("failed-precondition:This ground doesn't have pricing configured.");
  }

  const durationHours = (match.timeSlot.end.toMillis() - match.timeSlot.start.toMillis()) / 3_600_000;
  const totalAmount = Math.round(facility.pricePerHour * durationHours * 100) / 100;
  const perPlayerAmount = Math.round((totalAmount / match.players.length) * 100) / 100;

  return { match, venue, facility, durationHours, totalAmount, perPlayerAmount };
}

/**
 * Read-only lookup used to build a PayHere checkout request — what the
 * caller owes for their matched game, with nothing written yet. Payment
 * itself is only ever recorded once PayHere's notify_url webhook confirms it
 * (see payhere-notify.mts) — this function just prices the checkout.
 */
export async function resolveCheckoutDetails(db: Firestore, uid: string, matchId: string) {
  const { venue, facility, perPlayerAmount } = await loadBookableMatch(db, uid, matchId);
  return {
    venueName: venue.name,
    currency: facility.currency,
    amount: perPlayerAmount,
  };
}

/**
 * Records a match's ground booking as paid. Only ever called from
 * payhere-notify.mts after PayHere's webhook signature has been verified —
 * `uid` here is PayHere's echoed custom_1 field (the player who checked
 * out), re-validated against match.players since it didn't come through
 * Firebase Auth. Runs with the Admin SDK, bypassing firestore.rules (which
 * only allow a booking to be created "unpaid" client-side).
 */
export async function payForMatchBooking(db: Firestore, uid: string, matchId: string): Promise<void> {
  const { match, venue, facility, durationHours, totalAmount } = await loadBookableMatch(db, uid, matchId);

  const userSnap = await db.doc(`users/${uid}`).get();
  const u = userSnap.exists ? (userSnap.data() as any) : {};

  const ref = db.doc(`bookings/match_${matchId}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const existing = snap.data() as BookingDoc;
      if (existing.status !== "cancelled") {
        if (existing.paymentStatus !== "paid") {
          tx.update(ref, { paymentStatus: "paid", updatedAt: FieldValue.serverTimestamp() });
        }
        return;
      }
    }

    const startTime = formatTime(match.timeSlot.start);
    tx.set(ref, {
      facilityId: venue.facilityId,
      facilityName: venue.name,
      ownerId: facility.ownerId,
      userId: uid,
      userName: u.fullName ?? "Player",
      userPhone: u.phone ?? "",
      date: match.date,
      startTime,
      endTime: formatTime(match.timeSlot.end),
      dateTimeKey: `${match.date}T${startTime}`,
      durationHours,
      pricePerHour: facility.pricePerHour,
      currency: facility.currency,
      totalAmount,
      status: "confirmed",
      paymentStatus: "paid",
      matchId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // A match only counts as "played" once its ground is actually booked —
    // award both matched players a point here, exactly once per match
    // (this branch only runs the first time the booking doc is created).
    for (const playerId of match.players) {
      tx.set(db.doc(`users/${playerId}`), { points: FieldValue.increment(1) }, { merge: true });
    }
  });
}
