import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

const LS_ROLE = "role";
const LS_EMAIL = "userEmail";
const AUTH_EVENT = "factorysphere:auth";

function readAuth() {
  const role = localStorage.getItem(LS_ROLE) || "";
  const email = localStorage.getItem(LS_EMAIL) || "";
  return { role, email, isAuthed: Boolean(role && email) };
}

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const [, force] = React.useState(0);

  React.useEffect(() => {
    const bump = () => force((x) => x + 1);

    const onAuthEvent = () => bump();
    const onStorage = (e) => {
      if (e?.key === LS_ROLE || e?.key === LS_EMAIL) bump();
    };

    window.addEventListener(AUTH_EVENT, onAuthEvent);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(AUTH_EVENT, onAuthEvent);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const { isAuthed } = readAuth();

  if (!isAuthed) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return children ? children : <Outlet />;
}