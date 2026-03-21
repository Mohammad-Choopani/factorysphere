// src/state/alarmSystem.helpers.js

import {
  EVENT_TYPE,
  REQUEST_STATUS,
  DOWNTIME_STATUS,
  SEVERITY,
  SOURCE_TYPE,
  PRINTABLE_TYPES,
} from "./alarmSystem.types";

export const ALARM_HOLD_MS = 10 * 60 * 1000;
export const LIVE_RETENTION_MS = 24 * 60 * 60 * 1000;

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function makeId(prefix = "ID") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function safeISO(ms) {
  try {
    return new Date(ms).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export function safeNowISO() {
  return safeISO(Date.now());
}

export function toDateSafe(value) {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

export function diffMinutes(startISO, endISO) {
  const s = toDateSafe(startISO);
  const e = toDateSafe(endISO);
  if (!s || !e) return 0;
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / 60000));
}

export function formatDurationMs(ms) {
  const safe = Math.max(0, Number(ms) || 0);
  const totalSec = Math.floor(safe / 1000);
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function getTorontoDateParts(tsISO = safeNowISO()) {
  const d = new Date(tsISO);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);

  const map = {};
  parts.forEach((p) => {
    if (p.type !== "literal") map[p.type] = p.value;
  });

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

export function getShiftMeta(tsISO = safeNowISO()) {
  const p = getTorontoDateParts(tsISO);
  const minutes = p.hour * 60 + p.minute;

  let shiftKey = "C";
  if (minutes >= 360 && minutes < 840) shiftKey = "A";
  else if (minutes >= 840 && minutes < 1320) shiftKey = "B";

  let businessDate = `${String(p.year).padStart(4, "0")}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;

  if (minutes < 360) {
    const noonUtc = new Date(`${businessDate}T12:00:00Z`);
    noonUtc.setUTCDate(noonUtc.getUTCDate() - 1);
    businessDate = noonUtc.toISOString().slice(0, 10);
  }

  return { shiftKey, businessDate };
}

export function resolveUnitStation(unit) {
  if (!unit) {
    return {
      unitId: null,
      unitName: "Unknown Unit",
      cellId: null,
      stationId: null,
      stationName: null,
      scopeType: "UNIT",
    };
  }

  return {
    unitId: unit.id || null,
    unitName: unit.name || unit.id || "Unknown Unit",
    cellId: unit.cellId || unit.id || null,
    stationId: unit.activeStationId || null,
    stationName: unit.activeStationName || null,
    scopeType: unit.activeStationId || unit.activeStationName ? "STATION" : "UNIT",
  };
}

export function severityFromCategoryCode(categoryCode) {
  if (categoryCode === "MAINTENANCE") return SEVERITY.HIGH;
  if (categoryCode === "QUALITY") return SEVERITY.MED;
  return SEVERITY.LOW;
}

export function normalizeRequest(input = {}) {
  const tsISO = input.requestedAt || input.tsISO || safeNowISO();
  const { shiftKey, businessDate } = getShiftMeta(tsISO);

  return {
    id: input.id || makeId("REQ"),
    unitId: input.unitId || null,
    unitName: input.unitName || input.unitId || "Unknown Unit",
    cellId: input.cellId || input.unitId || null,
    stationId: input.stationId || null,
    stationName: input.stationName || null,
    subject: String(input.subject || "").trim(),
    description: String(input.description || "").trim(),
    priority: input.priority || "MED",
    status: input.status || REQUEST_STATUS.OPEN,
    sourceType: input.sourceType || SOURCE_TYPE.OPERATOR,
    requestedBy: input.requestedBy || "unknown",
    requestedAt: tsISO,
    acknowledgedAt: input.acknowledgedAt || null,
    acknowledgedBy: input.acknowledgedBy || null,
    linkedDowntimeId: input.linkedDowntimeId || null,
    closedAt: input.closedAt || null,
    closedBy: input.closedBy || null,
    shiftKey: input.shiftKey || shiftKey,
    businessDate: input.businessDate || businessDate,
  };
}

export function normalizeDowntime(input = {}) {
  const tsISO = input.startedAt || input.tsISO || safeNowISO();
  const { shiftKey, businessDate } = getShiftMeta(tsISO);

  return {
    id: input.id || makeId("DT"),
    unitId: input.unitId || null,
    unitName: input.unitName || input.unitId || "Unknown Unit",
    cellId: input.cellId || input.unitId || null,
    stationId: input.stationId || null,
    stationName: input.stationName || null,
    sourceRequestId: input.sourceRequestId || null,
    sourceType: input.sourceType || SOURCE_TYPE.OPERATOR,
    categoryCode: input.categoryCode || "PROCESS",
    categoryLabel: input.categoryLabel || input.category || "Process",
    reasonCode: input.reasonCode || "UNKNOWN",
    reasonLabel: input.reasonLabel || input.reason || "Unknown",
    status: input.status || DOWNTIME_STATUS.ACTIVE,
    startedAt: tsISO,
    endedAt: input.endedAt || null,
    durationMin: Number(input.durationMin || 0),
    shiftKey: input.shiftKey || shiftKey,
    businessDate: input.businessDate || businessDate,
  };
}

export function normalizeEvent(input = {}) {
  const tsISO = input.tsISO || safeNowISO();
  const { shiftKey, businessDate } = getShiftMeta(tsISO);

  return {
    id: input.id || makeId("EVT"),
    eventType: input.eventType || "",
    requestId: input.requestId || null,
    downtimeId: input.downtimeId || null,
    unitId: input.unitId || null,
    unitName: input.unitName || input.unitId || "Unknown Unit",
    cellId: input.cellId || input.unitId || null,
    stationId: input.stationId || null,
    stationName: input.stationName || null,
    severity: input.severity || SEVERITY.LOW,
    categoryCode: input.categoryCode || null,
    categoryLabel: input.categoryLabel || input.category || null,
    reasonCode: input.reasonCode || null,
    reasonLabel: input.reasonLabel || input.reason || null,
    subject: input.subject || null,
    description: input.description || null,
    actor: input.actor || "system",
    sourceType: input.sourceType || SOURCE_TYPE.SYSTEM,
    text: input.text || "",
    linkedEventId: input.linkedEventId || null,
    tsISO,
    shiftKey: input.shiftKey || shiftKey,
    businessDate: input.businessDate || businessDate,
  };
}

export function computeBadgeCount(events = []) {
  return Math.min(
    (Array.isArray(events) ? events : []).reduce((acc, item) => {
      return acc + (PRINTABLE_TYPES.has(String(item?.eventType || "")) ? 1 : 0);
    }, 0),
    999
  );
}

export function pruneLiveEvents(events = []) {
  const now = Date.now();
  return (Array.isArray(events) ? events : []).filter((n) => {
    const ts = n?.tsISO ? Date.parse(n.tsISO) : NaN;
    return Number.isFinite(ts) && now - ts <= LIVE_RETENTION_MS;
  });
}

export function buildActiveMaps({ events = [], requests = [], downtimes = [] }) {
  const activeRequestMap = {};
  const activeDowntimeMap = {};
  const activeAlarmMap = {};

  (Array.isArray(requests) ? requests : []).forEach((req) => {
    if ([REQUEST_STATUS.OPEN, REQUEST_STATUS.ACKNOWLEDGED, REQUEST_STATUS.LINKED].includes(req.status)) {
      activeRequestMap[req.unitId] = req;
    }
  });

  (Array.isArray(downtimes) ? downtimes : []).forEach((dt) => {
    if (dt.status === DOWNTIME_STATUS.ACTIVE) {
      activeDowntimeMap[dt.unitId] = {
        id: dt.id,
        startISO: dt.startedAt,
        category: dt.categoryLabel,
        reason: dt.reasonLabel,
        stationId: dt.stationId || null,
        stationName: dt.stationName || null,
        sourceRequestId: dt.sourceRequestId || null,
      };
    }
  });

  const liveEvents = pruneLiveEvents(events);
  const newestFirst = [...liveEvents].sort((a, b) => Date.parse(b.tsISO || 0) - Date.parse(a.tsISO || 0));

  newestFirst.forEach((e) => {
    const unitId = e?.unitId;
    if (!unitId) return;
    if (activeAlarmMap[unitId]) return;

    if (e.eventType === EVENT_TYPE.ALARM_RAISE) {
      const ts = Date.parse(e.tsISO || 0);
      if (Number.isFinite(ts) && Date.now() - ts <= ALARM_HOLD_MS) {
        activeAlarmMap[unitId] = {
          tsISO: e.tsISO,
          severity: e.severity || SEVERITY.LOW,
          stationId: e.stationId || null,
          stationName: e.stationName || null,
          lastAlarmId: e.id,
        };
      }
      return;
    }

    if (e.eventType === EVENT_TYPE.ALARM_CLEAR) {
      activeAlarmMap[unitId] = null;
    }
  });

  Object.keys(activeAlarmMap).forEach((key) => {
    if (!activeAlarmMap[key]) delete activeAlarmMap[key];
  });

  return {
    activeRequestMap,
    activeDowntimeMap,
    activeAlarmMap,
  };
}

export function toLegacyLog(events = []) {
  const list = Array.isArray(events) ? events : [];

  return list
    .map((e) => {
      let eventType = e.eventType;

      if (eventType === EVENT_TYPE.DT_STARTED) eventType = EVENT_TYPE.DT_START;
      if (eventType === EVENT_TYPE.DT_ENDED) eventType = EVENT_TYPE.DT_END;

      return {
        id: e.id,
        tsISO: e.tsISO,
        unitId: e.unitId,
        unitName: e.unitName,
        stationId: e.stationId || null,
        stationName: e.stationName || null,
        severity: e.severity || SEVERITY.LOW,
        category: e.categoryLabel || "",
        reason: e.reasonLabel || "",
        text: e.text || "",
        eventType,
      };
    })
    .sort((a, b) => Date.parse(b.tsISO || 0) - Date.parse(a.tsISO || 0));
}