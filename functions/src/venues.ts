import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions/v2";
import { GeoPoint, getFirestore } from "firebase-admin/firestore";

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

type PlacesNearbyResult = {
  place_id: string;
  name: string;
  vicinity?: string;
  rating?: number;
  geometry: { location: { lat: number; lng: number } };
  photos?: { photo_reference: string }[];
};

/**
 * Google Maps Platform touchpoint #1 (server-side): once two players are
 * matched, search real venues/grounds around the midpoint of their
 * locations via the Places API "Nearby Search" endpoint, and persist the
 * top results so the app never talks to Places directly (keeps the API key
 * off the client, and lets results be cached/reused across both players).
 */
export const onMatchCreated = onDocumentCreated(
  { document: "matches/{matchId}", secrets: [GOOGLE_MAPS_API_KEY] },
  async (event) => {
    if (!event.data) return;
    const match = event.data.data();
    const matchId = event.params.matchId;
    const db = getFirestore();

    const midpoint: GeoPoint = match.midpoint;
    const keyword = SPORT_KEYWORDS[match.sport] ?? match.sport;

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
    let json: PlacesNearbyResponse;
    try {
      const res = await fetch(url.toString());
      json = (await res.json()) as PlacesNearbyResponse;
    } catch (err) {
      logger.error("Places API request failed", err);
      return;
    }

    if (json.status !== "OK" && json.status !== "ZERO_RESULTS") {
      logger.error("Places API error", json.status, json.error_message);
      return;
    }

    const results = (json.results ?? []).slice(0, MAX_VENUE_OPTIONS);
    if (results.length === 0) {
      logger.warn(`No venues found near match ${matchId}`);
      return;
    }

    const batch = db.batch();
    for (const place of results) {
      const ref = db.collection(`matches/${matchId}/venueOptions`).doc(place.place_id);
      const distanceFromMidpointKm = haversineKm(
        midpoint.latitude,
        midpoint.longitude,
        place.geometry.location.lat,
        place.geometry.location.lng
      );

      batch.set(ref, {
        placeId: place.place_id,
        name: place.name,
        address: place.vicinity ?? null,
        location: new GeoPoint(place.geometry.location.lat, place.geometry.location.lng),
        photoRef: place.photos?.[0]?.photo_reference ?? null,
        rating: place.rating ?? null,
        distanceFromMidpointKm: Math.round(distanceFromMidpointKm * 10) / 10,
        votes: {},
        voteCount: 0,
      });
    }
    await batch.commit();
    logger.info(`Saved ${results.length} venue options for match ${matchId}`);
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
