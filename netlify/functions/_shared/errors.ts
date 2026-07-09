const STATUS_BY_CODE: Record<string, number> = {
  "not-found": 404,
  "permission-denied": 403,
  "invalid-argument": 400,
  "failed-precondition": 412,
  unauthenticated: 401,
};

/** Parses a `"code:message"` Error thrown by the shared matching/venues helpers into an HTTP status + message. */
export function toHttpError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  const [maybeCode, ...rest] = raw.split(":");
  if (rest.length > 0 && maybeCode in STATUS_BY_CODE) {
    return { status: STATUS_BY_CODE[maybeCode], message: rest.join(":").trim() };
  }
  console.error(err);
  return { status: 500, message: "Internal error" };
}
