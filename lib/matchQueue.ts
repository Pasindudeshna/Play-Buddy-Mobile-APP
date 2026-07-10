import {
  Timestamp,
  addDoc,
  collection,
  doc,
  GeoPoint,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { callMatchApi } from "./matchApi";
import { Coords, geohashFor } from "./location";

export type TimeSlot = { start: Date; end: Date };

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

export type MatchCandidate = {
  id: string;
  candidateUserId: string;
  candidateTicketId: string;
  distanceKm: number;
};

const QUEUE_TICKET_TTL_MINUTES = 30;

/** Combines a calendar day with user-picked start/end times (only the time-of-day is used from each) into a concrete {start, end} range. */
export function buildTimeSlot(date: Date, startTime: Date, endTime: Date): TimeSlot {
  const start = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    startTime.getHours(),
    startTime.getMinutes(),
    0,
    0
  );
  const end = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    endTime.getHours(),
    endTime.getMinutes(),
    0,
    0
  );
  return { start, end };
}

export type CreateTicketInput = {
  userId: string;
  sport: string;
  date: Date;
  timeSlot: TimeSlot;
  playersNeeded: number;
  coords: Coords;
  radiusKm: number;
};

/**
 * Creates a new queue ticket and immediately asks the matchmaking API to try
 * matching it (the periodic sweep is a fallback safety net, not the primary
 * trigger, since there's no Firestore onCreate trigger without Cloud
 * Functions — see netlify/functions/attempt-match.mts).
 */
export async function createQueueTicket(input: CreateTicketInput): Promise<string> {
  const now = Date.now();
  const expiresAt = new Date(now + QUEUE_TICKET_TTL_MINUTES * 60 * 1000);

  const docRef = await addDoc(collection(db, "matchQueue"), {
    userId: input.userId,
    sport: input.sport,
    date: input.date.toISOString().slice(0, 10),
    timeSlot: {
      start: Timestamp.fromDate(input.timeSlot.start),
      end: Timestamp.fromDate(input.timeSlot.end),
    },
    playersNeeded: input.playersNeeded,
    location: new GeoPoint(input.coords.latitude, input.coords.longitude),
    geohash: geohashFor(input.coords),
    searchRadiusKm: input.radiusKm,
    status: "waiting" as QueueTicketStatus,
    matchId: null,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
  });

  try {
    await callMatchApi("/api/attempt-match", { ticketId: docRef.id });
  } catch (e) {
    // Non-fatal: the periodic sweep (every 2 min) will pick this ticket up as a fallback.
    console.log("attempt-match request failed, will rely on periodic sweep:", e);
  }

  return docRef.id;
}

export async function cancelQueueTicket(ticketId: string): Promise<void> {
  await updateDoc(doc(db, "matchQueue", ticketId), { status: "cancelled" });
}

/** Subscribes to a ticket's live status. Returns an unsubscribe function. */
export function subscribeToTicket(
  ticketId: string,
  onChange: (ticket: (QueueTicket & { id: string }) | null) => void
): () => void {
  return onSnapshot(doc(db, "matchQueue", ticketId), (snap) => {
    if (!snap.exists()) {
      onChange(null);
      return;
    }
    onChange({ id: snap.id, ...(snap.data() as QueueTicket) });
  });
}

/** Subscribes to a "choosing" ticket's candidate list, closest-first. Returns an unsubscribe function. */
export function subscribeToCandidates(
  ticketId: string,
  onChange: (candidates: MatchCandidate[]) => void
): () => void {
  return onSnapshot(
    query(collection(db, "matchQueue", ticketId, "candidates"), orderBy("distanceKm", "asc")),
    (snap) => {
      onChange(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MatchCandidate, "id">) }))
      );
    }
  );
}

/** Finalizes a match with the chosen candidate. Throws if the candidate was taken by someone else. */
export async function selectMatchCandidate(
  ticketId: string,
  candidateTicketId: string
): Promise<void> {
  await callMatchApi("/api/select-match-candidate", { ticketId, candidateTicketId });
}
