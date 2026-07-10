import type { Config, Context } from "@netlify/functions";
import { getDb } from "./_shared/firebaseAdmin";
import { requireAuth, jsonResponse, AuthError } from "./_shared/auth";
import { resolveCheckoutDetails } from "./_shared/payments";
import { buildCheckoutHash, formatAmount } from "./_shared/payhere";
import { toHttpError } from "./_shared/errors";

const SITE_URL = process.env.URL ?? "https://playbuddy-matchmaking-343.netlify.app";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const uid = await requireAuth(req);
    const { matchId } = (await req.json()) as { matchId?: string };
    if (!matchId) {
      return jsonResponse({ error: "matchId is required" }, 400);
    }

    const merchantId = process.env.PAYHERE_MERCHANT_ID;
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
    if (!merchantId || !merchantSecret) {
      console.error("PAYHERE_MERCHANT_ID / PAYHERE_MERCHANT_SECRET not configured");
      return jsonResponse({ error: "Payments aren't configured yet." }, 500);
    }

    const db = getDb();
    const { venueName, currency, amount } = await resolveCheckoutDetails(db, uid, matchId);

    const userSnap = await db.doc(`users/${uid}`).get();
    const u = userSnap.exists ? (userSnap.data() as any) : {};
    const [firstName, ...rest] = (u.fullName ?? "Player").trim().split(/\s+/);

    const orderId = matchId;
    const hash = buildCheckoutHash(merchantId, merchantSecret, orderId, amount, currency);

    return jsonResponse({
      checkoutUrl: "https://sandbox.payhere.lk/pay/checkout",
      fields: {
        merchant_id: merchantId,
        return_url: `${SITE_URL}/api/payhere-return`,
        cancel_url: `${SITE_URL}/api/payhere-cancel`,
        notify_url: `${SITE_URL}/api/payhere-notify`,
        order_id: orderId,
        items: `Ground booking — ${venueName}`,
        currency,
        amount: formatAmount(amount),
        first_name: firstName || "Player",
        last_name: rest.join(" ") || "-",
        email: u.email || "player@example.com",
        phone: u.phone || "0000000000",
        address: u.city || "Not specified",
        city: u.city || "Colombo",
        country: "Sri Lanka",
        custom_1: uid,
        hash,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) return jsonResponse({ error: err.message }, 401);
    const { status, message } = toHttpError(err);
    return jsonResponse({ error: message }, status);
  }
};

export const config: Config = {
  path: "/api/create-payhere-checkout",
};
