import { Firestore, GeoPoint, Timestamp } from "firebase-admin/firestore";
import { countOverlappingBookings } from "./availability";

/** Maps our internal sport ids to a Places "keyword" search term. */
const SPORT_KEYWORDS: Record<string, string> = {
  badminton: "badminton court",
  tennis: "tennis court",
  table_tennis: "table tennis club",
  cricket: "cricket ground",
  football: "football ground",
  basketball: "basketball court",
  volleyball: "volleyball court",
  swimming: "swimming pool",
};

const SEARCH_RADIUS_METERS = 5000;
const MAX_VENUE_OPTIONS = 10;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceByPlayerKm(
  venueLocation: { latitude: number; longitude: number },
  playerCoords: Record<string, GeoPoint>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [uid, coords] of Object.entries(playerCoords)) {
    result[uid] =
      Math.round(
        haversineKm(venueLocation.latitude, venueLocation.longitude, coords.latitude, coords.longitude) * 10
      ) / 10;
  }
  return result;
}

function fairnessScore(distances: Record<string, number>): number {
  return Math.max(...Object.values(distances));
}

function formatTime(ts: Timestamp): string {
  return ts.toDate().toISOString().slice(11, 16);
}

type Facility = {
  name: string;
  address: string;
  location: GeoPoint;
  sports: string[];
  status: "pending" | "approved" | "rejected";
  photoUrls?: string[];
  /** Courts/grounds bookable in parallel. Missing on facilities registered before this field existed — treated as 1. */
  courtsCount?: number;
};

type RegisteredVenue = {
  id: string;
  name: string;
  address: string;
  location: GeoPoint;
  photoUrl: string | null;
  distanceFromMidpointKm: number;
};

/**
 * Import lazily so this module doesn't need geofire-common unless it's
 * actually called. Excludes facilities with no free capacity for the
 * match's date/time (bookings already at courtsCount) — checked nearest
 * candidate first so we stop hitting the bookings collection as soon as
 * `maxResults` genuinely-available grounds are found.
 */
async function findRegisteredFacilities(
  db: Firestore,
  midpoint: GeoPoint,
  sport: string,
  maxResults: number,
  date: string,
  startTime: string,
  endTime: string
): Promise<RegisteredVenue[]> {
  const { geohashQueryBounds } = await import("geofire-common");
  const center: [number, number] = [midpoint.latitude, midpoint.longitude];
  const bounds = geohashQueryBounds(center, SEARCH_RADIUS_METERS);

  const snapshots = await Promise.all(
    bounds.map(([start, end]) =>
      db
        .collection("facilities")
        .where("status", "==", "approved")
        .where("sports", "array-contains", sport)
        .orderBy("geohash")
        .startAt(start)
        .endAt(end)
        .get()
    )
  );

  const seen = new Set<string>();
  const candidates: (RegisteredVenue & { _sort: number; _courtsCount: number })[] = [];

  for (const snap of snapshots) {
    for (const docSnap of snap.docs) {
      if (seen.has(docSnap.id)) continue;
      seen.add(docSnap.id);

      const facility = docSnap.data() as Facility;
      const distanceKm = haversineKm(
        midpoint.latitude,
        midpoint.longitude,
        facility.location.latitude,
        facility.location.longitude
      );
      if (distanceKm > SEARCH_RADIUS_METERS / 1000) continue;

      candidates.push({
        id: docSnap.id,
        name: facility.name,
        address: facility.address,
        location: facility.location,
        photoUrl: facility.photoUrls?.[0] ?? null,
        distanceFromMidpointKm: Math.round(distanceKm * 10) / 10,
        _sort: distanceKm,
        _courtsCount: facility.courtsCount ?? 1,
      });
    }
  }

  candidates.sort((a, b) => a._sort - b._sort);

  const available: RegisteredVenue[] = [];
  for (const candidate of candidates) {
    if (available.length >= maxResults) break;
    const bookedCount = await countOverlappingBookings(db, candidate.id, date, startTime, endTime);
    if (bookedCount < candidate._courtsCount) {
      const { _sort, _courtsCount, ...venue } = candidate;
      available.push(venue);
    }
  }
  return available;
}

type PlacesNearbyResult = {
  place_id: string;
  name: string;
  vicinity?: string;
  rating?: number;
  geometry: { location: { lat: number; lng: number } };
  photos?: { photo_reference: string }[];
};

export type VenueOptionDoc = {
  placeId: string | null;
  facilityId: string | null;
  name: string;
  address: string | null;
  location: GeoPoint;
  photoRef: string | null;
  photoUrl: string | null;
  rating: number | null;
  distanceFromMidpointKm: number;
  distanceByPlayerKm: Record<string, number>;
  votes: Record<string, boolean>;
  voteCount: number;
  source: "registered" | "places";
};

