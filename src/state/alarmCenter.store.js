// src/state/alarmCenter.store.js
import { useMemo, useSyncExternalStore } from "react";
import { getPlant3Units } from "../data/mock/plant3.units.mock";

// Event types for deterministic parsing across pages
export const EVENT_TYPE = Object.freeze({
  DT_START: "DT_START",
  DT_END: "DT_END",
  ALARM_RAISE: "ALARM_RAISE",
  ALARM_CLEAR: "ALARM_CLEAR",
});

// Badge/print policy:
// We want the sidebar/dashboard number to EXACTLY match what we "print/show" as alarms.
// So we count only these as "printable alarms":
const PRINTABLE_TYPES = new Set([EVENT_TYPE.DT_START, EVENT_TYPE.ALARM_RAISE]);

// Demo controls (global):
// - window.__FS_DEMO_ALARMS__ = false  -> disables demo engine
// - window.__FS_DEMO_ALARMS__ = true   -> enables demo engine (default true)
const DEFAULT_DEMO_ENABLED = true;

// Demo: alarm hold duration (matches old AlarmsPage behavior)
const ALARM_HOLD_MS = 10 * 60 * 1000;

// Demo: interval for generating events
const DEMO_INTERVAL_MS = 40_000;

// Downtime catalog (same as AlarmsPage)
const DOWNTIME_CATALOG = [
  {
    group: "Maintenance",
    code: "MAINTENANCE",
    reasons: [
      { label: "Robot Issue", code: "ROBOT_ISSUE" },
      { label: "Sensor Issue", code: "SENSOR_ISSUE" },
      { label: "Vision System Issue", code: "VISION_ISSUE" },
      { label: "Conveyor Issue", code: "CONVEYOR_ISSUE" },
      { label: "Torque Gun Issue", code: "TORQUE_GUN_ISSUE" },
      { label: "Welder Issue", code: "WELDER_ISSUE" },
    ],
  },
  {
    group: "Meeting",
    code: "MEETING",
    reasons: [
      { label: "Meeting", code: "MEETING" },
      { label: "Training", code: "TRAINING" },
      { label: "Safety Issue", code: "SAFETY_ISSUE" },
      { label: "Break / Lunch", code: "BREAK_LUNCH" },
    ],
  },
  {
    group: "Quality",
    code: "QUALITY",
    reasons: [
      { label: "Quality Issue", code: "QUALITY_ISSUE" },
      { label: "Good Part Validation - No Pass", code: "GOOD_PART_VALIDATION_NO_PASS" },
      { label: "Part Quality Issue", code: "PART_QUALITY_ISSUE" },
      { label: "Waiting For Quality", code: "WAITING_FOR_QUALITY" },
    ],
  },
  {
    group: "Process",
    code: "PROCESS",
    reasons: [
      { label: "Running Slow - Sub Pack", code: "RUNNING_SLOW_SUB_PACK" },
      { label: "Waiting Components", code: "WAITING_COMPONENTS" },
      { label: "Waiting Parts WIP", code: "WAITING_PARTS_WIP" },
      { label: "Part Changeover", code: "PART_CHANGEOVER" },
      { label: "Parts Not In Schedule", code: "PARTS_NOT_IN_SCHEDULE" },
      { label: "Label Sys Problems", code: "LABEL_SYS_PROBLEMS" },
    ],
  },
];

