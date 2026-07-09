import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "./lib/firebase";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./routes/LoginPage";
import HomePage from "./routes/HomePage";
import OwnerDashboard from "./routes/OwnerDashboard";
import FacilityFormPage from "./routes/FacilityFormPage";
import AdminPendingQueue from "./routes/AdminPendingQueue";
import AdminAllFacilities from "./routes/AdminAllFacilities";
import RequireAuth from "./routes/RequireAuth";
import RequireAdmin from "./routes/RequireAdmin";

function Nav() {
  const { user, isAdmin } = useAuth();
  if (!user) return null;

  return (
    <div className="topnav">
      <div className="brand">
        <span className="brand-mark">B</span>
        <span>Play Buddy</span>
        <span className="brand-sep">/</span>
        <span>Facility Portal</span>
      </div>
      <div className="nav-links">
        {isAdmin ? (
          <>
            <NavLink to="/admin">Pending</NavLink>
            <NavLink to="/admin/all">All Facilities</NavLink>
          </>
        ) : (
          <>
            <NavLink to="/home">Home</NavLink>
            <NavLink to="/dashboard">My Grounds</NavLink>
          </>
        )}
        <span className="nav-divider" />
        <button className="signout-btn" onClick={() => signOut(auth)}>
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <Nav />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/home"
          element={
            <RequireAuth>
              <HomePage />
            </RequireAuth>
          }
        />

        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <OwnerDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/new"
          element={
            <RequireAuth>
              <FacilityFormPage />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/edit/:id"
          element={
            <RequireAuth>
              <FacilityFormPage />
            </RequireAuth>
          }
        />

        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminPendingQueue />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/all"
          element={
            <RequireAdmin>
              <AdminAllFacilities />
            </RequireAdmin>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}
