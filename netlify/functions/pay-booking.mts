import type { Config, Context } from "@netlify/functions";
import { getDb } from "./_shared/firebaseAdmin";
import { requireAuth, jsonResponse, AuthError } from "./_shared/auth";
import { payForMatchBooking } from "./_shared/payments";
import { toHttpError } from "./_shared/errors";

/**
 * Simulated checkout — marks a match's ground booking paid directly, no
 * external gateway. Real PayHere sandbox checkout (create-payhere-checkout.mts
 * / payhere-notify.mts) is built and working, but PayHere requires a fully
 * owned domain to be registered (not a shared *.netlify.app subdomain) before
 * it will authorize a checkout request, and getting one isn't an option right
 * now — see components/Payment.tsx. This endpoint fills in for it in the
 * meantime using the same payForMatchBooking() write path the PayHere webhook
 * would otherwise trigger, so switching back later is just swapping which
 * endpoint Payment.tsx calls.
 */
export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const uid = await requireAuth(req);
    const { matchId } = (await req.json()) as { matchId?: string };
    if (!matchId) {
      return jsonResponse({ error: "matchId is required" }, 400);
    }

    await payForMatchBooking(getDb(), uid, matchId);
    return jsonResponse({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return jsonResponse({ error: err.message }, 401);
    const { status, message } = toHttpError(err);
    return jsonResponse({ error: message }, status);
  }
};

export const config: Config = {
  path: "/api/pay-booking",
};