const SEVERITY = Object.freeze({ LOW: "LOW", MED: "MED", HIGH: "HIGH" });

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function safeISO(ms) {
  try {
    return new Date(ms).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function computeBadgeCount(log) {
  const list = Array.isArray(log) ? log : [];
  let count = 0;
  for (const n of list) {
    if (PRINTABLE_TYPES.has(String(n?.eventType || ""))) count += 1;
  }
  return Math.min(count, 999);
}

// Build "active maps" from the log so UI can work even if AlarmsPage never mounted.
function buildActiveMapsFromLog(log) {
  const activeDowntimeMap = {};
  const activeAlarmMap = {};

  const list = Array.isArray(log) ? log : [];
  // log is newest-first
  for (const n of list) {
    const unitId = n?.unitId;
    if (!unitId) continue;

    const type = String(n?.eventType || "");

    // Downtime: first occurrence (newest) decides state
    if (!Object.prototype.hasOwnProperty.call(activeDowntimeMap, unitId)) {
      if (type === EVENT_TYPE.DT_START) {
        activeDowntimeMap[unitId] = {
          startISO: n.tsISO,
          category: n.category,
          reason: n.reason,
        };
      }
      if (type === EVENT_TYPE.DT_END) {
        // ended -> not active, mark as seen
        activeDowntimeMap[unitId] = null;
      }
    }

    // Alarm hold: first occurrence (newest) decides state
    if (!Object.prototype.hasOwnProperty.call(activeAlarmMap, unitId)) {
      if (type === EVENT_TYPE.ALARM_RAISE) {
        activeAlarmMap[unitId] = {
          tsISO: n.tsISO,
          severity: n.severity || SEVERITY.LOW,
          lastAlarmId: n.id,
        };
      }
      if (type === EVENT_TYPE.ALARM_CLEAR) {
        activeAlarmMap[unitId] = null;
      }
    }
  }

  // Cleanup: remove nulls and expired alarm holds
  const now = Date.now();

  Object.keys(activeDowntimeMap).forEach((k) => {
    if (!activeDowntimeMap[k]) delete activeDowntimeMap[k];
  });

  Object.keys(activeAlarmMap).forEach((k) => {
    const v = activeAlarmMap[k];
    if (!v) {
      delete activeAlarmMap[k];
      return;
    }
    const ts = v.tsISO ? Date.parse(v.tsISO) : NaN;
    if (!Number.isFinite(ts)) {
      delete activeAlarmMap[k];
      return;
    }
    if (now - ts > ALARM_HOLD_MS) delete activeAlarmMap[k];
  });

  return { activeDowntimeMap, activeAlarmMap };
}

function createStore() {
  let state = {
    unread: 0, // badge count = printable alarms count (DT_START + ALARM_RAISE)
    log: [], // newest first
  };

  const listeners = new Set();

  // Engine state (module singleton)
  let engineStarted = false;
  let demoTimer = null;

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

  function pushAlarm(row) {
    const nowISO = safeISO(Date.now());

    const normalized = {
      id: row?.id || makeId(),
      tsISO: row?.tsISO || nowISO,
      unitId: row?.unitId || "",
      unitName: row?.unitName || row?.unitId || "—",
      severity: row?.severity || SEVERITY.LOW,
      category: row?.category || "",
      reason: row?.reason || "",
      text: row?.text || "",
      eventType: row?.eventType || "",
    };

    const nextLog = [normalized, ...state.log].slice(0, 240);

    state = {
      log: nextLog,
      unread: computeBadgeCount(nextLog),
    };

    emit();
  }

  // Compatibility API (badge is derived from log)
  function markAllRead() {
    // If later you want "clear badge", you can implement a 'seen' mechanism.
    // For now: no-op to keep consistent with "badge == printable count".
    emit();
  }

  function clearAll() {
    state = { unread: 0, log: [] };
    emit();
  }

  function getActiveMaps() {
    return buildActiveMapsFromLog(state.log);
  }

  function stopDemoEngine() {
    if (demoTimer && typeof window !== "undefined") {
      window.clearInterval(demoTimer);
    }
    demoTimer = null;
  }

  function startDemoEngine() {
    if (demoTimer) return;
    if (typeof window === "undefined") return;

    const units = getPlant3Units();
    if (!units?.length) return;

    demoTimer = window.setInterval(() => {
      const enabled = window.__FS_DEMO_ALARMS__ ?? DEFAULT_DEMO_ENABLED;
      if (!enabled) return;

      const unit = pickRandom(units);
      const cat = pickRandom(DOWNTIME_CATALOG);
      const reason = pickRandom(cat.reasons);

      const maps = getActiveMaps();
      const isDowntime = Math.random() < 0.45;

      if (isDowntime) {
        if (!maps.activeDowntimeMap[unit.id]) {
          const tsISO = safeISO(Date.now());
          const sev =
            cat.code === "MAINTENANCE" ? SEVERITY.HIGH : cat.code === "QUALITY" ? SEVERITY.MED : SEVERITY.LOW;

          pushAlarm({
            id: makeId(),
            tsISO,
            unitId: unit.id,
            unitName: unit.name,
            severity: sev,
            category: cat.group,
            reason: reason.label,
            text: `Downtime — ${cat.group}: ${reason.label}`,
            eventType: EVENT_TYPE.DT_START,
          });
          return;
        }
      }

      const tsISO = safeISO(Date.now());
      const sev = cat.code === "MAINTENANCE" ? SEVERITY.HIGH : cat.code === "QUALITY" ? SEVERITY.MED : SEVERITY.LOW;

      pushAlarm({
        id: makeId(),
        tsISO,
        unitId: unit.id,
        unitName: unit.name,
        severity: sev,
        category: cat.group,
        reason: reason.label,
        text: `Live Alarm — ${cat.group}: ${reason.label}`,
        eventType: EVENT_TYPE.ALARM_RAISE,
      });
    }, DEMO_INTERVAL_MS);
  }

  function startEngine() {
    if (engineStarted) return;
    engineStarted = true;

    try {
      startDemoEngine();
    } catch {
      // ignore
    }
  }

  // Auto-start engine as soon as store module is imported.
  // This makes dashboard/sidebar badge work even if AlarmsPage is never opened.
  if (typeof window !== "undefined") {
    setTimeout(() => {
      try {
        startEngine();
      } catch {
        // ignore
      }
    }, 0);
  }

  return {
    subscribe,
    getSnapshot,
    pushAlarm,
    markAllRead,
    clearAll,
    startEngine,
    stopDemoEngine,
    getActiveMaps,
  };
}

export const alarmCenterStore = createStore();

export function useAlarmCenter() {
  const snap = useSyncExternalStore(alarmCenterStore.subscribe, alarmCenterStore.getSnapshot);

  return useMemo(
    () => ({
      unread: snap.unread,
      log: snap.log,
      pushAlarm: alarmCenterStore.pushAlarm,
      markAllRead: alarmCenterStore.markAllRead,
      clearAll: alarmCenterStore.clearAll,
      // helpers
      getActiveMaps: alarmCenterStore.getActiveMaps,
      startEngine: alarmCenterStore.startEngine,
      stopDemoEngine: alarmCenterStore.stopDemoEngine,
    }),
    [snap]
  );
}