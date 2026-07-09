import { auth } from "../firebaseConfig";

const MATCH_API_URL =
  process.env.EXPO_PUBLIC_MATCH_API_URL ?? "https://playbuddy-matchmaking-343.netlify.app";

/** Calls a matchmaking API endpoint with the caller's Firebase ID token. Throws with the server's error message on failure. */
export async function callMatchApi(path: string, body: unknown): Promise<void> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("You must be signed in.");

  const res = await fetch(`${MATCH_API_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Request failed (${res.status})`);
  }
}
