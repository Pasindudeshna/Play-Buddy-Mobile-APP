import type { Config, Context } from "@netlify/functions";
import { getDb } from "./_shared/firebaseAdmin";
import { requireAuth, jsonResponse, AuthError } from "./_shared/auth";
import { findFullSlots } from "./_shared/availability";
import { toHttpError } from "./_shared/errors";

type FacilityDoc = {
  status: string;
  openingTime?: string;
  closingTime?: string;
  slotDurationMinutes?: number;
  courtsCount?: number;
};

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    await requireAuth(req);
    const { facilityId, date } = (await req.json()) as { facilityId?: string; date?: string };
    if (!facilityId || !date) {
      return jsonResponse({ error: "facilityId and date are required" }, 400);
    }

    const db = getDb();
    const facilitySnap = await db.doc(`facilities/${facilityId}`).get();
    if (!facilitySnap.exists) throw new Error("not-found:Ground not found.");

    const facility = facilitySnap.data() as FacilityDoc;
    if (facility.status !== "approved") {
      throw new Error("failed-precondition:This ground isn't available for booking.");
    }
    if (!facility.openingTime || !facility.closingTime || !facility.slotDurationMinutes) {
      return jsonResponse({ fullSlots: [] });
    }

    const fullSlots = await findFullSlots(
      db,
      facilityId,
      date,
      facility.openingTime,
      facility.closingTime,
      facility.slotDurationMinutes,
      facility.courtsCount ?? 1
    );

    return jsonResponse({ fullSlots });
  } catch (err) {
    if (err instanceof AuthError) return jsonResponse({ error: err.message }, 401);
    const { status, message } = toHttpError(err);
    return jsonResponse({ error: message }, status);
  }
};

export const config: Config = {
  path: "/api/get-slot-availability",
};
