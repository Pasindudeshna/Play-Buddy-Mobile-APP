import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { SPORTS, type SportId } from "../lib/sports";
import { geohashFor } from "../lib/geo";
import type { Facility } from "../lib/facility";

export default function FacilityFormPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sports, setSports] = useState<SportId[]>([]);
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [status, setStatus] = useState<Facility["status"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, "facilities", id)).then((snap) => {
      if (!snap.exists()) {
        setError("Facility not found.");
        setLoading(false);
        return;
      }
      const f = snap.data() as Omit<Facility, "id">;
      setName(f.name);
      setDescription(f.description);
      setSports(f.sports);
      setAddress(f.address);
      setLatitude(String(f.location.latitude));
      setLongitude(String(f.location.longitude));
      setContactPhone(f.contactPhone);
      setContactEmail(f.contactEmail);
      setStatus(f.status);
      setLoading(false);
    });
  }, [id]);

  const toggleSport = (sportId: SportId) => {
    setSports((prev) =>
      prev.includes(sportId) ? prev.filter((s) => s !== sportId) : [...prev, sportId]
    );
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation isn't available in this browser — enter coordinates manually.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(String(pos.coords.latitude));
        setLongitude(String(pos.coords.longitude));
      },
      () => setError("Couldn't get your location — enter coordinates manually.")
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) return;
    if (sports.length === 0) {
      setError("Select at least one sport.");
      return;
    }
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError("Latitude/longitude must be valid numbers.");
      return;
    }

    setBusy(true);
    try {
      const geohash = geohashFor(lat, lng);
      const payload = {
        name: name.trim(),
        description: description.trim(),
        sports,
        address: address.trim(),
        location: { latitude: lat, longitude: lng },
        geohash,
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim(),
        updatedAt: serverTimestamp(),
      };

      if (isEdit && id) {
        // Rules require any owner update to resubmit as 'pending' — an
        // approved listing can only be edited by an admin.
        await updateDoc(doc(db, "facilities", id), { ...payload, status: "pending" });
      } else {
        await setDoc(doc(collection(db, "facilities")), {
          ...payload,
          ownerId: user.uid,
          ownerName: user.displayName ?? "",
          ownerEmail: user.email ?? "",
          photoUrls: [],
          status: "pending",
          rejectionReason: null,
          createdAt: serverTimestamp(),
          approvedAt: null,
        });
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save facility.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="empty-text">Loading…</p>;

  if (isEdit && status === "approved") {
    return (
      <div className="card">
        <p>
          This facility is live and approved. Contact support to make changes, or withdraw it from
          the dashboard first.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>{isEdit ? "Edit facility" : "Register a facility"}</h2>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Facility name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Sports offered</label>
          <div className="sport-grid">
            {SPORTS.map((s) => (
              <button
                type="button"
                key={s.id}
                className={`sport-chip ${sports.includes(s.id) ? "selected" : ""}`}
                onClick={() => toggleSport(s.id)}
              >
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} required />
        </div>
        <div className="field">
          <label>Location</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="Latitude"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              required
            />
            <input
              placeholder="Longitude"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              required
            />
          </div>
          <button type="button" className="btn btn-outline" onClick={useMyLocation}>
            Use my current location
          </button>
        </div>
        <div className="field">
          <label>Contact phone</label>
          <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} required />
        </div>
        <div className="field">
          <label>Contact email</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
          />
        </div>
        {error && <div className="error-text">{error}</div>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Saving…" : isEdit ? "Save & resubmit for review" : "Submit for review"}
        </button>
      </form>
    </div>
  );
}
