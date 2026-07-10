import { Firestore } from "firebase-admin/firestore";

/**
 * Reads whether a facility has any free capacity, without exposing other
 * users' booking details (name/phone/etc) to the client — firestore.rules
 * only lets a booking be read by its own booker, the venue owner, or a
 * match participant, so a client-side query across *all* bookings for a
 * facility+date (needed to check capacity) would be rejected outright.
 * Runs with the Admin SDK for that reason, same as the rest of netlify/functions.
 */

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeRangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(aEnd) > timeToMinutes(bStart);
}

/** Bookable slot start times ("HH:MM") between opening and closing time — mirrors lib/booking.ts's generateSlotStartTimes(). */
export function generateSlotStartTimes(
  openingTime: string,
  closingTime: string,
  slotDurationMinutes: number
): string[] {
  const open = timeToMinutes(openingTime);
  const close = timeToMinutes(closingTime);
  const slots: string[] = [];
  for (let t = open; t + slotDurationMinutes <= close; t += slotDurationMinutes) {
    slots.push(minutesToTime(t));
  }
  return slots;
}

type BookingDoc = {
  date: string;
  startTime: string;
  endTime: string;
  status: string;
};

/** Every non-cancelled booking for a facility on a given date. */
async function loadBookingsForDate(db: Firestore, facilityId: string, date: string): Promise<BookingDoc[]> {
  const snap = await db
    .collection("bookings")
    .where("facilityId", "==", facilityId)
    .where("date", "==", date)
    .get();
  return snap.docs.map((d) => d.data() as BookingDoc).filter((b) => b.status !== "cancelled");
}

/** How many non-cancelled bookings for `facilityId` overlap [start, end) on `date`. */
export async function countOverlappingBookings(
  db: Firestore,
  facilityId: string,
  date: string,
  start: string,
  end: string
): Promise<number> {
  const bookings = await loadBookingsForDate(db, facilityId, date);
  return bookings.filter((b) => timeRangesOverlap(b.startTime, b.endTime, start, end)).length;
}

/** Every fixed-grid slot start time that's already at capacity (courtsCount) for a facility on a date. */
export async function findFullSlots(
  db: Firestore,
  facilityId: string,
  date: string,
  openingTime: string,
  closingTime: string,
  slotDurationMinutes: number,
  courtsCount: number
): Promise<string[]> {
  const bookings = await loadBookingsForDate(db, facilityId, date);
  const slots = generateSlotStartTimes(openingTime, closingTime, slotDurationMinutes);

  return slots.filter((start) => {
    const end = minutesToTime(timeToMinutes(start) + slotDurationMinutes);
    const overlapping = bookings.filter((b) => timeRangesOverlap(b.startTime, b.endTime, start, end));
    return overlapping.length >= courtsCount;
  });
}
