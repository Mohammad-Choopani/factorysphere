// src/auth/auth.store.js
const KEY = "fs_auth_v1";

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.role || !parsed?.email) return null;

    return parsed; // object reference will be cached
  } catch {
    return null;
  }
}

// In-memory cache (stable reference)
let authCache = loadFromStorage();

// Simple subscriber list (reactive)
const listeners = new Set();

function emit() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // ignore listener errors
    }
  });
}

function setCache(next) {
  authCache = next;
  emit();
}

// Keep in sync across tabs/windows
window.addEventListener("storage", (e) => {
  if (!e) return;
  if (e.key !== KEY) return;

  const next = loadFromStorage();
  // Avoid emitting if nothing changed (by value)
  const prev = authCache;
  const prevKey = prev ? `${prev.email}|${prev.role}|${prev.ts || ""}` : "";
  const nextKey = next ? `${next.email}|${next.role}|${next.ts || ""}` : "";

  if (prevKey !== nextKey) setCache(next);
});

export function getAuth() {
  return authCache;
}

export function isAuthed() {
  return !!authCache;
}

// For useSyncExternalStore
export function subscribeAuth(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function getAuthSnapshot() {
  return authCache; // ✅ stable reference until auth really changes
}

export function login({ email, role }) {
  const payload = { email, role, ts: Date.now() };

  localStorage.setItem(KEY, JSON.stringify(payload));

  // clean legacy keys
  localStorage.removeItem("role");
  localStorage.removeItem("userEmail");

  setCache(payload);
  return payload;
}

export function logout() {
  localStorage.removeItem(KEY);
  localStorage.removeItem("role");
  localStorage.removeItem("userEmail");

  setCache(null);
}
