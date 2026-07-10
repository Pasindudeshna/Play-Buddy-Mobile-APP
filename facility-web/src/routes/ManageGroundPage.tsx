import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import {
  DEFAULT_CURRENCY,
  DEFAULT_SLOT_DURATION_MINUTES,
  type Facility,
} from "../lib/facility";
import {
  setBookingPaymentStatus,
  subscribeToFacilityBookings,
  type Booking,
} from "../lib/booking";

const SLOT_DURATION_OPTIONS = [30, 60, 90, 120];

export default function ManageGroundPage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();

  const [facility, setFacility] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [pricePerHour, setPricePerHour] = useState("");
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [openingTime, setOpeningTime] = useState("06:00");
  const [closingTime, setClosingTime] = useState("22:00");
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(DEFAULT_SLOT_DURATION_MINUTES);
  const [savingPricing, setSavingPricing] = useState(false);
  const [pricingSaved, setPricingSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsError, setBookingsError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, "facilities", id)).then((snap) => {
      if (!snap.exists()) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const f = { id: snap.id, ...(snap.data() as Omit<Facility, "id">) };
      setFacility(f);
      setPricePerHour(f.pricePerHour != null ? String(f.pricePerHour) : "");
      setCurrency(f.currency ?? DEFAULT_CURRENCY);
      setOpeningTime(f.openingTime ?? "06:00");
      setClosingTime(f.closingTime ?? "22:00");
      setSlotDurationMinutes(f.slotDurationMinutes ?? DEFAULT_SLOT_DURATION_MINUTES);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    return subscribeToFacilityBookings(
      id,
      setBookings,
      (err) => setBookingsError(err.message)
    );
  }, [id]);

  const handleSavePricing = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setPricingSaved(false);

    const price = Number(pricePerHour);
    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a valid hourly price.");
      return;
    }
    if (openingTime >= closingTime) {
      setError("Closing time must be after opening time.");
      return;
    }

    setSavingPricing(true);
    try {
      await updateDoc(doc(db, "facilities", id), {
        pricePerHour: price,
        currency,
        openingTime,
        closingTime,
        slotDurationMinutes,
        updatedAt: serverTimestamp(),
      });
      setPricingSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save pricing.");
    } finally {
      setSavingPricing(false);
    }
  };

  const togglePaid = async (booking: Booking) => {
    await setBookingPaymentStatus(booking.id, booking.paymentStatus === "paid" ? "unpaid" : "paid");
  };

  if (loading) return <p className="empty-text">Loading…</p>;
  if (notFound || !facility) return <p className="error-text">Ground not found.</p>;
  if (facility.ownerId !== user?.uid) return <p className="error-text">Not your ground.</p>;

  const upcoming = bookings.filter((b) => b.status !== "cancelled");
  const totalOwed = upcoming
    .filter((b) => b.paymentStatus === "unpaid")
    .reduce((sum, b) => sum + b.totalAmount, 0);

  return (
    <div>
      <div className="page-header">
        <h2>{facility.name}</h2>
        <p>Manage pricing, booking hours, and bookings for this ground.</p>
      </div>

      <div className="card">
        <div className="card-title">Standard charge & booking hours</div>
        <form onSubmit={handleSavePricing} style={{ marginTop: 14 }}>
          <div className="field">
            <label>Price per hour</label>
            <div className="field-row">
              <input
                type="number"
                min="0"
                step="1"
                value={pricePerHour}
                onChange={(e) => setPricePerHour(e.target.value)}
                required
              />
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="LKR">LKR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>Booking hours</label>
            <div className="field-row">
              <input
                type="time"
                value={openingTime}
                onChange={(e) => setOpeningTime(e.target.value)}
                required
              />
              <input
                type="time"
                value={closingTime}
                onChange={(e) => setClosingTime(e.target.value)}
                required
              />
              <select
                value={slotDurationMinutes}
                onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
              >
                {SLOT_DURATION_OPTIONS.map((mins) => (
                  <option key={mins} value={mins}>
                    {mins} min slots
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error && <div className="error-text">{error}</div>}
          {pricingSaved && !error && <p className="meta">Saved.</p>}
          <button className="btn btn-sm" type="submit" disabled={savingPricing}>
            {savingPricing ? "Saving…" : "Save"}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="row">
          <span className="card-title">Bookings</span>
          {totalOwed > 0 && (
            <span className="badge badge-pending">
              {totalOwed} {facility.currency} unpaid
            </span>
          )}
        </div>

        {bookingsError ? (
          <p className="error-text">Couldn't load bookings: {bookingsError}</p>
        ) : upcoming.length === 0 ? (
          <p className="empty-text">No bookings yet for this ground.</p>
        ) : (
          <table className="bookings-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Player</th>
                <th>Amount</th>
                <th>Payment</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((b) => (
                <tr key={b.id}>
                  <td>{b.date}</td>
                  <td>
                    {b.startTime}–{b.endTime}
                  </td>
                  <td>
                    {b.userName}
                    {b.userPhone ? <div className="meta">{b.userPhone}</div> : null}
                    {b.matchId ? <div className="meta">via Find Buddy match</div> : null}
                  </td>
                  <td>
                    {b.totalAmount} {b.currency}
                  </td>
                  <td>
                    <span className={`badge ${b.paymentStatus === "paid" ? "badge-approved" : "badge-pending"}`}>
                      {b.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => togglePaid(b)}>
                      Mark {b.paymentStatus === "paid" ? "unpaid" : "paid"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Link className="btn btn-outline btn-sm" to="/dashboard">
        ← Back to My Grounds
      </Link>
    </div>
  );
}
