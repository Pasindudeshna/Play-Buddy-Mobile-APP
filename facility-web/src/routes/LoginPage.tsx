import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate(isAdmin ? "/admin" : "/dashboard", { replace: true });
    }
  }, [loading, user, isAdmin, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) {
          await updateProfile(cred.user, { displayName: name.trim() });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 380, margin: "60px auto" }}>
      <div className="brand">
        <span className="brand-b">B</span> PLAY BUDDY — FACILITY PORTAL
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{mode === "login" ? "Sign in" : "Register your facility"}</h2>
        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div className="field">
              <label>Your name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          {error && <div className="error-text">{error}</div>}
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <p style={{ marginTop: 16, fontSize: 13 }}>
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button className="btn-outline" style={{ border: "none", padding: 0 }} onClick={() => setMode("signup")}>
                Register a facility
              </button>
            </>
          ) : (
            <>
              Already registered?{" "}
              <button className="btn-outline" style={{ border: "none", padding: 0 }} onClick={() => setMode("login")}>
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
