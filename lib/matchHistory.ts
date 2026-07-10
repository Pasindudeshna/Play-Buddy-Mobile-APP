import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
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

/** Live list of every match the user has ever been part of, newest first, with opponent details resolved. */
export function subscribeToMatchHistory(
  uid: string,
  onChange: (matches: MatchHistoryEntry[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(
    collection(db, "matches"),
    where("players", "array-contains", uid),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
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
}
