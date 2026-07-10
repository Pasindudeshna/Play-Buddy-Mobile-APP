import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

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
  /** Sortable "YYYY-MM-DDTHH:MM" key, used for server-side ordering. */
  dateTimeKey: string;
  durationHours: number;
  pricePerHour: number;
  currency: string;
  totalAmount: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  /** Set when this came from a Find Buddy match's venue confirmation rather than the standalone booking flow. */
  matchId?: string | null;
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

/** Live bookings for a facility (owner's "Bookings" view). */
export function subscribeToFacilityBookings(
  facilityId: string,
  onChange: (bookings: Booking[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(
    collection(db, "bookings"),
    where("facilityId", "==", facilityId),
    orderBy("dateTimeKey", "asc")
  );
  return onSnapshot(
    q,
    (snap) => {
      onChange(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, "id">) })));
    },
    (err) => onError?.(err)
  );
}

/** Owner marks a pay-at-venue booking as paid/unpaid. */
export async function setBookingPaymentStatus(
  bookingId: string,
  paymentStatus: PaymentStatus
): Promise<void> {
  await updateDoc(doc(db, "bookings", bookingId), {
    paymentStatus,
    updatedAt: serverTimestamp(),
  });
}