/**
 * Finds venues around a match's midpoint (registered facilities first, Google
 * Places fills remaining slots) and writes them to
 * `matches/{matchId}/venueOptions`, ranked by fairness — the venue's larger
 * distance to either player — rather than raw distance to the midpoint.
 */
export async function createVenueOptionsForMatch(
  db: Firestore,
  matchId: string,
  match: {
    sport: string;
    midpoint: GeoPoint;
    playerCoords?: Record<string, GeoPoint>;
    date: string;
    timeSlot: { start: Timestamp; end: Timestamp };
  }
): Promise<void> {
  const midpoint = match.midpoint;
  const playerCoords = match.playerCoords ?? {};
  const keyword = SPORT_KEYWORDS[match.sport] ?? match.sport;

  const registered = await findRegisteredFacilities(
    db,
    midpoint,
    match.sport,
    MAX_VENUE_OPTIONS,
    match.date,
    formatTime(match.timeSlot.start),
    formatTime(match.timeSlot.end)
  );

  const venues: (VenueOptionDoc & { _id: string })[] = registered.map((facility) => ({
    _id: facility.id,
    placeId: null,
    facilityId: facility.id,
    name: facility.name,
    address: facility.address,
    location: facility.location,
    photoRef: null,
    photoUrl: facility.photoUrl,
    rating: null,
    distanceFromMidpointKm: facility.distanceFromMidpointKm,
    distanceByPlayerKm: distanceByPlayerKm(facility.location, playerCoords),
    votes: {},
    voteCount: 0,
    source: "registered",
  }));

  const remaining = MAX_VENUE_OPTIONS - registered.length;
  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (remaining > 0 && mapsApiKey) {
    const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
    url.searchParams.set("location", `${midpoint.latitude},${midpoint.longitude}`);
    url.searchParams.set("radius", String(SEARCH_RADIUS_METERS));
    url.searchParams.set("keyword", keyword);
    url.searchParams.set("key", mapsApiKey);

    type PlacesNearbyResponse = { status: string; error_message?: string; results?: PlacesNearbyResult[] };
    try {
      const res = await fetch(url.toString());
      const json = (await res.json()) as PlacesNearbyResponse;

      if (json.status === "OK" || json.status === "ZERO_RESULTS") {
        const results = (json.results ?? []).slice(0, remaining);
        for (const place of results) {
          const location = { latitude: place.geometry.location.lat, longitude: place.geometry.location.lng };
          const distanceFromMidpointKm = haversineKm(
            midpoint.latitude,
            midpoint.longitude,
            location.latitude,
            location.longitude
          );

          venues.push({
            _id: place.place_id,
            placeId: place.place_id,
            facilityId: null,
            name: place.name,
            address: place.vicinity ?? null,
            location: new GeoPoint(location.latitude, location.longitude),
            photoRef: place.photos?.[0]?.photo_reference ?? null,
            photoUrl: null,
            rating: place.rating ?? null,
            distanceFromMidpointKm: Math.round(distanceFromMidpointKm * 10) / 10,
            distanceByPlayerKm: distanceByPlayerKm(location, playerCoords),
            votes: {},
            voteCount: 0,
            source: "places",
          });
        }
      } else {
        console.error("Places API error", json.status, json.error_message);
      }
    } catch (err) {
      console.error("Places API request failed", err);
    }
  }

  // Registered facilities always rank above Places results; within each group, rank by fairness.
  venues.sort((a, b) => {
    if (a.source !== b.source) return a.source === "registered" ? -1 : 1;
    return fairnessScore(a.distanceByPlayerKm) - fairnessScore(b.distanceByPlayerKm);
  });

  const batch = db.batch();
  for (const { _id, ...venue } of venues.slice(0, MAX_VENUE_OPTIONS)) {
    batch.set(db.collection(`matches/${matchId}/venueOptions`).doc(_id), venue);
  }
  await batch.commit();
}

/**
 * Re-scans for registered facilities near a match's midpoint and merges any
 * newly-approved ones into `venueOptions` that weren't there when the list
 * was first generated at match-creation time (registering/approving a ground
 * doesn't retroactively touch existing matches otherwise). If the option
 * list is already full, the lowest-ranked Places results are evicted to make
 * room, since registered facilities always take priority over Places ones.
 * No-ops once a venue has already been confirmed for the match.
 */
