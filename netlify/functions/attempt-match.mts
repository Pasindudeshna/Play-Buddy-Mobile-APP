import type { Config, Context } from "@netlify/functions";
import { getDb } from "./_shared/firebaseAdmin";
import { requireAuth, jsonResponse, AuthError } from "./_shared/auth";
import { attemptMatch } from "./_shared/matching";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const uid = await requireAuth(req);
    const { ticketId } = (await req.json()) as { ticketId?: string };
    if (!ticketId) return jsonResponse({ error: "ticketId is required" }, 400);

    const db = getDb();
    const ticketSnap = await db.doc(`matchQueue/${ticketId}`).get();
    if (!ticketSnap.exists || ticketSnap.data()?.userId !== uid) {
      return jsonResponse({ error: "Ticket not found" }, 404);
    }

    await attemptMatch(db, ticketId);
    return jsonResponse({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return jsonResponse({ error: err.message }, 401);
    console.error(err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
};

export const config: Config = {
  path: "/api/attempt-match",
};
