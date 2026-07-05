import * as Location from "expo-location";
import { GeoPoint, doc, updateDoc } from "firebase/firestore";
import { geohashForLocation, distanceBetween } from "geofire-common";
import { db } from "../firebaseConfig";

export type Coords = { latitude: number; longitude: number };

export class LocationPermissionDeniedError extends Error {
  constructor() {
    super("Location permission denied");
    this.name = "LocationPermissionDeniedError";
  }
}

/** Requests foreground location permission. Throws if the user denies it. */
export async function ensureLocationPermission(): Promise<void> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new LocationPermissionDeniedError();
  }
}

/** Gets the device's current GPS coordinates. Requests permission first if needed. */
export async function getCurrentCoords(): Promise<Coords> {
  await ensureLocationPermission();
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

/** geofire-common geohash for a coordinate pair, used for radius range queries. */
export function geohashFor({ latitude, longitude }: Coords): string {
  return geohashForLocation([latitude, longitude]);
}

/** Straight-line distance between two coordinates, in kilometers. */
export function distanceKm(a: Coords, b: Coords): number {
  return distanceBetween([a.latitude, a.longitude], [b.latitude, b.longitude]);
}

/** Persists the user's current location + geohash onto their users/{uid} doc. */
export async function saveUserLocation(uid: string, coords: Coords): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    location: new GeoPoint(coords.latitude, coords.longitude),
    geohash: geohashFor(coords),
    locationUpdatedAt: new Date(),
  });
}

/**
 * Geocodes a free-text address/city into coordinates using the device's
 * built-in geocoder (no Google API key required). Falls back to null if
 * nothing is found. Good enough for city-level fallback when GPS is denied;
 * swap for the Google Geocoding API server-side if you need higher accuracy
 * for ambiguous names (see docs/MATCHING_SYSTEM_GUIDE.md §5).
 */
export async function geocodeAddress(address: string): Promise<Coords | null> {
  const results = await Location.geocodeAsync(address);
  if (!results.length) return null;
  return { latitude: results[0].latitude, longitude: results[0].longitude };
}
