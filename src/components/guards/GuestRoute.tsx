import { Navigate, Outlet } from "react-router-dom";
import { useIsAuthenticated } from "../../store/auth.selectors";

export function GuestRoute() {
  const isAuthenticated = useIsAuthenticated();

  return isAuthenticated ? <Navigate to="/chat" replace /> : <Outlet />;
}
