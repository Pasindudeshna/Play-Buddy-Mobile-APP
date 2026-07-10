import type { Config, Context } from "@netlify/functions";
import { getDb } from "./_shared/firebaseAdmin";
import { requireAuth, jsonResponse, AuthError } from "./_shared/auth";
import { syncRegisteredVenues } from "./_shared/venues";
import { toHttpError } from "./_shared/errors";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const uid = await requireAuth(req);
    const { matchId } = (await req.json()) as { matchId?: string };
    if (!matchId) {
      return jsonResponse({ error: "matchId is required" }, 400);
    }

    await syncRegisteredVenues(getDb(), uid, matchId);
    return jsonResponse({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return jsonResponse({ error: err.message }, 401);
    const { status, message } = toHttpError(err);
    return jsonResponse({ error: message }, status);
  }
};

export const config: Config = {
  path: "/api/sync-venues",
};
