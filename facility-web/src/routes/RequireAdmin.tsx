import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <p className="empty-text">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
