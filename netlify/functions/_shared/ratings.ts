import { Firestore } from "firebase-admin/firestore";

export type BuddyRating = "like" | "dislike";

type MatchDoc = {
  players: string[];
  ratings?: Record<string, BuddyRating>;
};

/**
 * Rates the caller's matched buddy (thumbs up/down), toggling their own
 * previous rating rather than stacking repeated taps. Runs with the Admin
 * SDK because `matches/{matchId}` only allows writes from Cloud
 * Functions/Netlify Functions (see firestore.rules) and a player can't
 * update another user's positiveReviews/negativeReviews counters directly.
 */
export async function rateBuddy(
  db: Firestore,
  uid: string,
  matchId: string,
  rating: BuddyRating
): Promise<void> {
  const matchRef = db.doc(`matches/${matchId}`);

  await db.runTransaction(async (tx) => {
    const matchSnap = await tx.get(matchRef);
    if (!matchSnap.exists) throw new Error("not-found:Match not found.");

    const match = matchSnap.data() as MatchDoc;
    if (!match.players.includes(uid)) {
      throw new Error("permission-denied:Only matched players can rate their buddy.");
    }

    const opponentUid = match.players.find((p) => p !== uid);
    if (!opponentUid) throw new Error("failed-precondition:No opponent to rate.");

    const ratings = { ...(match.ratings ?? {}) };
    const previous = ratings[uid];
    if (previous === rating) return; // Already rated this way — no-op.

    const opponentRef = db.doc(`users/${opponentUid}`);
    const opponentSnap = await tx.get(opponentRef);
    const opponent = opponentSnap.exists ? (opponentSnap.data() as any) : {};

    let positive = opponent.positiveReviews ?? 0;
    let negative = opponent.negativeReviews ?? 0;
    if (previous === "like") positive = Math.max(0, positive - 1);
    if (previous === "dislike") negative = Math.max(0, negative - 1);
    if (rating === "like") positive += 1;
    else negative += 1;

    ratings[uid] = rating;
    tx.update(matchRef, { ratings });
    tx.set(opponentRef, { positiveReviews: positive, negativeReviews: negative }, { merge: true });
  });
}
