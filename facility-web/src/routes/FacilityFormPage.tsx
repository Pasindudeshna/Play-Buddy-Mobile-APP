import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  collection,
  doc,
  GeoPoint,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { SPORTS, type SportId } from "../lib/sports";
import { geohashFor } from "../lib/geo";
import { uploadImageToCloudinary } from "../lib/cloudinary";
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
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
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
      setPhotoUrls(f.photoUrls ?? []);
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

  const handlePhotosSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setError(null);
    setUploadingPhotos(true);
    try {
      const uploaded = await Promise.all(files.map(uploadImageToCloudinary));
      setPhotoUrls((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload photos.");
    } finally {
      setUploadingPhotos(false);
    }
  };

  const removePhoto = (url: string) => {
    setPhotoUrls((prev) => prev.filter((u) => u !== url));
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
        location: new GeoPoint(lat, lng),
        geohash,
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim(),
        photoUrls,
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
        <p className="meta">
          This ground is live and approved. Contact support to make changes, or withdraw it from
          the dashboard first.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>{isEdit ? "Edit ground" : "Register a ground"}</h2>
        <p>Listings are reviewed before they go live to matched players.</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Ground name</label>
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
            <div className="field-row" style={{ marginBottom: 10 }}>
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
            <button type="button" className="btn btn-outline btn-sm" onClick={useMyLocation}>
              Use my current location
            </button>
          </div>
          <div className="field">
            <label>Photos</label>
            {photoUrls.length > 0 && (
              <div className="photo-upload-grid">
                {photoUrls.map((url) => (
                  <div className="photo-upload-thumb" key={url}>
                    <img src={url} alt="Ground" />
                    <button
                      type="button"
                      className="photo-upload-remove"
                      onClick={() => removePhoto(url)}
                      aria-label="Remove photo"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              className="file-input"
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotosSelected}
              disabled={uploadingPhotos}
            />
            {uploadingPhotos && <p className="meta">Uploading…</p>}
          </div>
          <div className="field">
            <label>Contact phone</label>
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              required
            />
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
          <button className="btn" type="submit" disabled={busy || uploadingPhotos}>
            {busy ? "Saving…" : isEdit ? "Save & resubmit for review" : "Submit for review"}
          </button>
        </form>
      </div>
    </div>
  );
}
