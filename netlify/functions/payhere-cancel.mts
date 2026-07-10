import type { Config, Context } from "@netlify/functions";

/** PayHere redirects here if the user cancels checkout. See payhere-return.mts for why this is just a safety-net page. */
export default async (req: Request, context: Context) => {
  return new Response(
    `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="font-family:sans-serif;text-align:center;padding:48px 20px;background:#080909;color:#eef7f4;">
      <p style="font-size:18px;">Payment cancelled — you can return to the Play Buddy app.</p>
    </body></html>`,
    { status: 200, headers: { "content-type": "text/html" } }
  );
};

export const config: Config = {
  path: "/api/payhere-cancel",
};
