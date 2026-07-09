import type { Config, Context } from "@netlify/functions";
import { getDb } from "./_shared/firebaseAdmin";
import { requireAuth, jsonResponse, AuthError } from "./_shared/auth";
import { selectMatchCandidate } from "./_shared/matching";
import { toHttpError } from "./_shared/errors";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const uid = await requireAuth(req);
    const { ticketId, candidateTicketId } = (await req.json()) as {
      ticketId?: string;
      candidateTicketId?: string;
    };
    if (!ticketId || !candidateTicketId) {
      return jsonResponse({ error: "ticketId and candidateTicketId are required" }, 400);
    }

    await selectMatchCandidate(getDb(), uid, ticketId, candidateTicketId);
    return jsonResponse({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return jsonResponse({ error: err.message }, 401);
    const { status, message } = toHttpError(err);
    return jsonResponse({ error: message }, status);
  }
};

export const config: Config = {
  path: "/api/select-match-candidate",
};
