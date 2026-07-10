import type { Config, Context } from "@netlify/functions";
import { getDb } from "./_shared/firebaseAdmin";
import { requireAuth, jsonResponse, AuthError } from "./_shared/auth";
import { rateBuddy, type BuddyRating } from "./_shared/ratings";
import { toHttpError } from "./_shared/errors";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const uid = await requireAuth(req);
    const { matchId, rating } = (await req.json()) as { matchId?: string; rating?: BuddyRating };
    if (!matchId || (rating !== "like" && rating !== "dislike")) {
      return jsonResponse({ error: "matchId and a valid rating ('like' or 'dislike') are required" }, 400);
    }

    await rateBuddy(getDb(), uid, matchId, rating);
    return jsonResponse({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return jsonResponse({ error: err.message }, 401);
    const { status, message } = toHttpError(err);
    return jsonResponse({ error: message }, status);
  }
};

export const config: Config = {
  path: "/api/rate-buddy",
};
