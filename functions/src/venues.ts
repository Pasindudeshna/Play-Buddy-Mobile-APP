import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions/v2";
import { Firestore, GeoPoint, getFirestore } from "firebase-admin/firestore";
import { geohashQueryBounds } from "geofire-common";

/**
 * Set once via:
 *   firebase functions:secrets:set GOOGLE_MAPS_API_KEY
 * Use a key restricted (by API + server IP/referrer) to Places API only —
 * see docs/MATCHING_SYSTEM_GUIDE.md §5 for why this must stay server-side.
 */
const GOOGLE_MAPS_API_KEY = defineSecret("GOOGLE_MAPS_API_KEY");

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

type Facility = {
  name: string;
  address: string;
  location: GeoPoint;
  sports: string[];
  status: "pending" | "approved" | "rejected";
  photoUrls?: string[];
};

type RegisteredVenue = {
  id: string;
  name: string;
  address: string;
  location: GeoPoint;
  photoUrl: string | null;
  distanceFromMidpointKm: number;
};

/** Distance from a venue location to each matched player, keyed by uid. */
function distanceByPlayerKm(
  venueLocation: { latitude: number; longitude: number },
  playerCoords: Record<string, GeoPoint>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [uid, coords] of Object.entries(playerCoords)) {
    result[uid] = Math.round(
      haversineKm(venueLocation.latitude, venueLocation.longitude, coords.latitude, coords.longitude) * 10
    ) / 10;
  }
  return result;
}

/** Fairness score: the larger of the two players' distances — minimizing this favors venues close to *both*, not just the midpoint. */
function fairnessScore(distances: Record<string, number>): number {
  return Math.max(...Object.values(distances));
}

/**
 * Finds admin-approved facilities offering `sport` within `SEARCH_RADIUS_METERS`
 * of `midpoint`, closest first. Same geohash-bounds-then-haversine-refine
 * pattern as matching.ts's findCandidateWithinRadius — geohash bounds
 * over-select a bounding box, so results are re-filtered with the exact
 * distance and only the true radius is kept.
 */
async function findRegisteredFacilities(
  db: Firestore,
  midpoint: GeoPoint,
  sport: string,
  maxResults: number
): Promise<RegisteredVenue[]> {
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
  const candidates: (RegisteredVenue & { _sort: number })[] = [];

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
      });
    }
  }

  candidates.sort((a, b) => a._sort - b._sort);
  return candidates.slice(0, maxResults).map(({ _sort, ...venue }) => venue);
}

type PlacesNearbyResult = {
  place_id: string;
  name: string;
  vicinity?: string;
  rating?: number;
  geometry: { location: { lat: number; lng: number } };
  photos?: { photo_reference: string }[];
};

