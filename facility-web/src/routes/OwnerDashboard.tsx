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

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "facilities"),
      where("ownerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      setFacilities(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Facility, "id">) })));
      setLoading(false);
    });
  }, [user]);

  return (
    <div>
      <div className="nav-bar">
        <h2 style={{ margin: 0 }}>My Facilities</h2>
        <Link className="btn" to="/dashboard/new">
          + Register a facility
        </Link>
      </div>

      {loading ? (
        <p className="empty-text">Loading…</p>
      ) : facilities.length === 0 ? (
        <p className="empty-text">
          You haven't registered any facilities yet. Once approved, your ground can be suggested
          to matched players in the Play Buddy app.
        </p>
      ) : (
        facilities.map((f) => (
          <div className="card" key={f.id}>
            <div className="nav-bar" style={{ marginBottom: 8 }}>
              <strong>{f.name}</strong>
              <StatusBadge status={f.status} />
            </div>
            <p style={{ margin: "4px 0", color: "var(--color-gray)" }}>{f.address}</p>
            <p style={{ margin: "4px 0", fontSize: 13 }}>{f.sports.join(", ")}</p>
            {f.status === "rejected" && f.rejectionReason && (
              <p className="error-text">Reason: {f.rejectionReason}</p>
            )}
            <Link className="btn btn-outline" to={`/dashboard/edit/${f.id}`}>
              Edit
            </Link>
          </div>
        ))
      )}
    </div>
  );
}
