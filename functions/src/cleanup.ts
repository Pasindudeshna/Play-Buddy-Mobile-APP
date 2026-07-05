import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { Timestamp, getFirestore } from "firebase-admin/firestore";

/** Marks queue tickets that ran past their expiresAt as "expired" so the app can stop waiting on them. */
export const cleanupExpiredTickets = onSchedule("every 5 minutes", async () => {
  const db = getFirestore();
  const now = Timestamp.now();

  const expiredSnap = await db
    .collection("matchQueue")
    .where("status", "==", "waiting")
    .where("expiresAt", "<=", now)
    .limit(500)
    .get();

  if (expiredSnap.empty) return;

  const batch = db.batch();
  expiredSnap.docs.forEach((docSnap) => batch.update(docSnap.ref, { status: "expired" }));
  await batch.commit();

  logger.info(`Expired ${expiredSnap.size} stale queue tickets.`);
});