export async function syncRegisteredVenues(db: Firestore, uid: string, matchId: string): Promise<void> {
  const matchSnap = await db.doc(`matches/${matchId}`).get();
  if (!matchSnap.exists) throw new Error("not-found:Match not found.");

  const match = matchSnap.data() as {
    players: string[];
    sport: string;
    midpoint: GeoPoint;
    playerCoords?: Record<string, GeoPoint>;
    selectedVenueId: string | null;
    date: string;
    timeSlot: { start: Timestamp; end: Timestamp };
  };
  if (!match.players.includes(uid)) {
    throw new Error("permission-denied:Only matched players can refresh venues.");
  }
  if (match.selectedVenueId) return;

  const venuesRef = db.collection(`matches/${matchId}/venueOptions`);
  const existingSnap = await venuesRef.get();
  const existingIds = new Set(existingSnap.docs.map((d) => d.id));

  const registered = await findRegisteredFacilities(
    db,
    match.midpoint,
    match.sport,
    MAX_VENUE_OPTIONS,
    match.date,
    formatTime(match.timeSlot.start),
    formatTime(match.timeSlot.end)
  );
  const missing = registered.filter((facility) => !existingIds.has(facility.id));
  if (missing.length === 0) return;

  const playerCoords = match.playerCoords ?? {};
  const newDocs = missing.map((facility) => ({
    id: facility.id,
    data: {
      placeId: null,
      facilityId: facility.id,
      name: facility.name,
      address: facility.address,
      location: facility.location,
      photoRef: null,
      photoUrl: facility.photoUrl,
      rating: null,
      distanceFromMidpointKm: facility.distanceFromMidpointKm,
      distanceByPlayerKm: distanceByPlayerKm(facility.location, playerCoords),
      votes: {},
      voteCount: 0,
      source: "registered" as const,
    },
  }));

  const freeSlots = MAX_VENUE_OPTIONS - existingSnap.size;
  const batch = db.batch();
  let evictedCount = 0;

  if (newDocs.length > freeSlots) {
    const placesVenues = existingSnap.docs
      .filter((d) => (d.data() as VenueOptionDoc).source === "places")
      .map((d) => ({ ref: d.ref, distances: (d.data() as VenueOptionDoc).distanceByPlayerKm }))
      .sort((a, b) => fairnessScore(b.distances) - fairnessScore(a.distances)); // worst-ranked first

    evictedCount = Math.min(newDocs.length - freeSlots, placesVenues.length);
    for (let i = 0; i < evictedCount; i++) batch.delete(placesVenues[i].ref);
  }

  const toInsert = newDocs.slice(0, freeSlots + evictedCount);
  for (const { id, data } of toInsert) batch.set(venuesRef.doc(id), data);
  await batch.commit();
}

/** Toggles the caller's vote on a venue option. Only matched players may vote. */
export async function castVote(db: Firestore, uid: string, matchId: string, venueId: string): Promise<void> {
  const matchRef = db.doc(`matches/${matchId}`);
  const venueRef = db.doc(`matches/${matchId}/venueOptions/${venueId}`);

  await db.runTransaction(async (tx) => {
    const [matchSnap, venueSnap] = await Promise.all([tx.get(matchRef), tx.get(venueRef)]);
    if (!matchSnap.exists) throw new Error("not-found:Match not found.");
    if (!venueSnap.exists) throw new Error("not-found:Venue option not found.");

    const match = matchSnap.data() as { players: string[] };
    if (!match.players.includes(uid)) {
      throw new Error("permission-denied:Only matched players can vote on this venue.");
    }

    const venue = venueSnap.data() as { votes?: Record<string, boolean> };
    const votes = { ...(venue.votes ?? {}) };
    if (votes[uid]) delete votes[uid];
    else votes[uid] = true;

    tx.update(venueRef, { votes, voteCount: Object.keys(votes).length });
  });
}

/** Finalizes the venue for a match. Only matched players may confirm. */
export async function confirmVenue(db: Firestore, uid: string, matchId: string, venueId: string): Promise<void> {
  const matchRef = db.doc(`matches/${matchId}`);
  const venueRef = db.doc(`matches/${matchId}/venueOptions/${venueId}`);

  await db.runTransaction(async (tx) => {
    const [matchSnap, venueSnap] = await Promise.all([tx.get(matchRef), tx.get(venueRef)]);
    if (!matchSnap.exists) throw new Error("not-found:Match not found.");
    if (!venueSnap.exists) throw new Error("not-found:Venue option not found.");

    const match = matchSnap.data() as { players: string[] };
    if (!match.players.includes(uid)) {
      throw new Error("permission-denied:Only matched players can confirm a venue.");
    }

    tx.update(matchRef, { selectedVenueId: venueId, status: "venue_selected" });
  });
}
