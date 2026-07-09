import {
  DocumentData,
  FieldValue,
  Firestore,
  GeoPoint,
  QueryDocumentSnapshot,
  Timestamp,
} from "firebase-admin/firestore";
import { createVenueOptionsForMatch } from "./venues";

export type QueueTicketStatus = "waiting" | "choosing" | "matched" | "cancelled" | "expired";

export type QueueTicket = {
  userId: string;
  sport: string;
  date: string;
  timeSlot: { start: Timestamp; end: Timestamp };
  playersNeeded: number;
  location: GeoPoint;
  geohash: string;
  searchRadiusKm: number;
  status: QueueTicketStatus;
  matchId: string | null;
  createdAt: Timestamp;
  expiresAt: Timestamp;
};

function timeSlotsOverlap(a: QueueTicket["timeSlot"], b: QueueTicket["timeSlot"]): boolean {
  return a.start.toMillis() < b.end.toMillis() && a.end.toMillis() > b.start.toMillis();
}

/**
 * Finds every valid candidate ticket for `ticket` within its own
 * `searchRadiusKm` — same sport, overlapping time slot, excluding the
 * ticket's own user — sorted closest-first.
 */
async function findCandidatesWithinRadius(
  db: Firestore,
  ticketId: string,
  ticket: QueueTicket
): Promise<(QueryDocumentSnapshot<DocumentData> & { _distanceKm: number })[]> {
  const { distanceBetween, geohashQueryBounds } = await import("geofire-common");
  const center: [number, number] = [ticket.location.latitude, ticket.location.longitude];
  const radiusKm = ticket.searchRadiusKm;
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
  const candidates: (QueryDocumentSnapshot<DocumentData> & { _distanceKm: number })[] = [];

  for (const snap of snapshots) {
    for (const docSnap of snap.docs) {
      if (docSnap.id === ticketId || seen.has(docSnap.id)) continue;
      seen.add(docSnap.id);

      const data = docSnap.data() as QueueTicket;
      if (data.userId === ticket.userId) continue;
      if (!timeSlotsOverlap(data.timeSlot, ticket.timeSlot)) continue;

      const distanceKm = distanceBetween([data.location.latitude, data.location.longitude], center);
      if (distanceKm > radiusKm) continue;

      candidates.push(Object.assign(docSnap, { _distanceKm: distanceKm }));
    }
  }

  candidates.sort((a, b) => a._distanceKm - b._distanceKm);
  return candidates;
}

/**
 * Atomically matches `ticketId` with `candidateId` if both are still
 * waiting. Returns the new matchId if a match was created, else null.
 */
async function tryCreateMatch(db: Firestore, ticketId: string, candidateId: string): Promise<string | null> {
  return db.runTransaction(async (tx) => {
    const ticketRef = db.doc(`matchQueue/${ticketId}`);
    const candidateRef = db.doc(`matchQueue/${candidateId}`);
    const [ticketSnap, candidateSnap] = await Promise.all([tx.get(ticketRef), tx.get(candidateRef)]);

    if (!ticketSnap.exists || !candidateSnap.exists) return null;

    const ticket = ticketSnap.data() as QueueTicket;
    const candidate = candidateSnap.data() as QueueTicket;
    if (ticket.status !== "waiting" && ticket.status !== "choosing") return null;
    if (candidate.status !== "waiting") return null;

    const matchRef = db.collection("matches").doc();
    const midpoint = new GeoPoint(
      (ticket.location.latitude + candidate.location.latitude) / 2,
      (ticket.location.longitude + candidate.location.longitude) / 2
    );
    const playerCoords: Record<string, GeoPoint> = {
      [ticket.userId]: ticket.location,
      [candidate.userId]: candidate.location,
    };

    tx.set(matchRef, {
      sport: ticket.sport,
      date: ticket.date,
      timeSlot: ticket.timeSlot,
      players: [ticket.userId, candidate.userId],
      playerCoords,
      midpoint,
      status: "pending_venue",
      selectedVenueId: null,
      createdAt: FieldValue.serverTimestamp(),
    });

    tx.update(ticketRef, { status: "matched", matchId: matchRef.id });
    tx.update(candidateRef, { status: "matched", matchId: matchRef.id });

    return matchRef.id;
  });
}

