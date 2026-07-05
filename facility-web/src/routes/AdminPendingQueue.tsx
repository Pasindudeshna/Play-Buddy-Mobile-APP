import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Facility } from "../lib/facility";

export default function AdminPendingQueue() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  useEffect(() => {
    const q = query(
      collection(db, "facilities"),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      setFacilities(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Facility, "id">) })));
      setLoading(false);
    });
  }, []);

  const approve = async (id: string) => {
    setBusyId(id);
    try {
      await updateDoc(doc(db, "facilities", id), {
        status: "approved",
        rejectionReason: null,
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    setBusyId(id);
    try {
      await updateDoc(doc(db, "facilities", id), {
        status: "rejected",
        rejectionReason: rejectReasons[id]?.trim() || "Doesn't meet listing requirements.",
        updatedAt: serverTimestamp(),
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h2>Pending Facilities</h2>
      {loading ? (
        <p className="empty-text">Loading…</p>
      ) : facilities.length === 0 ? (
        <p className="empty-text">No facilities awaiting review.</p>
      ) : (
        facilities.map((f) => (
          <div className="card" key={f.id}>
            <strong>{f.name}</strong>
            <p style={{ margin: "4px 0", color: "var(--color-gray)" }}>{f.address}</p>
            <p style={{ margin: "4px 0", fontSize: 13 }}>{f.sports.join(", ")}</p>
            <p style={{ margin: "4px 0", fontSize: 13 }}>
              Submitted by {f.ownerName || f.ownerEmail} ({f.ownerEmail})
            </p>
            <p style={{ margin: "4px 0", fontSize: 13 }}>
              Contact: {f.contactPhone} · {f.contactEmail}
            </p>
            <div className="field">
              <label>Rejection reason (used only if you reject)</label>
              <input
                value={rejectReasons[f.id] ?? ""}
                onChange={(e) =>
                  setRejectReasons((prev) => ({ ...prev, [f.id]: e.target.value }))
                }
              />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn" disabled={busyId === f.id} onClick={() => approve(f.id)}>
                Approve
              </button>
              <button
                className="btn btn-danger"
                disabled={busyId === f.id}
                onClick={() => reject(f.id)}
              >
                Reject
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
