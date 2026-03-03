// src/state/downtime.store.js
import { useMemo, useSyncExternalStore } from "react";
import { EVENT_TYPE } from "./alarmCenter.store";

const LS_KEY = "FS_DOWNTIME_SESSIONS_V1";
const MAX_SESSIONS = 5000;

// Session shape:
// { id, unitId, unitName, category, reason, startMs, endMs|null, startISO, endISO|null, isOpen }
function safeParse(json) {
  try {
    const x = JSON.parse(json);
    return x;
  } catch {
    return null;
  }
}

function loadInitial() {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(LS_KEY);
  const parsed = safeParse(raw || "[]");
  return Array.isArray(parsed) ? parsed : [];
}

function saveAll(list) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getTsMs(tsISO) {
  const t = Date.parse(tsISO || "");
  return Number.isFinite(t) ? t : NaN;
}

// Ingest events from alarm log into persistent downtime sessions.
// We only care about DT_START / DT_END.
// If your Option B treats ALARM_RAISE as downtime too, we can also ingest those,
// but for now keep it strict to DT_START/DT_END so it’s controllable by "resume".
function normalizeDowntimeEvent(e) {
  if (!e?.unitId) return null;
  const type = e.eventType;
  if (type !== EVENT_TYPE.DT_START && type !== EVENT_TYPE.DT_END) return null;

  const tsMs = getTsMs(e.tsISO);
  if (!Number.isFinite(tsMs)) return null;

  return {
    eventType: type,
    tsMs,
    tsISO: e.tsISO,
    unitId: e.unitId,
    unitName: e.unitName || e.unitId,
    category: e.category || "Downtime",
    reason: e.reason || "Unspecified",
    id: e.id || makeId(),
  };
}

function createStore() {
  let state = {
    sessions: loadInitial(), // persistent
    lastIngestedTsMs: 0,
  };

  const listeners = new Set();

  function emit() {
    listeners.forEach((l) => l());
  }

  function getSnapshot() {
    return state;
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function setSessions(next) {
    const trimmed = Array.isArray(next) ? next.slice(0, MAX_SESSIONS) : [];
    state = { ...state, sessions: trimmed };
    saveAll(trimmed);
    emit();
  }

  function upsertFromEvent(ev) {
    const type = ev.eventType;

    if (type === EVENT_TYPE.DT_START) {
      // Open session if not already open for this unit
      const alreadyOpen = state.sessions.find((s) => s.unitId === ev.unitId && s.isOpen);
      if (alreadyOpen) return;

      const sess = {
        id: makeId(),
        unitId: ev.unitId,
        unitName: ev.unitName,
        category: ev.category,
        reason: ev.reason,
        startMs: ev.tsMs,
        endMs: null,
        startISO: ev.tsISO,
        endISO: null,
        isOpen: true,
      };

      setSessions([sess, ...state.sessions]);
      return;
    }

    if (type === EVENT_TYPE.DT_END) {
      // Close the latest open session for this unit
      const idx = state.sessions.findIndex((s) => s.unitId === ev.unitId && s.isOpen);
      if (idx === -1) return;

      const s = state.sessions[idx];
      const closed = {
        ...s,
        endMs: Math.max(ev.tsMs, s.startMs),
        endISO: ev.tsISO,
        isOpen: false,
      };

      const next = [...state.sessions];
      next[idx] = closed;
      setSessions(next);
    }
  }

  // Public: ingest from log (newest-first or any order)
  function ingestAlarmLog(log) {
    const list = Array.isArray(log) ? log : [];
    if (!list.length) return;

    // normalize and sort ascending to process correctly
    const evs = list
      .map(normalizeDowntimeEvent)
      .filter(Boolean)
      .sort((a, b) => a.tsMs - b.tsMs);

    if (!evs.length) return;

    // process only events newer than lastIngestedTsMs
    const cutoff = state.lastIngestedTsMs || 0;
    const fresh = evs.filter((e) => e.tsMs > cutoff);

    if (!fresh.length) return;

    for (const ev of fresh) upsertFromEvent(ev);

    const newest = fresh[fresh.length - 1]?.tsMs || cutoff;
    state = { ...state, lastIngestedTsMs: Math.max(cutoff, newest) };
    emit();
  }

  // Manual controls (for “resume” today)
  function manualStart({ unitId, unitName, category, reason, tsISO }) {
    const ts = tsISO ? getTsMs(tsISO) : Date.now();
    upsertFromEvent({
      eventType: EVENT_TYPE.DT_START,
      tsMs: ts,
      tsISO: new Date(ts).toISOString(),
      unitId,
      unitName: unitName || unitId,
      category: category || "Downtime",
      reason: reason || "Manual",
      id: makeId(),
    });
  }

  function manualEnd({ unitId, tsISO }) {
    const ts = tsISO ? getTsMs(tsISO) : Date.now();
    upsertFromEvent({
      eventType: EVENT_TYPE.DT_END,
      tsMs: ts,
      tsISO: new Date(ts).toISOString(),
      unitId,
      unitName: unitId,
      category: "Downtime",
      reason: "Manual Resume",
      id: makeId(),
    });
  }

  function clearAllDowntime() {
    state = { sessions: [], lastIngestedTsMs: 0 };
    saveAll([]);
    emit();
  }

  return {
    subscribe,
    getSnapshot,
    ingestAlarmLog,
    manualStart,
    manualEnd,
    clearAllDowntime,
  };
}

export const downtimeStore = createStore();

export function useDowntimeStore() {
  const snap = useSyncExternalStore(downtimeStore.subscribe, downtimeStore.getSnapshot);

  return useMemo(
    () => ({
      sessions: snap.sessions,
      ingestAlarmLog: downtimeStore.ingestAlarmLog,
      manualStart: downtimeStore.manualStart,
      manualEnd: downtimeStore.manualEnd,
      clearAllDowntime: downtimeStore.clearAllDowntime,
    }),
    [snap]
  );
}