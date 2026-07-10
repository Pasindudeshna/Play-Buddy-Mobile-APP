import { createHash } from "node:crypto";

/**
 * PayHere Checkout integration helpers. Set once via the Netlify dashboard
 * (Site settings > Environment variables) — never commit these:
 *   PAYHERE_MERCHANT_ID
 *   PAYHERE_MERCHANT_SECRET
 * Sandbox values come from https://sandbox.payhere.lk (Settings > Domains &
 * Credentials on a sandbox merchant account). The merchant secret must never
 * reach the client — only the request hash it produces does.
 */

export const PAYHERE_CHECKOUT_URL = "https://sandbox.payhere.lk/pay/checkout";

function md5(input: string): string {
  return createHash("md5").update(input).digest("hex").toUpperCase();
}

/** "1000.00" style, no thousands separators — the exact format PayHere's hash spec requires. */
export function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

/** Request hash PayHere's checkout form must be signed with (docs: "Generating the Hash Value"). */
export function buildCheckoutHash(
  merchantId: string,
  merchantSecret: string,
  orderId: string,
  amount: number,
  currency: string
): string {
  const hashedSecret = md5(merchantSecret);
  return md5(`${merchantId}${orderId}${formatAmount(amount)}${currency}${hashedSecret}`);
}

/** Verifies the md5sig PayHere sends with its notify_url webhook, proving the payload wasn't forged. */
export function verifyNotifySignature(params: {
  merchantId: string;
  merchantSecret: string;
  orderId: string;
  payhereAmount: string;
  payhereCurrency: string;
  statusCode: string;
  md5sig: string;
}): boolean {
  const hashedSecret = md5(params.merchantSecret);
  const expected = md5(
    `${params.merchantId}${params.orderId}${params.payhereAmount}${params.payhereCurrency}${params.statusCode}${hashedSecret}`
  );
  return expected === params.md5sig.toUpperCase();
}
