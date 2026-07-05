import {
  Timestamp,
  addDoc,
  collection,
  doc,
  GeoPoint,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Coords, geohashFor } from "./location";

export type TimeSlot = { start: Date; end: Date };

export type QueueTicketStatus = "waiting" | "matched" | "cancelled" | "expired";

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

const QUEUE_TICKET_TTL_MINUTES = 30;
const SLOT_DURATION_MINUTES = 60;

/**
 * Turns the UI's free-text date ("mm/dd/yyyy") + a time chip label ("06:00")
 * into a concrete {start, end} Date range. Falls back to today's date if the
 * text doesn't parse, so a malformed date never blocks the search.
 */
export function buildTimeSlot(dateText: string, timeLabel: string): TimeSlot {
  const now = new Date();
  let month = now.getMonth() + 1;
  let day = now.getDate();
  let year = now.getFullYear();

  const dateMatch = dateText.match(/(\d{1,2})\D+(\d{1,2})\D+(\d{2,4})/);
  if (dateMatch) {
    month = parseInt(dateMatch[1], 10);
    day = parseInt(dateMatch[2], 10);
    year = parseInt(dateMatch[3], 10);
    if (year < 100) year += 2000;
  }

  const [hours, minutes] = timeLabel.split(":").map((n) => parseInt(n, 10));
  const start = new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0);
  const end = new Date(start.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);
  return { start, end };
}

export type CreateTicketInput = {
  userId: string;
  sport: string;
  date: string;
  timeSlot: TimeSlot;
  playersNeeded: number;
  coords: Coords;
};

/** Creates a new queue ticket. A Cloud Function trigger picks it up and tries to match it. */
export async function createQueueTicket(input: CreateTicketInput): Promise<string> {
  const now = Date.now();
  const expiresAt = new Date(now + QUEUE_TICKET_TTL_MINUTES * 60 * 1000);

  const docRef = await addDoc(collection(db, "matchQueue"), {
    userId: input.userId,
    sport: input.sport,
    date: input.date,
    timeSlot: {
      start: Timestamp.fromDate(input.timeSlot.start),
      end: Timestamp.fromDate(input.timeSlot.end),
    },
    playersNeeded: input.playersNeeded,
    location: new GeoPoint(input.coords.latitude, input.coords.longitude),
    geohash: geohashFor(input.coords),
    searchRadiusKm: 1,
    status: "waiting" as QueueTicketStatus,
    matchId: null,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
  });

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
