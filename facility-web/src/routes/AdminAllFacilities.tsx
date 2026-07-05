import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Facility, FacilityStatus } from "../lib/facility";
import StatusBadge from "../components/StatusBadge";

const TABS: (FacilityStatus | "all")[] = ["all", "pending", "approved", "rejected"];

export default function AdminAllFacilities() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");

  useEffect(() => {
    const q = query(collection(db, "facilities"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setFacilities(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Facility, "id">) })));
      setLoading(false);
    });
  }, []);

  const remove = async (id: string) => {
    if (!window.confirm("Remove this facility listing permanently?")) return;
    await deleteDoc(doc(db, "facilities", id));
  };

  const visible = tab === "all" ? facilities : facilities.filter((f) => f.status === tab);

  return (
    <div>
      <h2>All Facilities</h2>
      <div className="nav-links" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? "active" : ""}
            style={{ textTransform: "capitalize" }}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="empty-text">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="empty-text">No facilities in this category.</p>
      ) : (
        visible.map((f) => (
          <div className="card" key={f.id}>
            <div className="nav-bar" style={{ marginBottom: 8 }}>
              <strong>{f.name}</strong>
              <StatusBadge status={f.status} />
            </div>
            <p style={{ margin: "4px 0", color: "var(--color-gray)" }}>{f.address}</p>
            <p style={{ margin: "4px 0", fontSize: 13 }}>{f.sports.join(", ")}</p>
            <p style={{ margin: "4px 0", fontSize: 13 }}>
              Owner: {f.ownerName || f.ownerEmail} ({f.ownerEmail})
            </p>
            <button className="btn btn-danger" onClick={() => remove(f.id)}>
              Delete
            </button>
          </div>
        ))
      )}
    </div>
  );
}
