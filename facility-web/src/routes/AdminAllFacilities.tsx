import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Facility, FacilityStatus } from "../lib/facility";
import StatusBadge from "../components/StatusBadge";

const TABS: (FacilityStatus | "all")[] = ["all", "pending", "approved", "rejected"];

export default function AdminAllFacilities() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");

  useEffect(() => {
    const q = query(collection(db, "facilities"), orderBy("createdAt", "desc"));
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
  }, []);

  const remove = async (id: string) => {
    if (!window.confirm("Remove this facility listing permanently?")) return;
    await deleteDoc(doc(db, "facilities", id));
  };

  const visible = tab === "all" ? facilities : facilities.filter((f) => f.status === tab);

  return (
    <div>
      <div className="page-header">
        <h2>All Grounds</h2>
        <p>Browse and manage every listing on the platform.</p>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={tab === t ? "active" : ""}>
            {t}
          </button>
        ))}
      </div>

      {error ? (
        <p className="error-text">Couldn't load facilities: {error}</p>
      ) : loading ? (
        <p className="empty-text">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="empty-text">No grounds in this category.</p>
      ) : (
        visible.map((f) => (
          <div className="card" key={f.id}>
            <div className="row">
              <span className="card-title">{f.name}</span>
              <StatusBadge status={f.status} />
            </div>
            <p className="meta">{f.address}</p>
            <p className="meta">{f.sports.join(", ")}</p>
            <p className="meta">
              Owner: <strong>{f.ownerName || f.ownerEmail}</strong> ({f.ownerEmail})
            </p>
            <div className="divider" />
            <button className="btn btn-danger btn-sm" onClick={() => remove(f.id)}>
              Delete
            </button>
          </div>
        ))
      )}
    </div>
  );
}