type VenueOptionDoc = {
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
 * Once two players are matched, find venues/grounds around the midpoint of
 * their locations. Admin-approved facilities registered through facility-web
 * are preferred (they're real, vetted grounds); Google Maps Platform
 * touchpoint #1 (server-side) — the Places API "Nearby Search" endpoint —
 * only fills any remaining slots, keeping the API key off the client and
 * saving quota/cost once enough registered facilities are already found.
 * The final list is ranked by fairness — the venue's max distance to either
 * player — rather than raw distance to the arithmetic-average midpoint, so
 * the top option is genuinely convenient for both players, not just close
 * to a point that may sit much nearer one of them.
 */
export const onMatchCreated = onDocumentCreated(
  { document: "matches/{matchId}", secrets: [GOOGLE_MAPS_API_KEY] },
  async (event) => {
    if (!event.data) return;
    const match = event.data.data();
    const matchId = event.params.matchId;
    const db = getFirestore();

    const midpoint: GeoPoint = match.midpoint;
    const playerCoords: Record<string, GeoPoint> = match.playerCoords ?? {};
    const keyword = SPORT_KEYWORDS[match.sport] ?? match.sport;

    const registered = await findRegisteredFacilities(
      db,
      midpoint,
      match.sport,
      MAX_VENUE_OPTIONS
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
    if (remaining > 0) {
      const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
      url.searchParams.set("location", `${midpoint.latitude},${midpoint.longitude}`);
      url.searchParams.set("radius", String(SEARCH_RADIUS_METERS));
      url.searchParams.set("keyword", keyword);
      url.searchParams.set("key", GOOGLE_MAPS_API_KEY.value());

      type PlacesNearbyResponse = {
        status: string;
        error_message?: string;
        results?: PlacesNearbyResult[];
      };
      try {
        const res = await fetch(url.toString());
        const json = (await res.json()) as PlacesNearbyResponse;

        if (json.status !== "OK" && json.status !== "ZERO_RESULTS") {
          logger.error("Places API error", json.status, json.error_message);
        } else {
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
        }
      } catch (err) {
        logger.error("Places API request failed", err);
      }
    }

    venues.sort((a, b) => fairnessScore(a.distanceByPlayerKm) - fairnessScore(b.distanceByPlayerKm));

    const batch = db.batch();
    for (const { _id, ...venue } of venues.slice(0, MAX_VENUE_OPTIONS)) {
      batch.set(db.collection(`matches/${matchId}/venueOptions`).doc(_id), venue);
    }
    await batch.commit();

    logger.info(
      `Saved ${venues.length} venue options (fairness-ranked) for match ${matchId}`
    );
  }
);

/**
 * Callable function so vote-casting is enforced server-side: only the two
 * matched players may vote, and each can only toggle their own key in the
 * `votes` map (prevents a client from stuffing arbitrary vote counts).
 */
export const castVote = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "You must be signed in to vote.");
  }

  const { matchId, venueId } = (request.data ?? {}) as { matchId?: string; venueId?: string };
  if (!matchId || !venueId) {
    throw new HttpsError("invalid-argument", "matchId and venueId are required.");
  }

  const db = getFirestore();
  const matchRef = db.doc(`matches/${matchId}`);
  const venueRef = db.doc(`matches/${matchId}/venueOptions/${venueId}`);

  await db.runTransaction(async (tx) => {
    const [matchSnap, venueSnap] = await Promise.all([tx.get(matchRef), tx.get(venueRef)]);

    if (!matchSnap.exists) throw new HttpsError("not-found", "Match not found.");
    if (!venueSnap.exists) throw new HttpsError("not-found", "Venue option not found.");

    const match = matchSnap.data() as { players: string[] };
    if (!match.players.includes(uid)) {
      throw new HttpsError("permission-denied", "Only matched players can vote on this venue.");
    }

    const venue = venueSnap.data() as { votes?: Record<string, boolean> };
    const votes = { ...(venue.votes ?? {}) };

    if (votes[uid]) {
      delete votes[uid];
    } else {
      votes[uid] = true;
    }

    tx.update(venueRef, { votes, voteCount: Object.keys(votes).length });
  });

  return { ok: true };
});

/** Callable so either matched player can finalize the venue for both — enforced server-side. */
export const confirmVenue = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "You must be signed in to confirm a venue.");
  }

  const { matchId, venueId } = (request.data ?? {}) as { matchId?: string; venueId?: string };
  if (!matchId || !venueId) {
    throw new HttpsError("invalid-argument", "matchId and venueId are required.");
  }

  const db = getFirestore();
  const matchRef = db.doc(`matches/${matchId}`);
  const venueRef = db.doc(`matches/${matchId}/venueOptions/${venueId}`);

  await db.runTransaction(async (tx) => {
    const [matchSnap, venueSnap] = await Promise.all([tx.get(matchRef), tx.get(venueRef)]);

    if (!matchSnap.exists) throw new HttpsError("not-found", "Match not found.");
    if (!venueSnap.exists) throw new HttpsError("not-found", "Venue option not found.");

    const match = matchSnap.data() as { players: string[] };
    if (!match.players.includes(uid)) {
      throw new HttpsError("permission-denied", "Only matched players can confirm a venue.");
    }

    tx.update(matchRef, { selectedVenueId: venueId, status: "venue_selected" });
  });

  return { ok: true };
});
