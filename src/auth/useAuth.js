import { useCallback, useMemo, useState } from "react";

const LS_ROLE = "role";
const LS_EMAIL = "userEmail";

function readAuth() {
  const role = localStorage.getItem(LS_ROLE) || "";
  const email = localStorage.getItem(LS_EMAIL) || "";
  return { role, email, isAuthed: Boolean(role && email) };
}

export default function useAuth() {
  const [state, setState] = useState(() => readAuth());

  const refresh = useCallback(() => {
    setState(readAuth());
  }, []);

  const login = useCallback((role, email) => {
    localStorage.setItem(LS_ROLE, role);
    localStorage.setItem(LS_EMAIL, email);
    setState({ role, email, isAuthed: true });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(LS_ROLE);
    localStorage.removeItem(LS_EMAIL);
    setState({ role: "", email: "", isAuthed: false });
  }, []);

  return useMemo(() => ({ ...state, login, logout, refresh }), [state, login, logout, refresh]);
}
