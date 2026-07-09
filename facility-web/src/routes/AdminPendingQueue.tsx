import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Facility } from "../lib/facility";

export default function AdminPendingQueue() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  useEffect(() => {
    const q = query(
      collection(db, "facilities"),
      where("status", "==", "pending"),
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
        console.error("Failed to load pending facilities:", err);
        setError(err.message);
        setLoading(false);
      }
    );
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
      <div className="page-header">
        <h2>Pending Grounds</h2>
        <p>Review new listings before they go live.</p>
      </div>

      {error ? (
        <p className="error-text">Couldn't load pending facilities: {error}</p>
      ) : loading ? (
        <p className="empty-text">Loading…</p>
      ) : facilities.length === 0 ? (
        <p className="empty-text">No grounds awaiting review.</p>
      ) : (
        facilities.map((f) => (
          <div className="card" key={f.id}>
            <span className="card-title">{f.name}</span>
            <p className="meta">{f.address}</p>
            <p className="meta">{f.sports.join(", ")}</p>
            <p className="meta">
              Submitted by <strong>{f.ownerName || f.ownerEmail}</strong> ({f.ownerEmail})
            </p>
            <p className="meta">
              Contact: {f.contactPhone} · {f.contactEmail}
            </p>
            <div className="divider" />
            <div className="field">
              <label>Rejection reason (used only if you reject)</label>
              <input
                value={rejectReasons[f.id] ?? ""}
                onChange={(e) =>
                  setRejectReasons((prev) => ({ ...prev, [f.id]: e.target.value }))
                }
              />
            </div>
            <div className="row" style={{ justifyContent: "flex-start", gap: 12 }}>
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
