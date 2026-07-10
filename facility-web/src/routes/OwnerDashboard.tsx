import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import type { Facility } from "../lib/facility";
import StatusBadge from "../components/StatusBadge";

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "facilities"),
      where("ownerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(
      q,
      (snap) => {
        setFacilities(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Facility, "id">) })));
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load facilities:", err);
        setError(err.message);
        setLoading(false);
      }
    );
  }, [user]);

  return (
    <div>
      <div className="row page-header">
        <div>
          <h2>My Grounds</h2>
          <p>Manage the grounds you've listed on Play Buddy.</p>
        </div>
        <Link className="btn" to="/dashboard/new">
          + Register a ground
        </Link>
      </div>

      {error ? (
        <p className="error-text">Couldn't load your grounds: {error}</p>
      ) : loading ? (
        <p className="empty-text">Loading…</p>
      ) : facilities.length === 0 ? (
        <p className="empty-text">
          You haven't registered any grounds yet. Once approved, your ground can be suggested
          to matched players in the Play Buddy app.
        </p>
      ) : (
        facilities.map((f) => (
          <div className="card" key={f.id}>
            <div className="row">
              <span className="card-title">{f.name}</span>
              <StatusBadge status={f.status} />
            </div>
            {f.photoUrls.length > 0 && (
              <div className="photo-strip">
                {f.photoUrls.map((url) => (
                  <img key={url} src={url} alt={f.name} />
                ))}
              </div>
            )}
            <p className="meta">{f.address}</p>
            <p className="meta">{f.sports.join(", ")}</p>
            {f.status === "rejected" && f.rejectionReason && (
              <p className="error-text">Reason: {f.rejectionReason}</p>
            )}
            <div className="divider" />
            <div className="row" style={{ justifyContent: "flex-start", gap: 10 }}>
              {f.status === "approved" ? (
                <Link className="btn btn-sm" to={`/dashboard/manage/${f.id}`}>
                  Manage slots & bookings
                </Link>
              ) : (
                <Link className="btn btn-outline btn-sm" to={`/dashboard/edit/${f.id}`}>
                  Edit
                </Link>
              )}
              <a
                className="btn btn-outline btn-sm"
                href={`https://www.google.com/maps/search/?api=1&query=${f.location.latitude},${f.location.longitude}`}
                target="_blank"
                rel="noreferrer"
              >
                Open in Maps ↗
              </a>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
