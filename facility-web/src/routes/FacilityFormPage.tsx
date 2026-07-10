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
import {
  DEFAULT_CURRENCY,
  DEFAULT_SLOT_DURATION_MINUTES,
  type Facility,
} from "../lib/facility";

const SLOT_DURATION_OPTIONS = [30, 60, 90, 120];

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
  const [pricePerHour, setPricePerHour] = useState("");
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [openingTime, setOpeningTime] = useState("06:00");
  const [closingTime, setClosingTime] = useState("22:00");
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(DEFAULT_SLOT_DURATION_MINUTES);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
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
      setPricePerHour(f.pricePerHour != null ? String(f.pricePerHour) : "");
      setCurrency(f.currency ?? DEFAULT_CURRENCY);
      setOpeningTime(f.openingTime ?? "06:00");
      setClosingTime(f.closingTime ?? "22:00");
      setSlotDurationMinutes(f.slotDurationMinutes ?? DEFAULT_SLOT_DURATION_MINUTES);
      setPhotoUrls(f.photoUrls ?? []);
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
    const price = Number(pricePerHour);
    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a valid hourly price.");
      return;
    }
    if (openingTime >= closingTime) {
      setError("Closing time must be after opening time.");
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
        pricePerHour: price,
        currency,
        openingTime,
        closingTime,
        slotDurationMinutes,
        photoUrls,
        updatedAt: serverTimestamp(),
      };

      if (isEdit && id) {
        // No admin review gate — an owner's edit goes live immediately.
        await updateDoc(doc(db, "facilities", id), {
          ...payload,
          status: "approved",
          approvedAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(collection(db, "facilities")), {
          ...payload,
          ownerId: user.uid,
          ownerName: user.displayName ?? "",
          ownerEmail: user.email ?? "",
          status: "approved",
          rejectionReason: null,
          createdAt: serverTimestamp(),
          approvedAt: serverTimestamp(),
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

  return (
    <div>
      <div className="page-header">
        <h2>{isEdit ? "Edit ground" : "Register a ground"}</h2>
        <p>Your listing goes live to matched players as soon as you save it.</p>
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
            <label>Standard charge</label>
            <div className="field-row">
              <input
                type="number"
                min="0"
                step="1"
                placeholder="Price per hour"
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
            {busy ? "Saving…" : isEdit ? "Save changes" : "Register ground"}
          </button>
        </form>
      </div>
    </div>
  );
}
