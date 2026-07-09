import type { Config } from "@netlify/functions";
import { getDb } from "./_shared/firebaseAdmin";
import { attemptMatch } from "./_shared/matching";

/**
 * Safety net for the client-triggered instant matcher: two tickets can end
 * up both "waiting" without either ever re-checking the other (e.g. ticket A
 * was created outside ticket B's radius, so A's own attempt didn't find B —
 * nothing re-checks A once B later becomes reachable). This sweep
 * periodically retries every still-waiting or still-choosing ticket so
 * matches aren't missed and "choosing" candidate lists self-heal.
 */
export default async (req: Request) => {
  const db = getDb();
  const snap = await db
    .collection("matchQueue")
    .where("status", "in", ["waiting", "choosing"])
    .limit(200)
    .get();

  let matchedCount = 0;
  for (const docSnap of snap.docs) {
    const matched = await attemptMatch(db, docSnap.id);
    if (matched) matchedCount += 1;
  }

  console.log(`Sweep checked ${snap.size} tickets, matched ${matchedCount}.`);
};

export const config: Config = {
  schedule: "*/2 * * * *",
};
