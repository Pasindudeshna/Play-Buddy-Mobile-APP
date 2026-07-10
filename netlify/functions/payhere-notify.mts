import type { Config, Context } from "@netlify/functions";
import { getDb } from "./_shared/firebaseAdmin";
import { verifyNotifySignature } from "./_shared/payhere";
import { payForMatchBooking } from "./_shared/payments";

/**
 * PayHere's server-to-server payment confirmation (docs: "Notify URL").
 * This — not the browser redirect to return_url — is the only trustworthy
 * signal that a payment actually succeeded, since a client can navigate to
 * return_url without ever paying. No Firebase auth here (PayHere calls this
 * directly); trust instead comes from verifying md5sig against the merchant
 * secret. Must always respond 200, or PayHere will keep retrying.
 */
export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const form = await req.formData();
    const merchantId = String(form.get("merchant_id") ?? "");
    const orderId = String(form.get("order_id") ?? "");
    const payhereAmount = String(form.get("payhere_amount") ?? "");
    const payhereCurrency = String(form.get("payhere_currency") ?? "");
    const statusCode = String(form.get("status_code") ?? "");
    const md5sig = String(form.get("md5sig") ?? "");
    const custom1 = String(form.get("custom_1") ?? "");

    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
    if (!merchantSecret || !merchantId || !orderId || !md5sig) {
      console.error("payhere-notify: missing config or fields");
      return new Response("OK", { status: 200 });
    }

    const valid = verifyNotifySignature({
      merchantId,
      merchantSecret,
      orderId,
      payhereAmount,
      payhereCurrency,
      statusCode,
      md5sig,
    });

    if (!valid) {
      console.error(`payhere-notify: invalid signature for order ${orderId}`);
      return new Response("OK", { status: 200 });
    }

    // status_code "2" = success (see PayHere's Notify URL status code table).
    if (statusCode === "2" && custom1) {
      await payForMatchBooking(getDb(), custom1, orderId);
    } else {
      console.log(`payhere-notify: order ${orderId} status_code=${statusCode}, not marking paid`);
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("payhere-notify error", err);
    // Still 200 — PayHere retries on non-2xx, and a processing error here
    // shouldn't cause it to hammer the endpoint indefinitely.
    return new Response("OK", { status: 200 });
  }
};

export const config: Config = {
  path: "/api/payhere-notify",
};
