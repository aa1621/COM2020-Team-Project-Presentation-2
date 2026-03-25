import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthProvider";

// just a wrapper that bounces unauthenticated users to login
export default function RequireAuth() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
