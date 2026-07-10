import type { Config, Context } from "@netlify/functions";

/**
 * PayHere redirects the checkout WebView here after a successful payment.
 * The app (components/Payment.tsx) intercepts this navigation client-side
 * before it loads, so this page is only ever seen as a brief flash — it's a
 * safety net for platforms/timings where interception doesn't fire in time.
 * Actual payment confirmation always comes from payhere-notify.mts, not this page.
 */
export default async (req: Request, context: Context) => {
  return new Response(
    `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="font-family:sans-serif;text-align:center;padding:48px 20px;background:#080909;color:#eef7f4;">
      <p style="font-size:18px;">Payment received — you can return to the Play Buddy app.</p>
    </body></html>`,
    { status: 200, headers: { "content-type": "text/html" } }
  );
};

export const config: Config = {
  path: "/api/payhere-return",
};
