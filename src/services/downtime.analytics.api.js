// src/services/downtime.analytics.api.js

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) || "http://localhost:4000";

function buildQuery(params) {
  const qs = new URLSearchParams();
  Object.keys(params || {}).forEach((k) => {
    const v = params[k];
    if (v === undefined || v === null || v === "") return;
    qs.set(k, String(v));
  });
  return qs.toString();
}

async function safeJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

/**
 * Downtime analytics summary for charts:
 * - range: shift|day|week|month|quarter|halfyear|year
 * - tz: e.g. America/Toronto
 * - from/to optional ISO strings
 */
export async function getDowntimeSummary({ stationId, range = "day", tz = "America/Toronto", from, to } = {}) {
  if (!stationId) throw new Error("stationId is required");

  const query = buildQuery({ stationId, range, tz, from, to });
  const url = `${API_BASE}/api/analytics/downtime/summary?${query}`;

  const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
  const data = await safeJson(res);

  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

/**
 * Optional drilldown list for tables / export later.
 */
export async function getDowntimeEvents({ stationId, from, to, tz = "America/Toronto" } = {}) {
  if (!stationId) throw new Error("stationId is required");

  const query = buildQuery({ stationId, from, to, tz });
  const url = `${API_BASE}/api/analytics/downtime/events?${query}`;

  const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
  const data = await safeJson(res);

  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}