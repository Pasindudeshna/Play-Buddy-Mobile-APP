# Play Buddy — Matchmaking System Implementation Guide

## 0. Where the project stands today

Everything currently under `app/(tabs)/FindBuddy.tsx`, `components/MatchFound.tsx`, `components/Venues.tsx`, and `components/Chat.tsx` is **UI wired to hardcoded mock data**. There is no queue, no matching logic, no geolocation, and no Google Maps usage anywhere in the repo yet:

- `firebaseConfig.js` only initializes `auth` and `firestore` (client SDK). No Cloud Functions, no `firebase.json`, no `functions/` folder.
- Signup (`SignupPersonal.tsx`) stores `city` as a free-text string on the user doc — not a coordinate.
- `FindBuddy.tsx` lets the user pick a location from a hardcoded string list (`Colombo 1`, `Nugegoda`, …) and a radius slider, but pressing "Find" just flips local state to show `<MatchFound />` with a hardcoded `MATCH` object.
- `Venues.tsx` renders two hardcoded venues with client-only vote counters (lost on refresh).
- `Chat.tsx` is a local-only message list — nothing is sent anywhere.

So this guide covers building the real thing on top of this UI: geolocation capture → queueing → radius-expanding match → venue discovery via Google Places → persisting votes/chat to Firestore.

---

## 1. High-level architecture

```
[FindBuddy.tsx]
     │ user picks sport + date + time-slot + (radius optional, now auto-expanded)
     ▼
Write a "queue ticket" doc to Firestore  (matchQueue/{ticketId})
     │
     ▼
Cloud Function trigger (onCreate of matchQueue/{ticketId})
     │  1. Look for another WAITING ticket: same sport, overlapping time slot,
     │     within 1km → 2km → … → 10km (expanding ring search via geohash)
     │  2. If found → run a Firestore transaction that atomically marks both
     │     tickets MATCHED and creates matches/{matchId}
     │  3. If not found → leave ticket as WAITING (a later ticket's function
     │     run, or a scheduled sweep, will find this one)
     ▼
Client listens (onSnapshot) on its own matchQueue ticket doc
     │ status flips WAITING → MATCHED
     ▼
[MatchFound.tsx] renders the real matched user + reads matches/{matchId}
     │
     ▼
Cloud Function (onCreate of matches/{matchId}) calls Google Places API
centered on the midpoint of both players' coordinates → writes
matches/{matchId}/venueOptions/*
     ▼
[Venues.tsx] reads venueOptions from Firestore, votes write to Firestore
     ▼
[Chat.tsx] reads/writes matches/{matchId}/messages (realtime)
```

Why matching runs in a **Cloud Function**, not on the client: two clients' phones must never both decide "I get to match with X" at the same time (race condition → double-booking). A Firestore **transaction inside a Cloud Function** is the standard, safe way to do this. It also lets you match users even if the other person's app is in the background.

---

## 2. Firestore data model changes

### 2.1 `users/{uid}` — add real coordinates

```ts
{
  fullName: string,
  email: string,
  city: string,                 // already exists (display only)
  location: GeoPoint,           // NEW — from device GPS or geocoded city
  geohash: string,              // NEW — geohash of `location`, for range queries
  sportsPreferences: string[],  // already exists
  ...
}
```

`geohash` is required because Firestore can't do a native "within N km" query — geohashing + range queries on the hash string is the standard workaround (see §4).

### 2.2 `matchQueue/{ticketId}` — NEW collection (the "queue")

```ts
{
  ticketId: string,
  userId: string,
  sport: string,                // "badminton"
  date: string,                 // "2026-07-10"
  timeSlot: { start: Timestamp, end: Timestamp }, // normalize the UI's "06:00" chip into a real range
  playersNeeded: number,        // from the "01/02/03/04" chip — keep for future >2 support
  location: GeoPoint,
  geohash: string,
  searchRadiusKm: number,       // starts at 1, the Cloud Function bumps this each sweep
  status: "waiting" | "matched" | "cancelled" | "expired",
  matchId: string | null,
  createdAt: Timestamp,
  expiresAt: Timestamp          // e.g. createdAt + 30min, so stale tickets self-clean
}
```

### 2.3 `matches/{matchId}` — NEW collection

