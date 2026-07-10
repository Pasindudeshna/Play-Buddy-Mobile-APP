import type { Timestamp } from "firebase/firestore";
import type { SportId } from "./sports";

export type FacilityStatus = "pending" | "approved" | "rejected";

export type Facility = {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  name: string;
  description: string;
  sports: SportId[];
  address: string;
  location: { latitude: number; longitude: number };
  geohash: string;
  contactPhone: string;
  contactEmail: string;
  photoUrls: string[];
  status: FacilityStatus;
  rejectionReason: string | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  approvedAt: Timestamp | null;
  /** Standard hourly charge for booking this ground. */
  pricePerHour: number;
  currency: string;
  /** Daily booking window, "HH:MM" 24h. Slots are generated between these. */
  openingTime: string;
  closingTime: string;
  /** Booking slot granularity in minutes (e.g. 30, 60, 90, 120). */
  slotDurationMinutes: number;
};

export const DEFAULT_SLOT_DURATION_MINUTES = 60;
export const DEFAULT_CURRENCY = "LKR";
