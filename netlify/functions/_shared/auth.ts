import { getAdminAuth } from "./firebaseAdmin";

export class AuthError extends Error {}

/** Verifies the "Authorization: Bearer <Firebase ID token>" header. Returns the caller's uid. */
export async function requireAuth(req: Request): Promise<string> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new AuthError("Missing Authorization header");

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    throw new AuthError("Invalid or expired token");
  }
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
