import { useCallback, useEffect, useMemo, useState } from "react";

const LS_ROLE = "role";
const LS_EMAIL = "userEmail";

// Internal sync event (same-tab)
const AUTH_EVENT = "factorysphere:auth";

function readAuth() {
  const role = localStorage.getItem(LS_ROLE) || "";
  const email = localStorage.getItem(LS_EMAIL) || "";
  return { role, email, isAuthed: Boolean(role && email) };
}

function emitAuthChanged() {
  try {
    window.dispatchEvent(new Event(AUTH_EVENT));
  } catch {
    // no-op
  }
}

export default function useAuth() {
  const [state, setState] = useState(() => readAuth());

  const refresh = useCallback(() => {
    setState(readAuth());
  }, []);

  useEffect(() => {
    const onAuth = () => refresh();
    window.addEventListener(AUTH_EVENT, onAuth);
    return () => window.removeEventListener(AUTH_EVENT, onAuth);
  }, [refresh]);

  const login = useCallback((role, email) => {
    localStorage.setItem(LS_ROLE, role);
    localStorage.setItem(LS_EMAIL, email);
    setState({ role, email, isAuthed: true });
    emitAuthChanged();
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(LS_ROLE);
    localStorage.removeItem(LS_EMAIL);
    setState({ role: "", email: "", isAuthed: false });
    emitAuthChanged();
  }, []);

  return useMemo(
    () => ({ ...state, login, logout, refresh }),
    [state, login, logout, refresh]
  );
}
