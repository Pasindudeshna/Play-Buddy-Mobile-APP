import { geohashForLocation } from "geofire-common";

/** Mirrors lib/location.ts's geohashing convention for GeoPoint fields. */
export function geohashFor(latitude: number, longitude: number): string {
  return geohashForLocation([latitude, longitude]);
}
