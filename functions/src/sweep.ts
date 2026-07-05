import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { attemptMatch } from "./matching";

/**
 * Safety net for the instant onCreate matcher: two tickets can end up both
 * "waiting" without either ever re-triggering the other (e.g. ticket A was
 * created outside ticket B's radius, so A's own run didn't find B — nothing
 * re-checks A once B later becomes reachable). This sweep periodically
 * retries every still-waiting ticket so matches aren't missed.
 */
export const sweepWaitingTickets = onSchedule("every 2 minutes", async () => {
  const db = getFirestore();
  const waitingSnap = await db
    .collection("matchQueue")
    .where("status", "==", "waiting")
    .limit(200)
    .get();

  let matchedCount = 0;
  for (const docSnap of waitingSnap.docs) {
    const matched = await attemptMatch(db, docSnap.id);
    if (matched) matchedCount += 1;
  }

  logger.info(`Sweep checked ${waitingSnap.size} waiting tickets, matched ${matchedCount}.`);
});
