import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import {
  DocumentData,
  Firestore,
  GeoPoint,
  QueryDocumentSnapshot,
  Timestamp,
  FieldValue,
  getFirestore,
} from "firebase-admin/firestore";
import { distanceBetween, geohashQueryBounds } from "geofire-common";

/** Radius steps (km) the matcher expands through before giving up for this pass. */
const RADIUS_STEPS_KM = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export type QueueTicket = {
  userId: string;
  sport: string;
  date: string;
  timeSlot: { start: Timestamp; end: Timestamp };
  playersNeeded: number;
  location: GeoPoint;
  geohash: string;
  searchRadiusKm: number;
  status: "waiting" | "matched" | "cancelled" | "expired";
  matchId: string | null;
  createdAt: Timestamp;
  expiresAt: Timestamp;
};

function timeSlotsOverlap(a: QueueTicket["timeSlot"], b: QueueTicket["timeSlot"]): boolean {
  return a.start.toMillis() < b.end.toMillis() && a.end.toMillis() > b.start.toMillis();
}

/**
 * Finds the best (oldest-waiting) candidate ticket for `ticket` within
 * `radiusKm`, same sport, overlapping time slot, excluding the ticket's own
 * user. Geohash bounds over-select at the edges, so results are re-filtered
 * with the exact haversine distance.
 */
async function findCandidateWithinRadius(
  db: Firestore,
  ticketId: string,
  ticket: QueueTicket,
  radiusKm: number
): Promise<QueryDocumentSnapshot<DocumentData> | null> {
  const center: [number, number] = [ticket.location.latitude, ticket.location.longitude];
  const bounds = geohashQueryBounds(center, radiusKm * 1000);

  const snapshots = await Promise.all(
    bounds.map(([start, end]) =>
      db
        .collection("matchQueue")
        .where("sport", "==", ticket.sport)
        .where("status", "==", "waiting")
        .orderBy("geohash")
        .startAt(start)
        .endAt(end)
        .get()
    )
  );

  const seen = new Set<string>();
  const candidates: QueryDocumentSnapshot<DocumentData>[] = [];

  for (const snap of snapshots) {
    for (const docSnap of snap.docs) {
      if (docSnap.id === ticketId || seen.has(docSnap.id)) continue;
      seen.add(docSnap.id);

      const data = docSnap.data() as QueueTicket;
      if (data.userId === ticket.userId) continue;
      if (!timeSlotsOverlap(data.timeSlot, ticket.timeSlot)) continue;

      const distanceKm = distanceBetween(
        [data.location.latitude, data.location.longitude],
        center
      );
      if (distanceKm > radiusKm) continue;

      candidates.push(docSnap);
    }
  }

  candidates.sort(
    (a, b) =>
      (a.data() as QueueTicket).createdAt.toMillis() -
      (b.data() as QueueTicket).createdAt.toMillis()
  );

  return candidates[0] ?? null;
}

/**
 * Atomically matches `ticketId` with `candidateId` if both are still
 * waiting. Returns true if a match was created. Losing this race (someone
 * else matched one of the two tickets a moment earlier) is expected and
 * simply returns false so the caller can keep searching.
 */
async function tryCreateMatch(
  db: Firestore,
  ticketId: string,
  candidateId: string
): Promise<boolean> {
  return db.runTransaction(async (tx) => {
    const ticketRef = db.doc(`matchQueue/${ticketId}`);
    const candidateRef = db.doc(`matchQueue/${candidateId}`);
    const [ticketSnap, candidateSnap] = await Promise.all([
      tx.get(ticketRef),
      tx.get(candidateRef),
    ]);

    if (!ticketSnap.exists || !candidateSnap.exists) return false;

    const ticket = ticketSnap.data() as QueueTicket;
    const candidate = candidateSnap.data() as QueueTicket;
    if (ticket.status !== "waiting" || candidate.status !== "waiting") return false;

    const matchRef = db.collection("matches").doc();
    const midpoint = new GeoPoint(
      (ticket.location.latitude + candidate.location.latitude) / 2,
      (ticket.location.longitude + candidate.location.longitude) / 2
    );

    tx.set(matchRef, {
      sport: ticket.sport,
      date: ticket.date,
      timeSlot: ticket.timeSlot,
      players: [ticket.userId, candidate.userId],
      midpoint,
      status: "pending_venue",
      selectedVenueId: null,
      createdAt: FieldValue.serverTimestamp(),
    });

    tx.update(ticketRef, { status: "matched", matchId: matchRef.id });
    tx.update(candidateRef, { status: "matched", matchId: matchRef.id });

    return true;
  });
}

/**
 * Tries to match a single waiting ticket, expanding the search radius from
 * 1km to 10km. Used both by the onCreate trigger (instant matching for the
 * common case) and by the periodic sweep (safety net for tickets that were
 * waiting before a nearby match ever showed up — see sweep.ts).
 */
export async function attemptMatch(db: Firestore, ticketId: string): Promise<boolean> {
  const ticketSnap = await db.doc(`matchQueue/${ticketId}`).get();
  if (!ticketSnap.exists) return false;

  const ticket = ticketSnap.data() as QueueTicket;
  if (ticket.status !== "waiting") return false;

  for (const radiusKm of RADIUS_STEPS_KM) {
    const candidate = await findCandidateWithinRadius(db, ticketId, ticket, radiusKm);
    if (!candidate) continue;

    const matched = await tryCreateMatch(db, ticketId, candidate.id);
    if (matched) {
      logger.info(`Matched ticket ${ticketId} with ${candidate.id} at ${radiusKm}km`);
      return true;
    }
    // Lost the race for this candidate — keep expanding within this same pass.
  }

  await db.doc(`matchQueue/${ticketId}`).update({ searchRadiusKm: 10 });
  return false;
}

export const onQueueTicketCreated = onDocumentCreated(
  "matchQueue/{ticketId}",
  async (event) => {
    if (!event.data) return;
    const db = getFirestore();
    await attemptMatch(db, event.params.ticketId);
  }
);
