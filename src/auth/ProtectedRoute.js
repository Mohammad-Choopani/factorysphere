import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function ProtectedRoute() {
  const location = useLocation();
  const role = localStorage.getItem("role");
  const email = localStorage.getItem("userEmail");

  const isAuthed = Boolean(role && email);

  if (!isAuthed) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
