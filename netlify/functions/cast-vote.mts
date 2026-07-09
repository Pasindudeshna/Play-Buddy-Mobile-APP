import type { Config, Context } from "@netlify/functions";
import { getDb } from "./_shared/firebaseAdmin";
import { requireAuth, jsonResponse, AuthError } from "./_shared/auth";
import { castVote } from "./_shared/venues";
import { toHttpError } from "./_shared/errors";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const uid = await requireAuth(req);
    const { matchId, venueId } = (await req.json()) as { matchId?: string; venueId?: string };
    if (!matchId || !venueId) {
      return jsonResponse({ error: "matchId and venueId are required" }, 400);
    }

    await castVote(getDb(), uid, matchId, venueId);
    return jsonResponse({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return jsonResponse({ error: err.message }, 401);
    const { status, message } = toHttpError(err);
    return jsonResponse({ error: message }, status);
  }
};

export const config: Config = {
  path: "/api/cast-vote",
};