```ts
{
  matchId: string,
  sport: string,
  date: string,
  timeSlot: { start: Timestamp, end: Timestamp },
  players: [uid1, uid2],
  midpoint: GeoPoint,            // used as the center for the Places search
  status: "pending_venue" | "venue_selected" | "completed" | "cancelled",
  selectedVenueId: string | null,
  createdAt: Timestamp
}
```

### 2.4 `matches/{matchId}/venueOptions/{venueId}` — subcollection

```ts
{
  placeId: string,        // Google Place ID
  name: string,
  address: string,
  location: GeoPoint,
  photoRef: string | null,
  rating: number | null,
  distanceFromMidpointKm: number,
  votes: { [uid: string]: boolean },  // map, not counter — prevents double-voting & shows who voted
  voteCount: number
}
```

### 2.5 `matches/{matchId}/messages/{messageId}` — subcollection

```ts
{
  senderId: string,
  text: string,
  createdAt: Timestamp
}
```

---

## 3. Step-by-step build order

### Step 1 — Capture real coordinates (replace the fake location dropdown)

Package: `expo-location`.

- On `FindBuddy.tsx`, when the screen loads (or when the user taps "Use my location"), call `Location.requestForegroundPermissionsAsync()` then `Location.getCurrentPositionAsync()`.
- Also **geocode** the free-text city fallback (for users who deny GPS, or during `SignupPersonal.tsx`'s "City / Area" field) using the **Google Geocoding API** — this is the first Google Maps API touchpoint (see §5.1).
- Store `{ latitude, longitude }` as a Firestore `GeoPoint`, and compute its geohash client-side (or in a Cloud Function via a Firestore `onWrite` trigger on `users/{uid}`) using `geofire-common`.
- Update `users/{uid}.location` and `.geohash` at signup and every time `FindBuddy` runs a search (in case the user moved).

### Step 2 — Normalize sport + time-slot + submit to the queue

- `FindBuddy.tsx`'s `TIME_SLOTS` are just label strings today (`"06:00"`) with no date math. Convert the selected `dateText` + time chip into a real `{start, end}` Timestamp pair (e.g. a 60–90 min window) before writing.
- Replace the `onPress={() => { if (canSearch) setShowMatchFound(true); }}` handler: instead of immediately showing `MatchFound`, it should:
  1. Write a new `matchQueue` doc with `status: "waiting"`, `searchRadiusKm: 1`.
  2. Show a "Searching for a buddy…" state (spinner) instead of jumping straight to `MatchFound`.
  3. Attach an `onSnapshot` listener to that ticket doc.
  4. When `status` flips to `"matched"`, navigate to `MatchFound` passing the real `matchId`.
  5. Give the user a "Cancel search" button that sets `status: "cancelled"` and deletes/ignores the ticket.

### Step 3 — The matching Cloud Function (the core algorithm)

Create a `functions/` directory (Firebase Functions, Node/TypeScript) — this is new infra for this repo, so also add `firebase.json` + `firebase deploy --only functions` to the toolchain.

Trigger: `onDocumentCreated("matchQueue/{ticketId}")` (Firestore v2 trigger).

**Algorithm (expanding-radius, oldest-first):**

```
function tryMatch(newTicket):
  for radiusKm in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]:
    candidates = queryCandidates(newTicket, radiusKm)
      // same sport, status == "waiting", overlapping timeSlot,
      // geohash within bounding boxes for radiusKm (geofire-common `geohashQueryBounds`),
      // then filter candidates by exact haversine distance <= radiusKm (geohash bounds are approximate)
      // exclude newTicket.userId itself
      // sort by createdAt ascending (oldest waiting player gets priority)

    if candidates is not empty:
      other = candidates[0]
      runTransaction:
        re-read both tickets
        if both still "waiting":
          create matches/{matchId} with both userIds + midpoint
          set both tickets: status="matched", matchId=matchId
        else:
          abort transaction (someone else grabbed one of them — retry loop naturally
          handled because the OTHER ticket's own onCreate/сsweep run will re-search)
      return  // stop expanding, we matched

  // no candidates at 10km either — leave ticket as "waiting" at searchRadiusKm=10
  update newTicket.searchRadiusKm = 10
```

Key implementation details:
- **Use `geofire-common`** (`npm i geofire-common`) for `geohashQueryBounds(center, radiusInM)` → gives you the set of Firestore range queries (`where('geohash', '>=', b[0]).where('geohash', '<=', b[1])`) needed to approximate a circular radius search on a single geohash field. Always post-filter with the real haversine `distanceBetween()` since geohash boxes over-select at the edges.
- **Overlapping time slot** query: store `timeSlot.start`/`timeSlot.end` and filter `start < newTicket.end && end > newTicket.start` (Firestore composite index needed, or do this filter in-memory after the geo query since result sets are small).
- **Why re-trigger on every new ticket instead of a polling loop**: it's cheap (one Cloud Function invocation per search request) and gives near-instant matches. Add a **scheduled function every 1–2 minutes** as a safety net to re-scan long-waiting tickets (in case the "other side" of a match never got a fresh `onCreate` to trigger against them, e.g. two people search 3km apart but neither triggers the other because both entered the queue before either was within radius — the periodic sweep re-runs `tryMatch` for all `status:"waiting"` tickets and expands their radius over time).
- **Composite indexes**: Firestore will need composite indexes on `(sport, status, geohash)` and similar — the Firebase console will give you the exact index-creation links the first time you run a query that needs one; commit `firestore.indexes.json` once generated.

### Step 4 — Venue discovery via Google Places (after a match is created)

Trigger: `onDocumentCreated("matches/{matchId}")`.

1. Compute the midpoint of the two players' `GeoPoint`s (simple lat/lng average is fine for city-scale distances).
2. Call the **Google Places API — Nearby Search** (or the newer Places API "Search Nearby" v1) centered on that midpoint, `radius` ~3000–5000m, filtered by type/keyword mapped from `sport` (e.g. `badminton` → keyword `"badminton court"`, `type: "stadium"` or a custom keyword search since Places doesn't have a dedicated "badminton court" type).
3. Write the top 5–10 results into `matches/{matchId}/venueOptions/*` (name, address, location, `place_id`, photo reference, rating).
4. This must run **server-side** (Cloud Function), not from the phone — it keeps your Google Maps API key off the client and lets you cache/reuse results.

### Step 5 — Wire `Venues.tsx` to real data

- Replace the hardcoded `VENUES` array with an `onSnapshot` on `matches/{matchId}/venueOptions`.
- `handleVote` currently does `setVotes(local state)` — change it to a Firestore transaction: toggle `venueOptions/{venueId}.votes[currentUser.uid]` and recompute `voteCount`, so votes persist and can't be duplicated by the same user re-tapping.
- Add a "Confirm Venue" action once both players have voted (or after a timer) that sets `matches/{matchId}.selectedVenueId` and `status: "venue_selected"`.
- Each venue card should **link out to Google Maps** for directions: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${place_id}` opened via `Linking.openURL` — no extra API needed for this part.

### Step 6 — Wire `MatchFound.tsx` to real data

- Replace the hardcoded `MATCH` object with a read of `matches/{matchId}` plus a `users/{otherUid}` lookup for the opponent's profile card (name, tier, games, reviews).
- "Chat First" and "Vote for Venue" buttons already `router.push("/chat")` / `router.push("/venues")` — just make sure `matchId` is passed through route params (or kept in a small context/store) so those screens know which match to load.

### Step 7 — Wire `Chat.tsx` to Firestore

- Replace local `messages` state with `onSnapshot(collection(db, "matches", matchId, "messages"), orderBy("createdAt"))`.
- `handleSend` writes a new doc to that subcollection instead of just `setMessages`.
- (Optional, later) push notifications via `expo-notifications` + FCM when the other player sends a message while the app is backgrounded.

### Step 8 — Firestore security rules

Add rules so:
- A user can only create a `matchQueue` ticket with `userId == request.auth.uid`.
- A user can only read/write `matches/{matchId}` docs where `request.auth.uid in resource.data.players`.
- Venue votes: a user can only write their own key in the `votes` map.
- All matching/venue-search **writes that decide match outcomes** should happen only via Cloud Functions (Admin SDK bypasses rules), so client rules for `matchQueue.status` and `matches/*` creation can be locked to **read-only** for clients and **write-only via functions**.

### Step 9 — Cleanup / expiry

- Add a scheduled Cloud Function (e.g. every 5 min) that sets `status: "expired"` on `matchQueue` tickets past `expiresAt`, and lets the client show "No buddy found nearby, try widening later" instead of hanging forever.
- Delete/cancel tickets when the user backgrounds the app for too long or explicitly cancels.

---

## 4. Distance / geohashing reference (used in Step 3)

```ts
import { geohashForLocation, geohashQueryBounds, distanceBetween } from "geofire-common";

// Storing:
const hash = geohashForLocation([lat, lng]);

// Querying within radiusKm of [lat, lng]:
const bounds = geohashQueryBounds([lat, lng], radiusKm * 1000);
const queries = bounds.map(([start, end]) =>
  query(collection(db, "matchQueue"),
    where("sport", "==", sport),
    where("status", "==", "waiting"),
    orderBy("geohash"),
    startAt(start), endAt(end))
);
// run all queries, merge results, then filter:
const matches = results.filter(doc => {
  const d = distanceBetween([doc.location.latitude, doc.location.longitude], [lat, lng]); // km
  return d <= radiusKm;
});
```

---

## 5. Where Google Maps Platform APIs plug in (and which ones you need)

You'll need a **Google Cloud project with billing enabled** and a Maps Platform API key (or two: a server-restricted key for Cloud Functions, and a mobile-app-restricted key — by Android package name / iOS bundle ID — for the client SDK). Enable these APIs:

| API | Used where | Why |
|---|---|---|
| **Geocoding API** | Client (`FindBuddy.tsx`, `SignupPersonal.tsx`) or a Cloud Function | Convert a typed city/address (e.g. "Nugegoda") into `{lat, lng}` when the user doesn't grant GPS permission. |
| **Places API (Nearby Search / Search Nearby)** | Cloud Function, triggered `onDocumentCreated("matches/{matchId}")` | Find real grounds/venues (badminton courts, sports complexes) around the matched pair's midpoint — replaces the hardcoded `VENUES` array in `Venues.tsx`. |
| **Places Details / Photos API** | Same Cloud Function | Get full address, phone number, opening hours, and a real photo for each venue card (currently `picsum.photos` placeholders). |
| **Maps SDK for Android / iOS** (via `react-native-maps`) | Client — a new "pick your location on a map" screen/modal in `FindBuddy.tsx`, and a small embedded map on `Venues.tsx` / `MatchFound.tsx` showing the venue pin | Let users visually confirm/adjust their location instead of a static city dropdown, and visually confirm the venue location before voting. |
| **Directions API** *(optional)* | Client, when the user taps a venue card | Show ETA/route preview inline instead of just deep-linking to the Google Maps app. Skippable — deep-linking to `google.com/maps/dir` (Step 5) needs no API key or quota. |
| **Distance Matrix API** *(optional, nice-to-have)* | Cloud Function | Instead of the naive lat/lng-average midpoint, compute a midpoint that minimizes combined *travel* time rather than straight-line distance. Only worth it later — straight-line midpoint is fine for v1. |

**Packages to install:**
```
npx expo install expo-location react-native-maps
npm install geofire-common
# Cloud Functions side (in functions/):
npm install firebase-admin firebase-functions geofire-common node-fetch
```

**Security note:** never call Places/Geocoding directly from the phone with an unrestricted key — restrict the mobile key to Maps SDK usage only (map rendering), and keep Geocoding/Places calls server-side in Cloud Functions using a separate, server-IP-restricted key, so your Places quota/billing can't be scraped out of the compiled app.

---

## 6. Suggested build order (checklist)

1. [ ] Add `expo-location`, capture + store `GeoPoint`/`geohash` on `users/{uid}` and at search time.
2. [ ] Stand up `functions/` (Firebase Functions v2, TypeScript), `firebase.json`, deploy a no-op function to confirm the pipeline works.
3. [ ] Build `matchQueue` writes from `FindBuddy.tsx` (replace the instant `setShowMatchFound(true)`).
4. [ ] Implement the expanding-radius matching Cloud Function + composite indexes.
5. [ ] Add the "searching…" UI state + `onSnapshot` listener that redirects to `MatchFound` on match.
6. [ ] Wire `MatchFound.tsx` to read `matches/{matchId}` + opponent's `users/{uid}`.
7. [ ] Get a Google Maps Platform key, enable Geocoding + Places APIs, add the venue-search Cloud Function.
8. [ ] Wire `Venues.tsx` to `venueOptions` subcollection + transactional voting.
9. [ ] Wire `Chat.tsx` to the `messages` subcollection.
10. [ ] Add `react-native-maps` for a visual location picker and venue map preview.
11. [ ] Write Firestore security rules; lock down match-deciding writes to Cloud Functions only.
12. [ ] Add scheduled cleanup function for expired queue tickets.
13. [ ] (Optional) Push notifications for match-found and new chat messages via `expo-notifications`.
