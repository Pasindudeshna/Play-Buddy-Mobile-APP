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
};
