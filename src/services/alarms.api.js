// src/services/alarms.api.js
// Alarms / Downtime API (frontend)
// Provides stable named exports used by AlarmsPage.js

const DEFAULT_API_BASE = "http://localhost:4000";

function getApiBase() {
  // CRA env var convention (if you set it)
  // Example: REACT_APP_API_BASE=http://localhost:4000
  return (process.env.REACT_APP_API_BASE || DEFAULT_API_BASE).replace(/\/$/, "");
}

async function postJSON(path, payload) {
  const base = getApiBase();
  const url = `${base}${path}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });

  // If backend not ready yet, still avoid crashing the UI
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const msg = `API ${res.status} ${res.statusText} for ${path}${text ? ` — ${text}` : ""}`;
    throw new Error(msg);
  }

  // Try JSON first, fallback to text
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

/**
 * Start downtime for a unit
 * Expected input shape (from your AlarmsPage):
 * postDowntimeStart({ payload: { unitId, tsISO, categoryCode, reasonCode } })
 */
export async function postDowntimeStart({ payload }) {
  try {
    // Match your backend "actions" style route (adjust if needed)
    return await postJSON("/api/actions/downtime/start", payload);
  } catch (err) {
    // Don't break the UI if API is missing during prototype phase
    console.warn("[alarms.api] postDowntimeStart failed:", err?.message || err);
    return { ok: false, error: String(err?.message || err) };
  }
}

/**
 * End downtime for a unit
 * Expected input shape:
 * postDowntimeEnd({ payload: { unitId, tsISO } })
 */
export async function postDowntimeEnd({ payload }) {
  try {
    return await postJSON("/api/actions/downtime/end", payload);
  } catch (err) {
    console.warn("[alarms.api] postDowntimeEnd failed:", err?.message || err);
    return { ok: false, error: String(err?.message || err) };
  }
}