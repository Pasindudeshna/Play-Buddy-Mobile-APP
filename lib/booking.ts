import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

export type FacilityStatus = "pending" | "approved" | "rejected";

/** Mirrors facility-web's src/lib/facility.ts — subset of fields the mobile app needs to browse/book grounds. */
export type Facility = {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  sports: string[];
  address: string;
  location: { latitude: number; longitude: number };
  contactPhone: string;
  photoUrls: string[];
  status: FacilityStatus;
  pricePerHour: number;
  currency: string;
  openingTime: string; // "HH:MM"
  closingTime: string; // "HH:MM"
  slotDurationMinutes: number;
};

export type BookingStatus = "confirmed" | "cancelled";
export type PaymentStatus = "unpaid" | "paid";

export type Booking = {
  id: string;
  facilityId: string;
  facilityName: string;
  ownerId: string;
  userId: string;
  userName: string;
  userPhone: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  dateTimeKey: string;
  durationHours: number;
  pricePerHour: number;
  currency: string;
  totalAmount: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  /** Set when this booking came from a Find Buddy match's venue confirmation, not the standalone Book a Ground flow. */
  matchId: string | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

/** Generates bookable slot start times ("HH:MM") between opening and closing time. */
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

export function slotEndTime(startTime: string, slotDurationMinutes: number): string {
  return minutesToTime(timeToMinutes(startTime) + slotDurationMinutes);
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function bookingDocId(facilityId: string, date: string, startTime: string): string {
  return `${facilityId}__${date}__${startTime.replace(":", "")}`;
}

/**
 * True if a facility has pricing/hours configured at all. Grounds registered
 * before this field existed (or an owner who hasn't set it up in "Manage
 * Slots & Bookings" yet) won't have these — treat them as browse-only/not
 * bookable rather than crashing generateSlotStartTimes() on undefined input.
 */
export function isBookable(facility: Facility): boolean {
  return (
    typeof facility.pricePerHour === "number" &&
    facility.pricePerHour > 0 &&
    !!facility.openingTime &&
    !!facility.closingTime &&
    typeof facility.slotDurationMinutes === "number" &&
    facility.slotDurationMinutes > 0
  );
}

/** Live list of approved grounds, newest first. */
export function subscribeToApprovedFacilities(
  onChange: (facilities: Facility[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(collection(db, "facilities"), where("status", "==", "approved"));
  return onSnapshot(
    q,
    (snap) => {
      onChange(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Facility, "id">) })));
    },
    (err) => onError?.(err)
  );
}

/** Start times already booked (and not cancelled) for a facility on a given date. */
export async function getBookedSlotTimes(facilityId: string, date: string): Promise<Set<string>> {
  const q = query(
    collection(db, "bookings"),
    where("facilityId", "==", facilityId),
    where("date", "==", date)
  );
  const snap = await getDocs(q);
  const booked = new Set<string>();
  snap.forEach((d) => {
    const b = d.data() as Booking;
    if (b.status !== "cancelled") booked.add(b.startTime);
  });
  return booked;
}

/**
 * Books a single slot. Uses a deterministic doc ID (facility+date+startTime)
 * inside a transaction so two players racing for the same slot can't both
 * succeed — whoever's transaction commits first wins, the other gets a
 * "slot already booked" error and should refresh availability.
 */
export async function createBooking(input: {
  facility: Facility;
  userId: string;
  userName: string;
  userPhone: string;
  date: string;
  startTime: string;
}): Promise<void> {
  const { facility } = input;
  const endTime = slotEndTime(input.startTime, facility.slotDurationMinutes);
  const durationHours = facility.slotDurationMinutes / 60;
  const totalAmount = Math.round(facility.pricePerHour * durationHours * 100) / 100;
  const ref = doc(db, "bookings", bookingDocId(facility.id, input.date, input.startTime));

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists() && (snap.data() as Booking).status !== "cancelled") {
      throw new Error("This slot was just booked by someone else — please pick another.");
    }
    tx.set(ref, {
      facilityId: facility.id,
      facilityName: facility.name,
      ownerId: facility.ownerId,
      userId: input.userId,
      userName: input.userName,
      userPhone: input.userPhone,
      date: input.date,
      startTime: input.startTime,
      endTime,
      dateTimeKey: `${input.date}T${input.startTime}`,
      durationHours,
      pricePerHour: facility.pricePerHour,
      currency: facility.currency,
      totalAmount,
      status: "confirmed",
      paymentStatus: "unpaid",
      matchId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

/** Deterministic id so both matched players resolve the same booking doc without a server round-trip. */
export function matchBookingId(matchId: string): string {
  return `match_${matchId}`;
}

/** Live view of a single booking by id (used to watch a match's ground booking from either player's screen). */
export function subscribeToBooking(
  bookingId: string,
  onChange: (booking: Booking | null) => void
) {
  return onSnapshot(doc(db, "bookings", bookingId), (snap) => {
    onChange(snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Booking, "id">) }) : null);
  });
}

/** Live list of the current user's bookings, most recent first. */
export function subscribeToMyBookings(
  userId: string,
  onChange: (bookings: Booking[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(
    collection(db, "bookings"),
    where("userId", "==", userId),
    orderBy("dateTimeKey", "desc")
  );
  return onSnapshot(
    q,
    (snap) => {
      onChange(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, "id">) })));
    },
    (err) => onError?.(err)
  );
}

export async function cancelBooking(bookingId: string): Promise<void> {
  await updateDoc(doc(db, "bookings", bookingId), {
    status: "cancelled",
    updatedAt: serverTimestamp(),
  });
}
