import type { Config } from "@netlify/functions";
import { Timestamp } from "firebase-admin/firestore";
import { getDb } from "./_shared/firebaseAdmin";

/** Marks queue tickets that ran past their expiresAt as "expired" so the app can stop waiting on them. */
export default async (req: Request) => {
  const db = getDb();
  const now = Timestamp.now();

  const expiredSnap = await db
    .collection("matchQueue")
    .where("status", "in", ["waiting", "choosing"])
    .where("expiresAt", "<=", now)
    .limit(500)
    .get();

  if (expiredSnap.empty) return;

  const batch = db.batch();
  expiredSnap.docs.forEach((docSnap) => batch.update(docSnap.ref, { status: "expired" }));
  await batch.commit();

  console.log(`Expired ${expiredSnap.size} stale queue tickets.`);
};

export const config: Config = {
  schedule: "*/5 * * * *",
};