/** Overwrites `matchQueue/{ticketId}/candidates`. Pass an empty array to clear stale candidates. */
async function writeCandidates(
  db: Firestore,
  ticketId: string,
  candidates: (QueryDocumentSnapshot<DocumentData> & { _distanceKm: number })[]
): Promise<void> {
  const candidatesRef = db.collection(`matchQueue/${ticketId}/candidates`);
  const existing = await candidatesRef.get();

  const batch = db.batch();
  existing.docs.forEach((d) => batch.delete(d.ref));
  for (const candidate of candidates) {
    const data = candidate.data() as QueueTicket;
    batch.set(candidatesRef.doc(candidate.id), {
      candidateUserId: data.userId,
      candidateTicketId: candidate.id,
      distanceKm: Math.round(candidate._distanceKm * 10) / 10,
    });
  }
  if (candidates.length > 0) {
    batch.update(db.doc(`matchQueue/${ticketId}`), { status: "choosing" as QueueTicketStatus });
  }
  await batch.commit();
}

async function finalizeMatch(db: Firestore, matchId: string): Promise<void> {
  const matchSnap = await db.doc(`matches/${matchId}`).get();
  if (!matchSnap.exists) return;
  const match = matchSnap.data() as { sport: string; midpoint: GeoPoint; playerCoords?: Record<string, GeoPoint> };
  await createVenueOptionsForMatch(db, matchId, match);
}

/**
 * Re-evaluates a single waiting-or-choosing ticket: searches its own
 * `searchRadiusKm` for candidates and branches on the count. Idempotent and
 * safe to re-run repeatedly (called directly after ticket creation, after a
 * failed candidate pick, and by the periodic sweep), so a ticket's
 * `choosing` candidate list self-heals as other tickets come and go.
 */
export async function attemptMatch(db: Firestore, ticketId: string): Promise<boolean> {
  const ticketSnap = await db.doc(`matchQueue/${ticketId}`).get();
  if (!ticketSnap.exists) return false;

  const ticket = ticketSnap.data() as QueueTicket;
  if (ticket.status !== "waiting" && ticket.status !== "choosing") return false;

  const candidates = await findCandidatesWithinRadius(db, ticketId, ticket);

  if (candidates.length === 0) {
    if (ticket.status === "choosing") {
      await writeCandidates(db, ticketId, []);
      await db.doc(`matchQueue/${ticketId}`).update({ status: "waiting" as QueueTicketStatus });
    }
    return false;
  }

  if (candidates.length === 1) {
    const matchId = await tryCreateMatch(db, ticketId, candidates[0].id);
    if (matchId) {
      await finalizeMatch(db, matchId);
      return true;
    }
    return false;
  }

  await writeCandidates(db, ticketId, candidates);
  return false;
}

/** Finalizes a match with a chosen candidate. Throws a coded error (see _shared/errors.ts) on failure. */
export async function selectMatchCandidate(
  db: Firestore,
  uid: string,
  ticketId: string,
  candidateTicketId: string
): Promise<void> {
  const ticketSnap = await db.doc(`matchQueue/${ticketId}`).get();
  if (!ticketSnap.exists) throw new Error("not-found:Ticket not found.");

  const ticket = ticketSnap.data() as QueueTicket;
  if (ticket.userId !== uid) throw new Error("permission-denied:You don't own this ticket.");
  if (ticket.status !== "choosing") throw new Error("failed-precondition:This ticket isn't awaiting a choice.");

  const candidateRef = db.collection(`matchQueue/${ticketId}/candidates`).doc(candidateTicketId);
  const candidateSnap = await candidateRef.get();
  if (!candidateSnap.exists) {
    throw new Error("not-found:That candidate is no longer available. Pick another.");
  }

  const matchId = await tryCreateMatch(db, ticketId, candidateTicketId);
  if (!matchId) {
    await candidateRef.delete().catch(() => undefined);
    throw new Error("failed-precondition:That player just matched with someone else. Pick another.");
  }

  await finalizeMatch(db, matchId);
}
