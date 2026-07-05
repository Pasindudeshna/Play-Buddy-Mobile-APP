import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "./lib/firebase";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./routes/LoginPage";
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
    <div className="nav-bar">
      <div className="brand">
        <span className="brand-b">B</span> PLAY BUDDY — FACILITY PORTAL
      </div>
      <div className="nav-links">
        {isAdmin ? (
          <>
            <NavLink to="/admin">Pending</NavLink>
            <NavLink to="/admin/all">All Facilities</NavLink>
          </>
        ) : (
          <NavLink to="/dashboard">My Facilities</NavLink>
        )}
        <button onClick={() => signOut(auth)}>Sign out</button>
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
