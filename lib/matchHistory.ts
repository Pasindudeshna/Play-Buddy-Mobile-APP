import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

export type MatchHistoryEntry = {
  id: string;
  sport: string;
  date: string;
  timeSlot: { start: Timestamp; end: Timestamp };
  status: string;
  opponentUid: string | null;
  opponentName: string;
  opponentPhotoURL: string | null;
};

/**
 * Live list of every match the user has ever been part of, newest first,
 * with opponent details resolved. Re-derives the query whenever the user's
 * `matchHistoryClearedAt` changes so clearMatchHistory() takes effect
 * immediately without the caller needing to re-subscribe.
 */
export function subscribeToMatchHistory(
  uid: string,
  onChange: (matches: MatchHistoryEntry[]) => void,
  onError?: (error: Error) => void
) {
  let unsubMatches: (() => void) | null = null;

  const unsubUser = onSnapshot(
    doc(db, "users", uid),
    (userSnap) => {
      unsubMatches?.();

      const clearedAt = userSnap.exists()
        ? ((userSnap.data() as any).matchHistoryClearedAt as Timestamp | undefined)
        : undefined;

      const constraints = [where("players", "array-contains", uid)];
      if (clearedAt) constraints.push(where("createdAt", ">", clearedAt));

      const q = query(collection(db, "matches"), ...constraints, orderBy("createdAt", "desc"));

      unsubMatches = onSnapshot(
        q,
        async (snap) => {
          const entries = await Promise.all(
            snap.docs.map(async (d) => {
              const data = d.data() as any;
              const opponentUid: string | null =
                (data.players as string[]).find((p) => p !== uid) ?? null;

              let opponentName = "Player";
              let opponentPhotoURL: string | null = null;
              if (opponentUid) {
                try {
                  const userSnap = await getDoc(doc(db, "users", opponentUid));
                  if (userSnap.exists()) {
                    const u = userSnap.data() as any;
                    opponentName = u.fullName ?? "Player";
                    opponentPhotoURL = u.photoURL ?? null;
                  }
                } catch {
                  // Keep the default name if the opponent's profile can't be read.
                }
              }

              return {
                id: d.id,
                sport: data.sport,
                date: data.date,
                timeSlot: data.timeSlot,
                status: data.status,
                opponentUid,
                opponentName,
                opponentPhotoURL,
              };
            })
          );
          onChange(entries);
        },
        (err) => onError?.(err)
      );
    },
    (err) => onError?.(err)
  );

  return () => {
    unsubUser();
    unsubMatches?.();
  };
}

/**
 * Clears the caller's match history list. This only hides past matches from
 * *this* user's view (stamps users/{uid}.matchHistoryClearedAt) — it doesn't
 * delete the underlying match docs, which the other player, chat, and any
 * associated booking still need.
 */
export async function clearMatchHistory(uid: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), { matchHistoryClearedAt: serverTimestamp() });
}
