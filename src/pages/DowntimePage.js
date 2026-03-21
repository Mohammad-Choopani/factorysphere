// src/pages/DowntimePage.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  Dialog,
  Button,
  MenuItem,
  Select,
  Divider,
  Stack,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  IconButton,
  Tooltip,
  Drawer,
  useMediaQuery,
} from "@mui/material";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import PauseCircleRoundedIcon from "@mui/icons-material/PauseCircleRounded";
import PlayCircleRoundedIcon from "@mui/icons-material/PlayCircleRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Billboard, Text } from "@react-three/drei";

import { getPlant3Units } from "../data/mock/plant3.units.mock";
import { useAlarmCenter, EVENT_TYPE } from "../state/alarmCenter.store";
import { postDowntimeStart, postDowntimeEnd } from "../services/alarms.api";

const LAYOUT_SPREAD = 1.34;

const SHIFT_ORDER = ["A", "B", "C"];
const SHIFT_TOTAL_MIN = 480;
const PLANNED_BREAK_MIN = 40;
const NET_WORK_MIN = SHIFT_TOTAL_MIN - PLANNED_BREAK_MIN;
const DAILY_SHIFT_COUNT = 3;
const DAILY_TOTAL_MIN = SHIFT_TOTAL_MIN * DAILY_SHIFT_COUNT;
const DAILY_NET_WORK_MIN = NET_WORK_MIN * DAILY_SHIFT_COUNT;
const DEFAULT_TOLERANCE_MIN = 5;
const LIVE_RETENTION_MS = 24 * 60 * 60 * 1000;

const PAGE = {
  bg: "#0b0f14",
  panel: "#111826",
  panel2: "#0f1623",
  border: "rgba(255,255,255,0.10)",
  borderSoft: "rgba(255,255,255,0.08)",
  text: "rgba(255,255,255,0.92)",
  subtext: "rgba(255,255,255,0.65)",
  muted: "rgba(255,255,255,0.52)",
  accent: "rgba(56,189,248,0.95)",
  success: "#22c55e",
  warn: "#f59e0b",
  danger: "#ef4444",
  purple: "#a855f7",
  info: "#38bdf8",
};

const COLORS = [
  "#38bdf8",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#14b8a6",
  "#f97316",
  "#64748b",
  "#06b6d4",
  "#84cc16",
  "#f43f5e",
  "#facc15",
];

const SEVERITY = {
  LOW: "LOW",
  MED: "MED",
  HIGH: "HIGH",
};

const SOURCE_TYPE = {
  SYSTEM: "SYSTEM",
  OPERATOR: "OPERATOR",
  TEAM_LEAD: "TEAM_LEAD",
};

const SCOPE_TYPE = {
  UNIT: "UNIT",
  STATION: "STATION",
};

const SHIFT_META = {
  A: {
    key: "A",
    label: "Shift 1 — Midnight",
    shortLabel: "A",
    startMin: 22 * 60,
    endMin: 6 * 60,
  },
  B: {
    key: "B",
    label: "Shift 2 — Morning",
    shortLabel: "B",
    startMin: 6 * 60,
    endMin: 14 * 60,
  },
  C: {
    key: "C",
    label: "Shift 3 — Afternoon",
    shortLabel: "C",
    startMin: 14 * 60,
    endMin: 22 * 60,
  },
};

const DOWNTIME_CATALOG = [
  {
    group: "Maintenance",
    code: "MAINTENANCE",
    severity: SEVERITY.HIGH,
    reasons: [
      { label: "Cold / Hold / Good Part Validation", code: "COLD_HOLD_GPV" },
      { label: "Robot Issue", code: "ROBOT_ISSUE" },
      { label: "Sensor Issue", code: "SENSOR_ISSUE" },
      { label: "Vision System Issue", code: "VISION_ISSUE" },
      { label: "Force Gun Issue", code: "FORCE_GUN_ISSUE" },
      { label: "Welder Issue", code: "WELDER_ISSUE" },
    ],
  },
  {
    group: "Break",
    code: "BREAK",
    severity: SEVERITY.LOW,
    reasons: [
      { label: "Break / Lunch", code: "BREAK_LUNCH" },
      { label: "Meeting", code: "MEETING" },
      { label: "Safety Issue", code: "SAFETY_ISSUE" },
    ],
  },
  {
    group: "Process",
    code: "PROCESS",
    severity: SEVERITY.MED,
    reasons: [
      { label: "Running Slow - Sub Pack", code: "RUNNING_SLOW_SUB_PACK" },
      { label: "Waiting Components", code: "WAITING_COMPONENTS" },
      { label: "Waiting PKG Unit", code: "WAITING_PKG_UNIT" },
      { label: "Waiting Parts WIP", code: "WAITING_PARTS_WIP" },
      { label: "Waiting For Quality", code: "WAITING_FOR_QUALITY" },
      { label: "Part Changeover", code: "PART_CHANGEOVER" },
      { label: "JOMAR - Parts Not In Schedule", code: "JOMAR_PARTS_NOT_IN_SCHEDULE" },
      { label: "Part Quality Issue", code: "PART_QUALITY_ISSUE" },
      { label: "Label Sys Problems", code: "LABEL_SYS_PROBLEMS" },
      { label: "Color - Fail Bad Part", code: "COLOR_FAIL_BAD_PART" },
    ],
  },
];

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatNumber(n) {
  const value = Number(n || 0);
  return Number.isFinite(value) ? value.toLocaleString() : "0";
}

function formatMinutes(n) {
  return `${formatNumber(Math.round(Number(n || 0)))} min`;
}

function formatPercent(n) {
  const value = Number(n || 0);
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

function formatTs(tsISO) {
  if (!tsISO) return "—";
  try {
    return new Date(tsISO).toLocaleString();
  } catch {
    return "—";
  }
}

function formatDurationMs(ms) {
  const safe = Math.max(0, Number(ms) || 0);
  const totalSec = Math.floor(safe / 1000);
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function compactLabel(text, max = 14) {
  const value = String(text || "—");
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function severityChipColor(sev) {
  if (sev === SEVERITY.HIGH) return "error";
  if (sev === SEVERITY.MED) return "warning";
  return "default";
}

function pickToneByCount(n) {
  if (n <= 2) return "success";
  if (n <= 5) return "accent";
  if (n <= 9) return "warn";
  return "danger";
}

function pickToneByMinutes(n) {
  if (n <= 10) return "success";
  if (n <= 25) return "accent";
  if (n <= 45) return "warn";
  return "danger";
}

function toDateSafe(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function getMinutesOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function getCurrentPlantShiftKey(date = new Date()) {
  const totalMinutes = getMinutesOfDay(date);
  if (totalMinutes >= 22 * 60 || totalMinutes < 6 * 60) return "A";
  if (totalMinutes >= 6 * 60 && totalMinutes < 14 * 60) return "B";
  return "C";
}

function getShiftBoundsForDate(date, shiftKey) {
  const d = new Date(date);
  const start = new Date(d);
  const end = new Date(d);

  if (shiftKey === "A") {
    const mins = getMinutesOfDay(d);
    if (mins < 6 * 60) {
      start.setDate(start.getDate() - 1);
      start.setHours(22, 0, 0, 0);
      end.setHours(6, 0, 0, 0);
    } else {
      start.setHours(22, 0, 0, 0);
      end.setDate(end.getDate() + 1);
      end.setHours(6, 0, 0, 0);
    }
  } else if (shiftKey === "B") {
    start.setHours(6, 0, 0, 0);
    end.setHours(14, 0, 0, 0);
  } else {
    start.setHours(14, 0, 0, 0);
    end.setHours(22, 0, 0, 0);
  }

  return { start, end };
}

function getShiftKeyForDate(date) {
  return getCurrentPlantShiftKey(date);
}

function splitEntryAcrossShifts(entry) {
  const explicitShift = entry?.shiftKey;
  const hasExplicitShift = SHIFT_ORDER.includes(explicitShift);

  const startedAt = toDateSafe(entry?.startedAt);
  const endedAt = toDateSafe(entry?.endedAt);
  const fallbackDuration = Math.max(0, Number(entry?.durationMin || 0));

  if (!startedAt || !endedAt || endedAt <= startedAt) {
    if (hasExplicitShift) {
      return [{ shiftKey: explicitShift, durationMin: fallbackDuration, entry }];
    }

    return [
      {
        shiftKey: getCurrentPlantShiftKey(),
        durationMin: fallbackDuration,
        entry,
      },
    ];
  }

  const parts = [];
  let cursor = new Date(startedAt);
  const finish = new Date(endedAt);

  while (cursor < finish) {
    const shiftKey = getShiftKeyForDate(cursor);
    const { end } = getShiftBoundsForDate(cursor, shiftKey);
    const segmentEnd = end < finish ? end : finish;
    const durationMin = Math.max(0, Math.round((segmentEnd - cursor) / 60000));

    if (durationMin > 0) {
      parts.push({ shiftKey, durationMin, entry });
    }

    cursor = new Date(segmentEnd);
  }

  if (!parts.length && fallbackDuration > 0) {
    parts.push({
      shiftKey: hasExplicitShift ? explicitShift : getShiftKeyForDate(startedAt),
      durationMin: fallbackDuration,
      entry,
    });
  }

  return parts;
}

function getEntryCategory(entry) {
  return entry?.customCategory || entry?.category || "UNCATEGORIZED";
}

function getEntryReason(entry) {
  return entry?.customReason || entry?.reason || "Unknown";
}

function isPlannedCategory(category) {
  const upper = String(category || "").toUpperCase();
  return upper === "BREAK";
}

function mapToSortedList(mapObj) {
  return Object.entries(mapObj || {})
    .map(([label, value]) => ({ label, value: Math.round(Number(value || 0)) }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

function pruneLiveLog(list) {
  const now = Date.now();
  return (Array.isArray(list) ? list : []).filter((n) => {
    const ts = n?.tsISO ? Date.parse(n.tsISO) : NaN;
    return Number.isFinite(ts) && now - ts <= LIVE_RETENTION_MS;
  });
}

function resolveUnitStation(unit) {
  if (!unit) {
    return {
      scopeType: SCOPE_TYPE.UNIT,
      stationId: null,
      stationName: null,
    };
  }

  if (unit.activeStationId || unit.activeStationName) {
    return {
      scopeType: SCOPE_TYPE.STATION,
      stationId: unit.activeStationId || null,
      stationName: unit.activeStationName || null,
    };
  }

  return {
    scopeType: SCOPE_TYPE.UNIT,
    stationId: null,
    stationName: null,
  };
}

function buildBusinessDateForShift(tsISO) {
  const date = new Date(tsISO);
  const mins = getMinutesOfDay(date);
  const d = new Date(date);

  if (mins < 6 * 60) {
    d.setDate(d.getDate() - 1);
  }

  return d.toISOString().slice(0, 10);
}

function buildEventPayload({
  unit,
  tsISO,
  eventType,
  severity,
  category,
  categoryCode,
  reason,
  reasonCode,
  text,
  sourceType = SOURCE_TYPE.OPERATOR,
  linkedEventId = null,
}) {
  const date = new Date(tsISO);
  const shiftKey = getCurrentPlantShiftKey(date);
  const businessDate = buildBusinessDateForShift(tsISO);
  const stationMeta = resolveUnitStation(unit);

  return {
    id: makeId(),
    tsISO,
    businessDate,
    shiftKey,
    eventType,
    sourceType,
    scopeType: stationMeta.scopeType,
    unitId: unit?.id || null,
    unitName: unit?.name || "Unknown Unit",
    stationId: stationMeta.stationId,
    stationName: stationMeta.stationName,
    severity,
    category,
    categoryCode,
    reason,
    reasonCode,
    text,
    linkedEventId,
  };
}

function deriveDowntimeState(log) {
  const liveLog = pruneLiveLog(log);
  const asc = [...liveLog].sort((a, b) => Date.parse(a.tsISO || 0) - Date.parse(b.tsISO || 0));
  const now = Date.now();

  const activeDowntimeMap = {};
  const openDowntimeStartMap = {};
  const sessions = [];

  asc.forEach((n) => {
    const unitId = n?.unitId;
    if (!unitId) return;

    const type = String(n.eventType || "");

    if (type === EVENT_TYPE.DT_START) {
      activeDowntimeMap[unitId] = {
        startISO: n.tsISO,
        severity: n.severity || SEVERITY.LOW,
        stationId: n.stationId || null,
        stationName: n.stationName || null,
        startEventId: n.id,
        category: n.category,
        reason: n.reason,
      };
      openDowntimeStartMap[unitId] = n;
      return;
    }

    if (type === EVENT_TYPE.DT_END) {
      const startEvent = openDowntimeStartMap[unitId] || null;
      const durationMs =
        startEvent?.tsISO && n?.tsISO ? Math.max(0, Date.parse(n.tsISO) - Date.parse(startEvent.tsISO)) : 0;

      sessions.push({
        id: n.id || `dt-end-${unitId}`,
        kind: "DOWNTIME",
        status: "CLOSED",
        unitId,
        unitName: n.unitName || startEvent?.unitName || "—",
        stationId: n.stationId || startEvent?.stationId || null,
        stationName: n.stationName || startEvent?.stationName || null,
        severity: startEvent?.severity || n.severity || SEVERITY.LOW,
        category: startEvent?.category || n.category || "Downtime",
        reason: startEvent?.reason || n.reason || "—",
        startISO: startEvent?.tsISO || null,
        endISO: n.tsISO || null,
        durationMs,
        durationLabel: formatDurationMs(durationMs),
        businessDate: startEvent?.businessDate || n.businessDate || null,
        shiftKey: startEvent?.shiftKey || n.shiftKey || null,
        sourceType: startEvent?.sourceType || n.sourceType || SOURCE_TYPE.OPERATOR,
        text: startEvent?.text || n.text || "",
      });

      delete activeDowntimeMap[unitId];
      delete openDowntimeStartMap[unitId];
    }
  });

  Object.values(openDowntimeStartMap).forEach((n) => {
    const durationMs = n?.tsISO ? Math.max(0, now - Date.parse(n.tsISO)) : 0;

    sessions.push({
      id: `open-dt-${n.id}`,
      kind: "DOWNTIME",
      status: "ACTIVE",
      unitId: n.unitId,
      unitName: n.unitName || "—",
      stationId: n.stationId || null,
      stationName: n.stationName || null,
      severity: n.severity || SEVERITY.LOW,
      category: n.category || "Downtime",
      reason: n.reason || "—",
      startISO: n.tsISO || null,
      endISO: null,
      durationMs,
      durationLabel: formatDurationMs(durationMs),
      businessDate: n.businessDate || null,
      shiftKey: n.shiftKey || null,
      sourceType: n.sourceType || SOURCE_TYPE.OPERATOR,
      text: n.text || "",
    });
  });

  sessions.sort((a, b) => Date.parse(b.startISO || 0) - Date.parse(a.startISO || 0));

  return {
    liveLog,
    activeDowntimeMap,
    openDowntimeStartMap,
    sessionHistory: sessions,
  };
}

function buildCanonicalEntriesFromSessions(sessions = []) {
  const systemEntries = [];
  const manualEntries = [];

  sessions.forEach((session) => {
    const startedAt = session?.startISO || null;
    const endedAt = session?.endISO || new Date().toISOString();
    const durationMin = Math.max(0, Math.round(Number(session?.durationMs || 0) / 60000));
    const sourceType = session?.sourceType || SOURCE_TYPE.OPERATOR;
    const isManual = sourceType === SOURCE_TYPE.OPERATOR || sourceType === SOURCE_TYPE.TEAM_LEAD;

    const entry = {
      id: session.id,
      shiftKey: session.shiftKey,
      startedAt,
      endedAt,
      durationMin,
      category: session.category || "UNCATEGORIZED",
      reason: session.reason || "Unknown",
      customCategory: "",
      customReason: "",
      note: session.text || "",
      source: isManual ? "team_lead_manual" : "system",
      sourceType,
      unitId: session.unitId,
      unitName: session.unitName,
      stationId: session.stationId || null,
      stationName: session.stationName || null,
      severity: session.severity || SEVERITY.LOW,
      status: session.status || "CLOSED",
    };

    if (isManual) {
      manualEntries.push(entry);
    } else {
      systemEntries.push(entry);
    }
  });

  return { systemEntries, manualEntries };
}

function buildDowntimeAnalytics(systemEntries = [], manualEntries = [], toleranceMin = DEFAULT_TOLERANCE_MIN) {
  const perShift = {
    A: {
      planned: 0,
      systemUnplanned: 0,
      manualUnplanned: 0,
      unplannedMerged: 0,
      allActual: 0,
      categoriesSystem: {},
      categoriesManual: {},
      categoriesUnplannedMerged: {},
      reasonsUnplannedMerged: {},
    },
    B: {
      planned: 0,
      systemUnplanned: 0,
      manualUnplanned: 0,
      unplannedMerged: 0,
      allActual: 0,
      categoriesSystem: {},
      categoriesManual: {},
      categoriesUnplannedMerged: {},
      reasonsUnplannedMerged: {},
    },
    C: {
      planned: 0,
      systemUnplanned: 0,
      manualUnplanned: 0,
      unplannedMerged: 0,
      allActual: 0,
      categoriesSystem: {},
      categoriesManual: {},
      categoriesUnplannedMerged: {},
      reasonsUnplannedMerged: {},
    },
  };

  function addToMap(target, key, value) {
    const safeKey = key || "Unknown";
    target[safeKey] = (target[safeKey] || 0) + Number(value || 0);
  }

  systemEntries.forEach((entry) => {
    splitEntryAcrossShifts(entry).forEach((part) => {
      const bucket = perShift[part.shiftKey];
      if (!bucket) return;

      const category = getEntryCategory(entry);
      const reason = getEntryReason(entry);
      const planned = isPlannedCategory(category);

      bucket.allActual += part.durationMin;

      if (planned) {
        bucket.planned += part.durationMin;
      } else {
        bucket.systemUnplanned += part.durationMin;
        bucket.unplannedMerged += part.durationMin;
        addToMap(bucket.categoriesSystem, category, part.durationMin);
        addToMap(bucket.categoriesUnplannedMerged, category, part.durationMin);
        addToMap(bucket.reasonsUnplannedMerged, reason, part.durationMin);
      }
    });
  });

  manualEntries.forEach((entry) => {
    splitEntryAcrossShifts(entry).forEach((part) => {
      const bucket = perShift[part.shiftKey];
      if (!bucket) return;

      const category = getEntryCategory(entry);
      const reason = getEntryReason(entry);
      const planned = isPlannedCategory(category);

      bucket.allActual += part.durationMin;

      if (planned) {
        bucket.planned += part.durationMin;
      } else {
        bucket.manualUnplanned += part.durationMin;
        bucket.unplannedMerged += part.durationMin;
        addToMap(bucket.categoriesManual, category, part.durationMin);
        addToMap(bucket.categoriesUnplannedMerged, category, part.durationMin);
        addToMap(bucket.reasonsUnplannedMerged, reason, part.durationMin);
      }
    });
  });

  const byShiftList = SHIFT_ORDER.map((key) => {
    const row = perShift[key];
    const shiftLengthMin = SHIFT_TOTAL_MIN;
    const availableWorkMin = NET_WORK_MIN;
    const plannedMin = Math.round(row.planned);
    const unplannedMin = Math.round(row.unplannedMerged);
    const operatingMin = Math.max(0, availableWorkMin - unplannedMin);

    return {
      shiftKey: key,
      label: SHIFT_META[key].shortLabel,
      shiftLengthMin,
      availableWorkMin,
      plannedMin,
      systemUnplannedMin: Math.round(row.systemUnplanned),
      manualUnplannedMin: Math.round(row.manualUnplanned),
      unplannedMergedMin: unplannedMin,
      operatingMin,
      allActualMin: Math.round(row.allActual),
      downtimePctOfNet: availableWorkMin > 0 ? Number(((unplannedMin / availableWorkMin) * 100).toFixed(1)) : 0,
      categoriesSystem: mapToSortedList(row.categoriesSystem),
      categoriesManual: mapToSortedList(row.categoriesManual),
      categoriesUnplannedMerged: mapToSortedList(row.categoriesUnplannedMerged),
      reasonsUnplannedMerged: mapToSortedList(row.reasonsUnplannedMerged),
    };
  });

  const daily = byShiftList.reduce(
    (acc, row) => {
      acc.shiftLengthMin += row.shiftLengthMin;
      acc.availableWorkMin += row.availableWorkMin;
      acc.plannedMin += row.plannedMin;
      acc.systemUnplannedMin += row.systemUnplannedMin;
      acc.manualUnplannedMin += row.manualUnplannedMin;
      acc.unplannedMergedMin += row.unplannedMergedMin;
      acc.operatingMin += row.operatingMin;
      acc.allActualMin += row.allActualMin;

      row.categoriesSystem.forEach((item) => {
        acc.categoriesSystem[item.label] = (acc.categoriesSystem[item.label] || 0) + item.value;
      });
      row.categoriesManual.forEach((item) => {
        acc.categoriesManual[item.label] = (acc.categoriesManual[item.label] || 0) + item.value;
      });
      row.categoriesUnplannedMerged.forEach((item) => {
        acc.categoriesUnplannedMerged[item.label] = (acc.categoriesUnplannedMerged[item.label] || 0) + item.value;
      });
      row.reasonsUnplannedMerged.forEach((item) => {
        acc.reasonsUnplannedMerged[item.label] = (acc.reasonsUnplannedMerged[item.label] || 0) + item.value;
      });

      return acc;
    },
    {
      shiftLengthMin: 0,
      availableWorkMin: 0,
      plannedMin: 0,
      systemUnplannedMin: 0,
      manualUnplannedMin: 0,
      unplannedMergedMin: 0,
      operatingMin: 0,
      allActualMin: 0,
      categoriesSystem: {},
      categoriesManual: {},
      categoriesUnplannedMerged: {},
      reasonsUnplannedMerged: {},
    }
  );

  const varianceMin = Math.abs(daily.systemUnplannedMin - daily.manualUnplannedMin);

  let reconciliationStatus = "balanced";
  if (daily.systemUnplannedMin > 0 && daily.manualUnplannedMin === 0) reconciliationStatus = "system_only";
  else if (daily.systemUnplannedMin === 0 && daily.manualUnplannedMin > 0) reconciliationStatus = "manual_only";
  else if (varianceMin > toleranceMin) reconciliationStatus = "outside_tolerance";
  else reconciliationStatus = "within_tolerance";

  const latestSystem =
    [...systemEntries].sort(
      (a, b) =>
        (toDateSafe(b?.endedAt || b?.startedAt)?.getTime() || 0) -
        (toDateSafe(a?.endedAt || a?.startedAt)?.getTime() || 0)
    )[0] || null;

  const latestManual =
    [...manualEntries].sort(
      (a, b) =>
        (toDateSafe(b?.endedAt || b?.startedAt)?.getTime() || 0) -
        (toDateSafe(a?.endedAt || a?.startedAt)?.getTime() || 0)
    )[0] || null;

  return {
    toleranceMin,
    entries: {
      system: systemEntries,
      manual: manualEntries,
    },
    byShiftList,
    daily: {
      shiftLengthMin: Math.round(daily.shiftLengthMin),
      availableWorkMin: Math.round(daily.availableWorkMin),
      plannedMin: Math.round(daily.plannedMin),
      systemUnplannedMin: Math.round(daily.systemUnplannedMin),
      manualUnplannedMin: Math.round(daily.manualUnplannedMin),
      unplannedMergedMin: Math.round(daily.unplannedMergedMin),
      operatingMin: Math.round(daily.operatingMin),
      allActualMin: Math.round(daily.allActualMin),
      downtimePctOfNet:
        daily.availableWorkMin > 0 ? Number(((daily.unplannedMergedMin / daily.availableWorkMin) * 100).toFixed(1)) : 0,
      categoriesSystem: mapToSortedList(daily.categoriesSystem),
      categoriesManual: mapToSortedList(daily.categoriesManual),
      categoriesUnplannedMerged: mapToSortedList(daily.categoriesUnplannedMerged),
      reasonsUnplannedMerged: mapToSortedList(daily.reasonsUnplannedMerged),
    },
    reconciliation: {
      systemUnplannedMin: Math.round(daily.systemUnplannedMin),
      manualUnplannedMin: Math.round(daily.manualUnplannedMin),
      unplannedMergedMin: Math.round(daily.unplannedMergedMin),
      varianceMin: Math.round(varianceMin),
      toleranceMin,
      reconciliationStatus,
      hasManualAdjustment: manualEntries.length > 0,
      withinTolerance: varianceMin <= toleranceMin,
      lastSystemEntry: latestSystem,
      lastManualEntry: latestManual,
    },
  };
}

function buildMixByField(list, field, limit = 8) {
  const map = {};
  (list || []).forEach((item) => {
    const key = item?.[field] || "—";
    map[key] = (map[key] || 0) + 1;
  });

  return Object.entries(map)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function buildUnitComparisonRows(list) {
  const map = {};
  (list || []).forEach((item) => {
    const unitId = item?.unitId || "UNKNOWN";
    if (!map[unitId]) {
      map[unitId] = {
        id: unitId,
        label: item?.unitName || unitId,
        count: 0,
        activeCount: 0,
        totalMinutes: 0,
      };
    }
    map[unitId].count += 1;
    map[unitId].totalMinutes += Math.round(Number(item?.durationMs || 0) / 60000);
    if (item.status === "ACTIVE") map[unitId].activeCount += 1;
  });

  return Object.values(map)
    .sort((a, b) => b.totalMinutes - a.totalMinutes)
    .slice(0, 12)
    .map((row) => ({
      ...row,
      shortLabel: compactLabel(row.label, 13),
    }));
}

function buildHourlyTrend(sessionHistory) {
  const buckets = Array.from({ length: 12 }, (_, idx) => {
    const end = Date.now() - (11 - idx) * 60 * 60 * 1000;
    const labelDate = new Date(end);
    const hh = String(labelDate.getHours()).padStart(2, "0");
    return {
      label: `${hh}:00`,
      start: end,
      end: end + 60 * 60 * 1000,
      value: 0,
    };
  });

  (sessionHistory || []).forEach((item) => {
    const ts = item?.startISO ? Date.parse(item.startISO) : NaN;
    if (!Number.isFinite(ts)) return;
    const bucket = buckets.find((b) => ts >= b.start && ts < b.end);
    if (bucket) bucket.value += 1;
  });

  return buckets.map((item) => ({ label: item.label, value: item.value }));
}

function buildSessionAnalytics(sessionHistory, activeDowntimeMap, liveLog) {
  const rows = (sessionHistory || []).filter((n) => n.kind === "DOWNTIME");
  const active = rows.filter((n) => n.status === "ACTIVE");
  const closed = rows.filter((n) => n.status === "CLOSED");
  const byCategory = buildMixByField(rows, "category", 8);
  const byUnit = buildUnitComparisonRows(rows);
  const hourlyTrend = buildHourlyTrend(rows);

  const avgMin = closed.length
    ? closed.reduce((sum, item) => sum + Number(item.durationMs || 0), 0) / closed.length / 60000
    : 0;

  const topActive = [...active].sort((a, b) => Number(b.durationMs || 0) - Number(a.durationMs || 0))[0] || null;
  const latestLive = liveLog?.[0] || null;

  return {
    total: rows.length,
    active: active.length || Object.keys(activeDowntimeMap || {}).length,
    closed: closed.length,
    avgMin,
    byCategory,
    byUnit,
    hourlyTrend,
    topActive,
    latestLive,
  };
}

function statusColor(status) {
  if (status === "RUNNING") return PAGE.success;
  if (status === "ATTN") return PAGE.warn;
  return PAGE.danger;
}

function SectionGrid({ children, min = 320, gap = 12 }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
        gap,
        alignItems: "start",
      }}
    >
      {children}
    </div>
  );
}

function Card({ title, subtitle, children, right, tone = "default" }) {
  const toneMap = {
    default: {
      border: PAGE.border,
      bg: PAGE.panel,
      header: "rgba(255,255,255,0.02)",
    },
    accent: {
      border: "rgba(56,189,248,0.18)",
      bg: "rgba(56,189,248,0.05)",
      header: "rgba(56,189,248,0.08)",
    },
    success: {
      border: "rgba(34,197,94,0.18)",
      bg: "rgba(34,197,94,0.05)",
      header: "rgba(34,197,94,0.08)",
    },
    warn: {
      border: "rgba(245,158,11,0.18)",
      bg: "rgba(245,158,11,0.05)",
      header: "rgba(245,158,11,0.08)",
    },
    danger: {
      border: "rgba(239,68,68,0.18)",
      bg: "rgba(239,68,68,0.05)",
      header: "rgba(239,68,68,0.08)",
    },
    purple: {
      border: "rgba(168,85,247,0.18)",
      bg: "rgba(168,85,247,0.05)",
      header: "rgba(168,85,247,0.08)",
    },
  };

  const skin = toneMap[tone] || toneMap.default;

  return (
    <div
      style={{
        minWidth: 0,
        width: "100%",
        border: `1px solid ${skin.border}`,
        background: skin.bg,
        borderRadius: 18,
        overflow: "hidden",
        height: "100%",
      }}
    >
      <div
        style={{
          padding: "13px 15px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          borderBottom: `1px solid ${PAGE.border}`,
          background: skin.header,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              color: PAGE.text,
              fontWeight: 900,
              lineHeight: 1.2,
              whiteSpace: "normal",
              overflowWrap: "break-word",
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                color: PAGE.subtext,
                fontSize: 12,
                marginTop: 4,
                lineHeight: 1.35,
                whiteSpace: "normal",
                overflowWrap: "break-word",
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
        {right ? (
          <div
            style={{
              minWidth: 0,
              maxWidth: "100%",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            {right}
          </div>
        ) : null}
      </div>

      <div style={{ padding: 14, minWidth: 0 }}>{children}</div>
    </div>
  );
}

function KpiCard({ label, value, subvalue, tone = "default" }) {
  const toneMap = {
    default: {
      border: PAGE.border,
      bg: "rgba(255,255,255,0.03)",
    },
    accent: {
      border: "rgba(56,189,248,0.28)",
      bg: "rgba(56,189,248,0.08)",
    },
    success: {
      border: "rgba(34,197,94,0.28)",
      bg: "rgba(34,197,94,0.08)",
    },
    warn: {
      border: "rgba(245,158,11,0.28)",
      bg: "rgba(245,158,11,0.08)",
    },
    danger: {
      border: "rgba(239,68,68,0.28)",
      bg: "rgba(239,68,68,0.08)",
    },
    purple: {
      border: "rgba(168,85,247,0.28)",
      bg: "rgba(168,85,247,0.08)",
    },
    info: {
      border: "rgba(56,189,248,0.28)",
      bg: "rgba(56,189,248,0.08)",
    },
  };

  const skin = toneMap[tone] || toneMap.default;

  return (
    <div
      style={{
        minWidth: 0,
        border: `1px solid ${skin.border}`,
        background: skin.bg,
        borderRadius: 16,
        padding: "12px 14px",
        height: "100%",
      }}
    >
      <div style={{ color: PAGE.subtext, fontSize: 12, lineHeight: 1.3 }}>{label}</div>
      <div
        style={{
          color: PAGE.text,
          fontWeight: 900,
          fontSize: 20,
          lineHeight: 1.2,
          marginTop: 6,
          whiteSpace: "normal",
          overflowWrap: "break-word",
        }}
      >
        {value}
      </div>
      {subvalue ? (
        <div style={{ color: PAGE.subtext, fontSize: 12, marginTop: 6, lineHeight: 1.35 }}>{subvalue}</div>
      ) : null}
    </div>
  );
}

function InfoLine({ label, value }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(110px, 140px) minmax(0, 1fr)",
        gap: 10,
        alignItems: "start",
      }}
    >
      <div style={{ color: PAGE.subtext, fontSize: 12 }}>{label}</div>
      <div
        style={{
          color: PAGE.text,
          fontWeight: 800,
          lineHeight: 1.4,
          whiteSpace: "normal",
          overflowWrap: "break-word",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function SortButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 34,
        padding: "0 12px",
        borderRadius: 12,
        border: `1px solid ${active ? "rgba(56,189,248,0.34)" : PAGE.border}`,
        background: active ? "rgba(56,189,248,0.14)" : "rgba(255,255,255,0.04)",
        color: PAGE.text,
        fontWeight: 900,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function LegendList({ items, suffix = "" }) {
  return (
    <div style={{ display: "grid", gap: 10, width: "100%", minWidth: 0 }}>
      {(items || []).map((item, idx) => (
        <div
          key={`${item.label}-${idx}`}
          style={{
            display: "grid",
            gridTemplateColumns: "14px minmax(0, 1fr) auto",
            gap: 10,
            alignItems: "start",
            minWidth: 0,
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 99,
              background: COLORS[idx % COLORS.length],
              display: "inline-block",
              marginTop: 3,
            }}
          />
          <div
            title={item.label}
            style={{
              color: PAGE.text,
              fontWeight: 700,
              minWidth: 0,
              lineHeight: 1.35,
              whiteSpace: "normal",
              overflowWrap: "break-word",
            }}
          >
            {item.label}
          </div>
          <div style={{ color: PAGE.subtext, fontWeight: 800, whiteSpace: "nowrap", paddingLeft: 4 }}>
            {item.value}
            {suffix}
          </div>
        </div>
      ))}
    </div>
  );
}

function HorizontalBarChart({ rows, valueKey = "value", unit = "", onRowClick }) {
  const maxValue = Math.max(1, ...rows.map((r) => Number(r?.[valueKey] || 0)));

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {rows.map((row, idx) => {
        const value = Number(row?.[valueKey] || 0);
        const width = `${(value / maxValue) * 100}%`;

        return (
          <button
            key={`${row.label}-${idx}`}
            onClick={() => onRowClick?.(row)}
            style={{
              border: `1px solid ${PAGE.border}`,
              background: "rgba(255,255,255,0.03)",
              borderRadius: 14,
              padding: 10,
              textAlign: "left",
              cursor: onRowClick ? "pointer" : "default",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: 10,
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  color: PAGE.text,
                  fontWeight: 800,
                  minWidth: 0,
                  whiteSpace: "normal",
                  overflowWrap: "break-word",
                }}
              >
                {row.label}
              </div>
              <div style={{ color: PAGE.subtext, fontWeight: 800, whiteSpace: "nowrap" }}>
                {value}
                {unit}
              </div>
            </div>

            <div
              style={{
                width: "100%",
                height: 10,
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width,
                  minWidth: value > 0 ? 10 : 0,
                  height: "100%",
                  borderRadius: 999,
                  background: COLORS[idx % COLORS.length],
                }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function HalfDonutHourlyChart({ rows }) {
  const size = 320;
  const cx = size / 2;
  const cy = size / 2 + 28;
  const rOuter = 118;
  const rInner = 72;
  const total = rows.reduce((sum, row) => sum + Number(row.value || 0), 0);
  const activeHours = rows.filter((row) => Number(row.value || 0) > 0).length;
  const maxValue = Math.max(1, ...rows.map((row) => Number(row.value || 0)));

  function polarToCartesian(radius, angleDeg) {
    const angle = (Math.PI / 180) * angleDeg;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  }

  function arcPath(startDeg, endDeg) {
    const startOuter = polarToCartesian(rOuter, startDeg);
    const endOuter = polarToCartesian(rOuter, endDeg);
    const startInner = polarToCartesian(rInner, endDeg);
    const endInner = polarToCartesian(rInner, startDeg);
    const largeArcFlag = endDeg - startDeg > 180 ? 1 : 0;

    return [
      `M ${startOuter.x} ${startOuter.y}`,
      `A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}`,
      `L ${startInner.x} ${startInner.y}`,
      `A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${endInner.x} ${endInner.y}`,
      "Z",
    ].join(" ");
  }

  return (
    <div style={{ display: "grid", gap: 12, justifyItems: "center" }}>
      <svg width="100%" viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: 360, overflow: "visible" }}>
        {rows.map((row, idx) => {
          const segmentStart = 180 + idx * (180 / rows.length);
          const segmentEnd = 180 + (idx + 1) * (180 / rows.length);
          const value = Number(row.value || 0);
          const intensity = value / maxValue;
          const fill = value > 0 ? COLORS[idx % COLORS.length] : "rgba(255,255,255,0.08)";
          const labelAngle = (segmentStart + segmentEnd) / 2;
          const labelPoint = polarToCartesian(rOuter + 20, labelAngle);
          const countPoint = polarToCartesian((rOuter + rInner) / 2, labelAngle);

          return (
            <g key={`${row.label}-${idx}`}>
              <path
                d={arcPath(segmentStart + 0.8, segmentEnd - 0.8)}
                fill={fill}
                fillOpacity={value > 0 ? 0.35 + intensity * 0.45 : 1}
                stroke={fill}
                strokeOpacity={value > 0 ? 0.85 : 0.2}
                strokeWidth="1"
              />
              <text x={countPoint.x} y={countPoint.y + 4} textAnchor="middle" fontSize="12" fontWeight="900" fill="#ffffff">
                {value}
              </text>
              <text x={labelPoint.x} y={labelPoint.y} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.72)">
                {row.label.slice(0, 2)}
              </text>
            </g>
          );
        })}

        <text x={cx} y={cy - 28} textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.65)">
          Hourly Starts
        </text>
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="26" fontWeight="900" fill="#ffffff">
          {total}
        </text>
        <text x={cx} y={cy + 20} textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.65)">
          {activeHours} active hours
        </text>
      </svg>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 10,
          width: "100%",
        }}
      >
        <KpiCard label="12h Total" value={formatNumber(total)} tone="warn" />
        <KpiCard label="Peak Hour" value={formatNumber(maxValue)} tone="accent" />
      </div>
    </div>
  );
}

function ShiftLossCompare({ rows }) {
  const maxValue = Math.max(
    1,
    ...rows.flatMap((row) => [
      Number(row.systemUnplannedMin || 0),
      Number(row.manualUnplannedMin || 0),
      Number(row.unplannedMergedMin || 0),
      Number(row.operatingMin || 0),
    ])
  );

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {rows.map((row) => {
        const series = [
          { label: "System", value: row.systemUnplannedMin, color: PAGE.info },
          { label: "Manual", value: row.manualUnplannedMin, color: PAGE.purple },
          { label: "Total", value: row.unplannedMergedMin, color: PAGE.warn },
          { label: "Running", value: row.operatingMin, color: PAGE.success },
        ];

        return (
          <div
            key={row.shiftKey}
            style={{
              border: `1px solid ${PAGE.border}`,
              background: "rgba(255,255,255,0.03)",
              borderRadius: 14,
              padding: 12,
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <div style={{ color: PAGE.text, fontWeight: 900 }}>
                {SHIFT_META[row.shiftKey]?.label || row.shiftKey}
              </div>
              <div style={{ color: PAGE.subtext, fontSize: 12 }}>
                {formatPercent(row.downtimePctOfNet)} of {NET_WORK_MIN} min net
              </div>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {series.map((item) => (
                <div
                  key={`${row.shiftKey}-${item.label}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "72px minmax(0, 1fr) auto",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <div style={{ color: PAGE.subtext, fontSize: 12 }}>{item.label}</div>
                  <div
                    style={{
                      height: 10,
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.08)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${(Number(item.value || 0) / maxValue) * 100}%`,
                        height: "100%",
                        background: item.color,
                      }}
                    />
                  </div>
                  <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 12, whiteSpace: "nowrap" }}>
                    {item.value} min
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActiveDowntimeBoard({ rows, onFocus, onResume }) {
  if (!rows.length) {
    return <Typography sx={{ color: PAGE.subtext }}>No active downtime sessions right now.</Typography>;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {rows.map((row) => (
        <div
          key={row.id}
          style={{
            border: `1px solid ${PAGE.border}`,
            background: "rgba(255,255,255,0.03)",
            borderRadius: 16,
            padding: 12,
            display: "grid",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              gap: 10,
              alignItems: "start",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ color: PAGE.text, fontWeight: 900, lineHeight: 1.3, whiteSpace: "normal", overflowWrap: "break-word" }}>
                {row.unitName}
              </div>
              <div style={{ color: PAGE.subtext, fontSize: 12, marginTop: 4 }}>
                {row.stationName ? `Station ${row.stationName}` : "Unit Level"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <Chip size="small" label={row.category || "Downtime"} variant="outlined" color="warning" />
              <Chip size="small" label={row.severity || "LOW"} variant="outlined" color={severityChipColor(row.severity)} />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
            }}
          >
            <div>
              <div style={{ color: PAGE.muted, fontSize: 11 }}>Reason</div>
              <div style={{ color: PAGE.text, fontWeight: 800 }}>{row.reason || "—"}</div>
            </div>
            <div>
              <div style={{ color: PAGE.muted, fontSize: 11 }}>Started</div>
              <div style={{ color: PAGE.text, fontWeight: 800 }}>{formatTs(row.startISO)}</div>
            </div>
            <div>
              <div style={{ color: PAGE.muted, fontSize: 11 }}>Active Time</div>
              <div style={{ color: PAGE.text, fontWeight: 800 }}>{row.durationLabel}</div>
            </div>
            <div>
              <div style={{ color: PAGE.muted, fontSize: 11 }}>Shift</div>
              <div style={{ color: PAGE.text, fontWeight: 800 }}>{row.shiftKey ? `Shift ${row.shiftKey}` : "—"}</div>
            </div>
          </div>

          {row.text ? (
            <div
              style={{
                border: `1px solid ${PAGE.borderSoft}`,
                background: "rgba(255,255,255,0.02)",
                borderRadius: 12,
                padding: 10,
                color: PAGE.subtext,
                fontSize: 12,
                lineHeight: 1.45,
              }}
            >
              {row.text}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button variant="outlined" onClick={() => onFocus?.(row.unitId)}>
              Focus Unit
            </Button>
            <Button variant="outlined" color="warning" startIcon={<PlayCircleRoundedIcon />} onClick={() => onResume?.(row.unitId)}>
              Resume
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SessionHistory({
  sessionHistory,
  filteredHistory,
  search,
  setSearch,
  sevFilter,
  setSevFilter,
  catFilter,
  setCatFilter,
  onClear,
  onResetFilters,
  onClickItem,
  mobileSizing,
}) {
  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <Stack spacing={1.1} sx={{ width: "100%" }}>
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search unit / station / reason / category"
          fullWidth
          size={mobileSizing ? "medium" : "small"}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon />
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiInputBase-root": {
              bgcolor: "rgba(255,255,255,0.03)",
              borderRadius: 2,
            },
          }}
        />

        <Stack direction={mobileSizing ? "column" : "row"} spacing={1}>
          <FormControl size={mobileSizing ? "medium" : "small"} sx={{ flex: 1 }}>
            <Select value={sevFilter} onChange={(e) => setSevFilter(e.target.value)}>
              <MenuItem value="ALL">All Severities</MenuItem>
              <MenuItem value={SEVERITY.HIGH}>HIGH</MenuItem>
              <MenuItem value={SEVERITY.MED}>MED</MenuItem>
              <MenuItem value={SEVERITY.LOW}>LOW</MenuItem>
            </Select>
          </FormControl>

          <FormControl size={mobileSizing ? "medium" : "small"} sx={{ flex: 1 }}>
            <Select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <MenuItem value="ALL">All Categories</MenuItem>
              {["Maintenance", "Break", "Process"].map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
          <Button variant="outlined" onClick={onResetFilters} startIcon={<RestartAltRoundedIcon />}>
            Reset
          </Button>
          <Button variant="outlined" color="warning" onClick={onClear}>
            Clear Live History
          </Button>
        </Stack>
      </Stack>

      <Divider sx={{ my: 1.4, borderColor: PAGE.borderSoft }} />

      {filteredHistory.length === 0 ? (
        <Typography sx={{ color: PAGE.subtext, fontSize: mobileSizing ? 14 : 13 }}>
          {sessionHistory.length === 0 ? "No downtime sessions in the last 24 hours." : "No results for current filters."}
        </Typography>
      ) : (
        <Stack spacing={1.2}>
          {filteredHistory.map((n) => (
            <Paper
              key={n.id}
              elevation={0}
              onClick={() => onClickItem(n)}
              sx={{
                p: mobileSizing ? 1.4 : 1.2,
                borderRadius: 3,
                cursor: "pointer",
                bgcolor: "rgba(255,255,255,0.03)",
                border: `1px solid ${PAGE.borderSoft}`,
                transition: "transform 120ms ease, background 120ms ease, border-color 120ms ease",
                "&:hover": {
                  transform: "translateY(-1px)",
                  bgcolor: "rgba(255,255,255,0.045)",
                  borderColor: "rgba(255,255,255,0.12)",
                },
              }}
            >
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      sx={{
                        color: PAGE.text,
                        fontWeight: 900,
                        fontSize: mobileSizing ? 15 : 13,
                        lineHeight: 1.3,
                        whiteSpace: "normal",
                        overflowWrap: "break-word",
                      }}
                    >
                      {n.unitName || "—"}
                    </Typography>
                    <Typography sx={{ color: PAGE.subtext, fontSize: mobileSizing ? 13 : 12, lineHeight: 1.35 }}>
                      Downtime Session
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={0.8} sx={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <Chip
                      size="small"
                      label={n.status === "ACTIVE" ? "ACTIVE" : "CLOSED"}
                      color={n.status === "ACTIVE" ? "warning" : "default"}
                      variant="outlined"
                    />
                    <Chip size="small" label={n.severity || "—"} color={severityChipColor(n.severity)} variant="outlined" />
                  </Stack>
                </Stack>

                <Stack direction="row" spacing={0.8} sx={{ flexWrap: "wrap" }}>
                  {n.category ? <Chip size="small" label={n.category} variant="outlined" sx={{ color: PAGE.muted }} /> : null}
                  {n.reason ? <Chip size="small" label={n.reason} variant="outlined" sx={{ color: PAGE.muted }} /> : null}
                  {n.shiftKey ? <Chip size="small" label={`Shift ${n.shiftKey}`} variant="outlined" sx={{ color: PAGE.muted }} /> : null}
                </Stack>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: mobileSizing ? "1fr" : "repeat(2, minmax(0, 1fr))",
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography sx={{ color: PAGE.muted, fontSize: 11 }}>Start</Typography>
                    <Typography sx={{ color: PAGE.text, fontSize: 12 }}>{formatTs(n.startISO)}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: PAGE.muted, fontSize: 11 }}>End</Typography>
                    <Typography sx={{ color: PAGE.text, fontSize: 12 }}>{n.endISO ? formatTs(n.endISO) : "Still active"}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: PAGE.muted, fontSize: 11 }}>Duration</Typography>
                    <Typography sx={{ color: PAGE.text, fontWeight: 800, fontSize: 12 }}>{n.durationLabel}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: PAGE.muted, fontSize: 11 }}>Business Day</Typography>
                    <Typography sx={{ color: PAGE.text, fontSize: 12 }}>{n.businessDate || "—"}</Typography>
                  </Box>
                </Box>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}

function LabelTag3D({ text, dotColor, active, unitSize, zoomDist }) {
  const groupRef = useRef(null);

  const name = String(text || "UNIT");
  const mode = active ? "full" : "tiny";
  const shown = mode === "tiny" ? name.slice(0, 12) : name;

  const baseFont = mode === "tiny" ? 0.22 : 0.28;
  const charW = mode === "tiny" ? 0.14 : 0.16;
  const padX = mode === "tiny" ? 0.3 : 0.4;
  const padY = mode === "tiny" ? 0.18 : 0.22;

  const textW = clamp(shown.length * charW, 1.05, mode === "tiny" ? 2.6 : 5.2);
  const tagW = textW + padX;
  const tagH = baseFont + padY;

  const dist = zoomDist || 18;
  const sizeFactor = clamp(unitSize / 3.0, 0.95, 1.7);
  const zoomFactor = clamp(dist / 18, 0.75, 2.6);

  useFrame(() => {
    if (!groupRef.current) return;
    const base = active ? 1.12 : 0.95;
    const s = clamp((base / zoomFactor) * sizeFactor, 0.42, 1.35);
    groupRef.current.scale.setScalar(s);
  });

  const z = zoomDist || 18;
  const near = active ? 34 : 22;
  const far = active ? 64 : 42;
  const t = clamp((far - z) / (far - near), 0, 1);
  const opacity = clamp(0.2 + t * (active ? 0.8 : 0.72), 0.2, 1.0);

  return (
    <Billboard follow>
      <group ref={groupRef}>
        <mesh renderOrder={20}>
          <planeGeometry args={[tagW, tagH]} />
          <meshStandardMaterial color="#000000" transparent opacity={opacity * 0.34} depthTest={false} />
        </mesh>

        <mesh position={[0, 0, 0.001]} renderOrder={21}>
          <planeGeometry args={[tagW * 1.02, tagH * 1.1]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={opacity * 0.1} depthTest={false} />
        </mesh>

        <mesh position={[-tagW / 2 + 0.18, 0, 0.002]} renderOrder={22}>
          <circleGeometry args={[0.085, 18]} />
          <meshStandardMaterial color={dotColor} transparent opacity={opacity} depthTest={false} />
        </mesh>

        <Text
          position={[-tagW / 2 + 0.34, 0, 0.003]}
          anchorX="left"
          anchorY="middle"
          fontSize={baseFont}
          color="#ffffff"
          fillOpacity={opacity}
          outlineWidth={active ? 0.028 : 0.02}
          outlineOpacity={opacity * (active ? 0.45 : 0.3)}
          outlineColor="#000000"
          renderOrder={23}
          depthTest={false}
        >
          {shown}
        </Text>
      </group>
    </Billboard>
  );
}

function DowntimePulse({ w, h, enabled }) {
  const ringRef = useRef(null);

  useFrame((state) => {
    if (!ringRef.current) return;
    if (!enabled) {
      ringRef.current.visible = false;
      return;
    }

    ringRef.current.visible = true;
    const t = state.clock.getElapsedTime();
    const k = 0.88 + (Math.sin(t * 2.6) * 0.5 + 0.5) * 0.22;
    ringRef.current.scale.set(k, 1, k);
    ringRef.current.position.y = 0.08 + (Math.sin(t * 2.1) * 0.5 + 0.5) * 0.02;
  });

  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[Math.max(w, h) * 0.58, Math.max(w, h) * 0.72, 48]} />
      <meshStandardMaterial color={PAGE.warn} transparent opacity={0.34} emissive={PAGE.warn} emissiveIntensity={0.4} />
    </mesh>
  );
}

function UnitBox3D({ unit, isSelected, isHovered, onSelect, onHoverChange, zoomDist, isDowntimeHeld }) {
  const { x, y, w, h } = unit.layout;
  const height = 0.12;
  const borderUp = isSelected ? 0.03 : 0;

  const baseColor = statusColor(unit.status);
  const topColor = isDowntimeHeld ? PAGE.warn : baseColor;
  const unitSize = Math.max(w, h);
  const active = isSelected || isHovered || isDowntimeHeld;
  const lift = clamp(0.38 + unitSize * 0.07, 0.48, 0.95);

  return (
    <group position={[x + w / 2, 0, y + h / 2]}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(unit);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHoverChange(unit.id);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHoverChange(null);
        }}
      >
        <boxGeometry args={[w, height + borderUp, h]} />
        <meshStandardMaterial
          color={isSelected ? "#1f2937" : "#111827"}
          transparent
          opacity={0.96}
          emissive={isDowntimeHeld ? PAGE.warn : isHovered ? "#0ea5e9" : "#000000"}
          emissiveIntensity={isDowntimeHeld ? 0.22 : isHovered ? 0.18 : 0}
        />
      </mesh>

      <mesh position={[0, (height + borderUp) / 2 + 0.01, 0]}>
        <boxGeometry args={[w * 0.96, 0.02, h * 0.96]} />
        <meshStandardMaterial color={topColor} transparent opacity={0.94} />
      </mesh>

      <DowntimePulse w={w} h={h} enabled={!!isDowntimeHeld} />

      <group position={[0, lift, 0]}>
        <LabelTag3D text={unit.name} dotColor={topColor} active={active} unitSize={unitSize} zoomDist={zoomDist} />
      </group>
    </group>
  );
}

function StableControls({ target, isMobile, onControlsReady }) {
  const controlsRef = useRef(null);

  useEffect(() => {
    if (!controlsRef.current) return;
    controlsRef.current.target.set(target[0], target[1], target[2]);
    controlsRef.current.update();
    onControlsReady?.(controlsRef.current);
  }, [target, onControlsReady]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.55}
      zoomSpeed={isMobile ? 0.95 : 1.05}
      panSpeed={isMobile ? 0.85 : 0.95}
      enablePan
      screenSpacePanning
      maxPolarAngle={Math.PI / 2.05}
      minPolarAngle={0.4}
      maxDistance={isMobile ? 36 : 42}
      minDistance={isMobile ? 8.5 : 10}
    />
  );
}

function CadScene({
  units,
  selectedId,
  hoveredId,
  onHoverChange,
  onSelect,
  bounds,
  isMobile,
  onZoomUpdate,
  activeDowntimeMap,
  focusUnitId,
  onFocusDone,
}) {
  const target0 = useMemo(() => [bounds.cx, 0, bounds.cy], [bounds.cx, bounds.cy]);
  const { camera } = useThree();

  const controlsRef = useRef(null);
  const zoomDistRef = useRef(18);
  const lastSentRef = useRef(0);

  const focusAnimRef = useRef({
    active: false,
    t: 0,
    dur: 0.65,
    fromTarget: [0, 0, 0],
    toTarget: [0, 0, 0],
    fromCam: [0, 0, 0],
    toCam: [0, 0, 0],
  });

  const onControlsReady = useCallback((c) => {
    controlsRef.current = c;
  }, []);

  const easeInOut = (x) => {
    const t = clamp(x, 0, 1);
    return t * t * (3 - 2 * t);
  };

  useEffect(() => {
    if (!focusUnitId || !controlsRef.current) return;
    const u = units.find((x) => x.id === focusUnitId);
    if (!u) return;

    const tx = u.layout.x + u.layout.w / 2;
    const tz = u.layout.y + u.layout.h / 2;

    const c = controlsRef.current;
    const curT = [c.target.x, c.target.y, c.target.z];
    const curC = [camera.position.x, camera.position.y, camera.position.z];

    focusAnimRef.current = {
      active: true,
      t: 0,
      dur: 0.65,
      fromTarget: curT,
      toTarget: [tx, 0, tz],
      fromCam: curC,
      toCam: [tx, curC[1], tz + 14],
    };
  }, [camera.position.x, camera.position.y, camera.position.z, focusUnitId, units]);

  useFrame((state, delta) => {
    const dx = camera.position.x - target0[0];
    const dy = camera.position.y - target0[1];
    const dz = camera.position.z - target0[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    zoomDistRef.current = dist;

    const now = performance.now();
    if (now - lastSentRef.current > 120) {
      lastSentRef.current = now;
      onZoomUpdate(dist);
    }

    const anim = focusAnimRef.current;
    if (anim.active && controlsRef.current) {
      anim.t += delta;
      const k = easeInOut(anim.t / anim.dur);
      const lerp = (a, b) => a + (b - a) * k;

      controlsRef.current.target.set(
        lerp(anim.fromTarget[0], anim.toTarget[0]),
        lerp(anim.fromTarget[1], anim.toTarget[1]),
        lerp(anim.fromTarget[2], anim.toTarget[2])
      );

      camera.position.set(
        lerp(anim.fromCam[0], anim.toCam[0]),
        lerp(anim.fromCam[1], anim.toCam[1]),
        lerp(anim.fromCam[2], anim.toCam[2])
      );

      controlsRef.current.update();

      if (anim.t >= anim.dur) {
        anim.active = false;
        onFocusDone?.();
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.72} />
      <directionalLight position={[10, 12, 6]} intensity={0.85} />

      <Grid
        position={[bounds.cx, 0, bounds.cy]}
        args={[bounds.w + 16, bounds.h + 16]}
        cellSize={0.5}
        cellThickness={0.85}
        sectionSize={2}
        sectionThickness={1.25}
        fadeDistance={70}
        fadeStrength={1}
        infiniteGrid={false}
      />

      {units.map((u) => (
        <UnitBox3D
          key={u.id}
          unit={u}
          isSelected={u.id === selectedId}
          isHovered={u.id === hoveredId}
          onSelect={onSelect}
          onHoverChange={onHoverChange}
          zoomDist={zoomDistRef.current}
          isDowntimeHeld={!!activeDowntimeMap[u.id]}
        />
      ))}

      <StableControls target={target0} isMobile={isMobile} onControlsReady={onControlsReady} />
    </>
  );
}

function CadView({
  units,
  selectedId,
  hoveredId,
  onHoverChange,
  onSelect,
  heightPx,
  isMobile,
  onZoomUpdate,
  activeDowntimeMap,
  focusUnitId,
  onFocusDone,
}) {
  const bounds = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    units.forEach((u) => {
      const { x, y, w, h } = u.layout;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });

    const w = clamp(maxX - minX, 6, 160);
    const h = clamp(maxY - minY, 6, 160);

    return { w, h, cx: minX + w / 2, cy: minY + h / 2 };
  }, [units]);

  const headerH = 56;

  return (
    <Box
      sx={{
        border: `1px solid ${PAGE.border}`,
        background: PAGE.panel2,
        borderRadius: 3,
        overflow: "hidden",
        height: heightPx,
        minHeight: 0,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      }}
    >
      <Box
        sx={{
          height: headerH,
          px: 1.6,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          borderBottom: `1px solid ${PAGE.borderSoft}`,
          bgcolor: "rgba(255,255,255,0.02)",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 900, color: PAGE.text, lineHeight: 1.1 }} noWrap>
            Plant 3 — Downtime Center
          </Typography>
          <Typography sx={{ color: PAGE.subtext, fontSize: 12 }} noWrap>
            Shift-aligned downtime logic
          </Typography>
        </Box>

        <Typography sx={{ color: PAGE.subtext, fontSize: 12, whiteSpace: "nowrap" }}>Pan / Zoom / Rotate</Typography>
      </Box>

      <Box sx={{ height: `calc(100% - ${headerH}px)`, p: 1.2, boxSizing: "border-box", minHeight: 0 }}>
        <Box
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            height: "100%",
            border: `1px solid rgba(255,255,255,0.06)`,
            bgcolor: "rgba(0,0,0,0.18)",
          }}
        >
          <Canvas
            style={{ width: "100%", height: "100%" }}
            camera={{ position: [bounds.cx, 7.4, bounds.cy + 14], fov: 45 }}
            dpr={[1, 1.6]}
            onPointerMissed={() => onSelect(null)}
          >
            <CadScene
              units={units}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onHoverChange={onHoverChange}
              onSelect={onSelect}
              bounds={bounds}
              isMobile={isMobile}
              onZoomUpdate={onZoomUpdate}
              activeDowntimeMap={activeDowntimeMap}
              focusUnitId={focusUnitId}
              onFocusDone={onFocusDone}
            />
          </Canvas>
        </Box>
      </Box>
    </Box>
  );
}

export default function DowntimePage() {
  const rawUnits = useMemo(() => getPlant3Units(), []);

  const units = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    rawUnits.forEach((u) => {
      const { x, y, w, h } = u.layout;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const s = LAYOUT_SPREAD;

    return rawUnits.map((u) => {
      const { x, y, w, h } = u.layout;
      const nx = cx + (x - cx) * s;
      const ny = cy + (y - cy) * s;
      return { ...u, layout: { ...u.layout, x: nx, y: ny, w, h } };
    });
  }, [rawUnits]);

  const isMobile = useMediaQuery("(max-width: 900px)");
  const isTablet = useMediaQuery("(min-width: 901px) and (max-width: 1279px)");

  const { unread, log, pushAlarm, clearAll, startEngine } = useAlarmCenter();

  useEffect(() => {
    startEngine?.();
  }, [startEngine]);

  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [zoomDist, setZoomDist] = useState(null);
  const [focusUnitId, setFocusUnitId] = useState(null);

  const selectedUnit = useMemo(() => units.find((u) => u.id === selectedId) || null, [units, selectedId]);

  const [dtCategoryCode, setDtCategoryCode] = useState("");
  const [dtReasonCode, setDtReasonCode] = useState("");
  const [dtDetails, setDtDetails] = useState("");

  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("ALL");
  const [catFilter, setCatFilter] = useState("ALL");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [desktopSortKey, setDesktopSortKey] = useState("minutes");

  const selectedCategory = useMemo(
    () => DOWNTIME_CATALOG.find((c) => c.code === dtCategoryCode) || null,
    [dtCategoryCode]
  );

  const reasonsForCategory = useMemo(() => selectedCategory?.reasons || [], [selectedCategory]);

  const { liveLog, activeDowntimeMap, openDowntimeStartMap, sessionHistory } = useMemo(
    () => deriveDowntimeState(log || []),
    [log]
  );

  const canonicalEntries = useMemo(() => buildCanonicalEntriesFromSessions(sessionHistory), [sessionHistory]);

  const alignedAnalytics = useMemo(
    () => buildDowntimeAnalytics(canonicalEntries.systemEntries, canonicalEntries.manualEntries),
    [canonicalEntries]
  );

  const sessionAnalytics = useMemo(
    () => buildSessionAnalytics(sessionHistory, activeDowntimeMap, liveLog),
    [sessionHistory, activeDowntimeMap, liveLog]
  );

  const activeHoldIds = useMemo(() => Object.keys(activeDowntimeMap), [activeDowntimeMap]);

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();

    return sessionHistory.filter((n) => {
      const sevOk = sevFilter === "ALL" ? true : n.severity === sevFilter;
      const catOk = catFilter === "ALL" ? true : n.category === catFilter;
      const text = [n.unitName, n.stationName, n.category, n.reason, n.shiftKey, n.sourceType, n.businessDate]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const qOk = q.length === 0 ? true : text.includes(q);
      return sevOk && catOk && qOk;
    });
  }, [sessionHistory, search, sevFilter, catFilter]);

  const selectedUnitDetail = useMemo(() => {
    if (!selectedUnit) return null;
    const unitSessions = sessionHistory.filter((n) => n.unitId === selectedUnit.id);
    const unitEntries = buildCanonicalEntriesFromSessions(unitSessions);
    const unitAnalytics = buildDowntimeAnalytics(unitEntries.systemEntries, unitEntries.manualEntries);
    const latest = [...unitSessions].sort((a, b) => Date.parse(b.startISO || 0) - Date.parse(a.startISO || 0))[0] || null;

    return {
      totalSessions: unitSessions.length,
      activeSessions: unitSessions.filter((n) => n.status === "ACTIVE").length,
      closedSessions: unitSessions.filter((n) => n.status === "CLOSED").length,
      daily: unitAnalytics.daily,
      topReason: unitAnalytics.daily.reasonsUnplannedMerged?.[0]?.label || "—",
      topCategory: unitAnalytics.daily.categoriesUnplannedMerged?.[0]?.label || "—",
      latest,
    };
  }, [selectedUnit, sessionHistory]);

  const unitComparisonRows = useMemo(() => {
    const rows = [...sessionAnalytics.byUnit];
    if (desktopSortKey === "active") {
      rows.sort((a, b) => b.activeCount - a.activeCount);
    } else if (desktopSortKey === "count") {
      rows.sort((a, b) => b.count - a.count);
    } else {
      rows.sort((a, b) => b.totalMinutes - a.totalMinutes);
    }
    return rows;
  }, [sessionAnalytics.byUnit, desktopSortKey]);

  const activeRows = useMemo(
    () => sessionHistory.filter((n) => n.status === "ACTIVE").sort((a, b) => Number(b.durationMs || 0) - Number(a.durationMs || 0)),
    [sessionHistory]
  );

  const openDowntimeDialog = useCallback((unit) => {
    if (!unit) return;
    setSelectedId(unit.id);
    setDtCategoryCode("");
    setDtReasonCode("");
    setDtDetails("");
  }, []);

  const applyDowntimeStart = useCallback(
    async ({ unit, category, reason, details }) => {
      const tsISO = new Date().toISOString();

      const event = buildEventPayload({
        unit,
        tsISO,
        eventType: EVENT_TYPE.DT_START,
        severity: category.severity,
        category: category.group,
        categoryCode: category.code,
        reason: reason.label,
        reasonCode: reason.code,
        text: details?.trim() || `${category.group}: ${reason.label}`,
        sourceType: SOURCE_TYPE.OPERATOR,
      });

      try {
        await postDowntimeStart({
          payload: {
            unitId: event.unitId,
            unitName: event.unitName,
            stationId: event.stationId,
            stationName: event.stationName,
            scopeType: event.scopeType,
            tsISO: event.tsISO,
            businessDate: event.businessDate,
            shiftKey: event.shiftKey,
            categoryCode: event.categoryCode,
            reasonCode: event.reasonCode,
            sourceType: event.sourceType,
          },
        });
      } catch {
        // keep UI responsive
      }

      pushAlarm(event);
      setFocusUnitId(unit.id);
      setSelectedId(null);
      setDtCategoryCode("");
      setDtReasonCode("");
      setDtDetails("");
    },
    [pushAlarm]
  );

  const applyDowntimeEnd = useCallback(
    async (unitId) => {
      const unit = units.find((u) => u.id === unitId);
      if (!unit) return;

      const startEvent = openDowntimeStartMap[unitId] || null;
      const tsISO = new Date().toISOString();
      const durationMs = startEvent?.tsISO ? Math.max(0, Date.parse(tsISO) - Date.parse(startEvent.tsISO)) : 0;

      const event = buildEventPayload({
        unit,
        tsISO,
        eventType: EVENT_TYPE.DT_END,
        severity: SEVERITY.LOW,
        category: startEvent?.category || "Resume",
        categoryCode: "RESUME",
        reason: startEvent?.reason || "Downtime Cleared",
        reasonCode: "DT_CLEARED",
        text: `Downtime cleared. Total stop time ${formatDurationMs(durationMs)}.`,
        sourceType: SOURCE_TYPE.OPERATOR,
        linkedEventId: startEvent?.id || null,
      });

      try {
        await postDowntimeEnd({
          payload: {
            unitId: event.unitId,
            unitName: event.unitName,
            stationId: event.stationId,
            stationName: event.stationName,
            scopeType: event.scopeType,
            tsISO: event.tsISO,
            businessDate: event.businessDate,
            shiftKey: event.shiftKey,
            linkedEventId: event.linkedEventId,
            durationMs,
            sourceType: event.sourceType,
          },
        });
      } catch {
        // keep UI responsive
      }

      pushAlarm(event);
    },
    [openDowntimeStartMap, pushAlarm, units]
  );

  const handleSubmitDowntime = useCallback(() => {
    if (!selectedUnit || !selectedCategory || !dtReasonCode) return;
    const reason = selectedCategory.reasons.find((item) => item.code === dtReasonCode);
    if (!reason) return;

    if (activeDowntimeMap[selectedUnit.id]) {
      setSelectedId(null);
      return;
    }

    applyDowntimeStart({
      unit: selectedUnit,
      category: selectedCategory,
      reason,
      details: dtDetails,
    });
  }, [selectedUnit, selectedCategory, dtReasonCode, dtDetails, activeDowntimeMap, applyDowntimeStart]);

  const pad = isMobile ? 12 : isTablet ? 14 : 18;
  const framePad = isMobile ? 10 : isTablet ? 12 : 14;
  const canvasH = isMobile ? 560 : isTablet ? 640 : 760;
  const gridCols = isTablet || isMobile ? "1fr" : "minmax(0, 1.35fr) minmax(420px, 0.95fr)";

  const frameSx = useMemo(
    () => ({
      minHeight: "100dvh",
      width: "100%",
      bgcolor: PAGE.bg,
      color: PAGE.text,
      boxSizing: "border-box",
      p: `${pad}px`,
      pb: `calc(${pad}px + env(safe-area-inset-bottom, 0px))`,
      pt: `calc(${pad}px + env(safe-area-inset-top, 0px))`,
      overflowX: "hidden",
    }),
    [pad]
  );

  return (
    <Box sx={frameSx}>
      <Box
        sx={{
          width: "100%",
          maxWidth: 1560,
          mx: "auto",
          display: "grid",
          gap: 1.5,
        }}
      >
        <Box sx={{ display: "grid", gap: 0.5 }}>
          <Typography sx={{ color: PAGE.text, fontWeight: 900, fontSize: isMobile ? 22 : 24 }}>
            Downtime Center
          </Typography>
          <Typography sx={{ color: PAGE.subtext }}>
            Shift-aligned downtime analytics with the same logic path as DevicesPage.
          </Typography>
        </Box>

        <SectionGrid min={180} gap={10}>
          <KpiCard
            label="Daily Unplanned Total"
            value={formatMinutes(alignedAnalytics.daily.unplannedMergedMin)}
            subvalue={`24h total ${DAILY_TOTAL_MIN} min`}
            tone="warn"
          />
          <KpiCard
            label="Daily Downtime %"
            value={formatPercent(alignedAnalytics.daily.downtimePctOfNet)}
            subvalue={`On ${DAILY_NET_WORK_MIN} min net`}
            tone={pickToneByMinutes(alignedAnalytics.daily.unplannedMergedMin)}
          />
          <KpiCard
            label="Daily Running"
            value={formatMinutes(alignedAnalytics.daily.operatingMin)}
            subvalue={`Planned ${formatMinutes(alignedAnalytics.daily.plannedMin)}`}
            tone="success"
          />
          <KpiCard
            label="System Unplanned"
            value={formatMinutes(alignedAnalytics.daily.systemUnplannedMin)}
            subvalue="Merged into daily total"
            tone="info"
          />
          <KpiCard
            label="Manual Unplanned"
            value={formatMinutes(alignedAnalytics.daily.manualUnplannedMin)}
            subvalue="Operator / team lead source"
            tone="purple"
          />
          <KpiCard
            label="Reconciliation"
            value={
              alignedAnalytics.reconciliation.reconciliationStatus === "within_tolerance"
                ? "Synced"
                : alignedAnalytics.reconciliation.reconciliationStatus === "outside_tolerance"
                ? "Review"
                : alignedAnalytics.reconciliation.reconciliationStatus === "system_only"
                ? "System Only"
                : alignedAnalytics.reconciliation.reconciliationStatus === "manual_only"
                ? "Manual Only"
                : "Balanced"
            }
            subvalue={`Variance ${formatMinutes(alignedAnalytics.reconciliation.varianceMin)} / tolerance ${formatMinutes(
              alignedAnalytics.reconciliation.toleranceMin
            )}`}
            tone={alignedAnalytics.reconciliation.withinTolerance ? "success" : "warn"}
          />
        </SectionGrid>

        <SectionGrid min={220} gap={10}>
          {["Maintenance", "Break", "Process"].map((item) => (
            <Card
              key={item}
              title={item}
              subtitle="24h category count"
              tone={item === "Maintenance" ? "danger" : item === "Process" ? "warn" : "accent"}
              right={
                <div
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    border: `1px solid ${PAGE.border}`,
                    background: "rgba(255,255,255,0.05)",
                    color: PAGE.text,
                  }}
                >
                  <CategoryRoundedIcon fontSize="small" />
                </div>
              }
            >
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 22 }}>
                  {formatNumber(sessionAnalytics.byCategory.find((x) => x.label === item)?.value || 0)}
                </div>
                <div style={{ color: PAGE.subtext, fontSize: 12 }}>Sessions in the last 24h</div>
              </div>
            </Card>
          ))}
        </SectionGrid>

        <Box
          sx={{
            width: "100%",
            border: `1px solid ${PAGE.borderSoft}`,
            borderRadius: 4,
            bgcolor: "rgba(255,255,255,0.015)",
            boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
            overflow: "hidden",
          }}
        >
          <Box sx={{ p: `${framePad}px`, boxSizing: "border-box" }}>
            <Box
              sx={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: gridCols,
                gap: `${framePad}px`,
                alignItems: "stretch",
                minHeight: 0,
              }}
            >
              <Box sx={{ minHeight: 0, minWidth: 0 }}>
                <CadView
                  units={units}
                  selectedId={selectedId}
                  hoveredId={hoveredId}
                  onHoverChange={setHoveredId}
                  onSelect={openDowntimeDialog}
                  heightPx={canvasH}
                  isMobile={isMobile}
                  onZoomUpdate={setZoomDist}
                  activeDowntimeMap={activeDowntimeMap}
                  focusUnitId={focusUnitId}
                  onFocusDone={() => setFocusUnitId(null)}
                />

                <Box
                  sx={{
                    mt: 1.2,
                    px: 0.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.2,
                    flexWrap: "wrap",
                    color: PAGE.subtext,
                    fontSize: 12,
                  }}
                >
                  <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                    <span>Zoom: {zoomDist ? Math.round(zoomDist) : "—"}</span>
                    <span>Units: {units.length}</span>
                    <span>Active DT: {activeHoldIds.length}</span>
                    <span>24h Sessions: {sessionHistory.length}</span>
                    <span>24h Buffer: {liveLog.length}</span>
                    <span>Unread: {unread}</span>
                  </Box>

                  <Stack direction="row" spacing={1} alignItems="center">
                    {isMobile ? (
                      <Tooltip title="Open history" arrow>
                        <IconButton
                          size="small"
                          onClick={() => setHistoryOpen(true)}
                          sx={{
                            color: "rgba(255,255,255,0.78)",
                            border: `1px solid ${PAGE.borderSoft}`,
                            borderRadius: 2,
                            bgcolor: "rgba(255,255,255,0.03)",
                          }}
                        >
                          <HistoryRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}

                    <Tooltip title="Reset filters" arrow>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSearch("");
                          setSevFilter("ALL");
                          setCatFilter("ALL");
                        }}
                        sx={{
                          color: "rgba(255,255,255,0.78)",
                          border: `1px solid ${PAGE.borderSoft}`,
                          borderRadius: 2,
                          bgcolor: "rgba(255,255,255,0.03)",
                        }}
                      >
                        <RestartAltRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              </Box>

              <Box sx={{ display: "grid", gap: 1.2, minWidth: 0, alignContent: "start" }}>
                <Card
                  title="Active Downtime Board"
                  subtitle="Open downtime sessions"
                  tone="danger"
                  right={<div style={{ color: PAGE.subtext, fontWeight: 800, fontSize: 12 }}>{formatNumber(activeRows.length)} active</div>}
                >
                  <ActiveDowntimeBoard
                    rows={activeRows.slice(0, 6)}
                    onFocus={(unitId) => setFocusUnitId(unitId)}
                    onResume={(unitId) => applyDowntimeEnd(unitId)}
                  />
                </Card>

                <Card title="Hourly Downtime Arc" subtitle="12 hours • each segment = 1 hour" tone="warn">
                  <HalfDonutHourlyChart rows={sessionAnalytics.hourlyTrend} />
                </Card>
              </Box>
            </Box>
          </Box>
        </Box>

        <SectionGrid min={360}>
          <Card title="Shift Totals / Daily Mix" subtitle="Same logic path as DevicesPage" tone="accent">
            <SectionGrid min={145} gap={10}>
              <KpiCard label="Shift Length" value={formatMinutes(SHIFT_TOTAL_MIN)} subvalue="Per shift" tone="default" />
              <KpiCard label="Planned / Shift" value={formatMinutes(PLANNED_BREAK_MIN)} subvalue="Break bucket" tone="accent" />
              <KpiCard label="Net / Shift" value={formatMinutes(NET_WORK_MIN)} subvalue="Operational base" tone="success" />
              <KpiCard label="Day Length" value={formatMinutes(DAILY_TOTAL_MIN)} subvalue="3 shifts" tone="default" />
              <KpiCard label="Planned / Day" value={formatMinutes(PLANNED_BREAK_MIN * 3)} subvalue="3x planned" tone="accent" />
              <KpiCard label="Net / Day" value={formatMinutes(DAILY_NET_WORK_MIN)} subvalue="For daily %" tone="success" />
            </SectionGrid>

            <div style={{ marginTop: 14 }}>
              <ShiftLossCompare rows={alignedAnalytics.byShiftList} />
            </div>
          </Card>

          <Card title="Daily Category Mix" subtitle="All 3 shifts merged" tone="success">
            <LegendList items={alignedAnalytics.daily.categoriesUnplannedMerged} suffix=" min" />
          </Card>
        </SectionGrid>

        <SectionGrid min={360}>
          <Card
            title="Top Units by Downtime Impact"
            subtitle="Which units are generating the biggest downtime load"
            tone="accent"
            right={
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                <SortButton active={desktopSortKey === "minutes"} onClick={() => setDesktopSortKey("minutes")}>
                  Minutes
                </SortButton>
                <SortButton active={desktopSortKey === "count"} onClick={() => setDesktopSortKey("count")}>
                  Count
                </SortButton>
                <SortButton active={desktopSortKey === "active"} onClick={() => setDesktopSortKey("active")}>
                  Active
                </SortButton>
              </Stack>
            }
          >
            <HorizontalBarChart
              rows={unitComparisonRows.map((row) => ({
                ...row,
                label: row.label,
                value: desktopSortKey === "count" ? row.count : desktopSortKey === "active" ? row.activeCount : row.totalMinutes,
              }))}
              valueKey="value"
              unit={desktopSortKey === "minutes" ? " min" : ""}
              onRowClick={(row) => setFocusUnitId(row.id)}
            />
          </Card>

          <Card title="Top Downtime Reasons" subtitle="Daily merged reason minutes" tone="warn">
            <HorizontalBarChart
              rows={alignedAnalytics.daily.reasonsUnplannedMerged.map((row) => ({
                ...row,
                value: row.value,
              }))}
              valueKey="value"
              unit=" min"
            />
          </Card>
        </SectionGrid>

        <SectionGrid min={360}>
          <Card title="Operational Insight" subtitle="Lightweight exact summary instead of heavy history card" tone="purple">
            <div style={{ display: "grid", gap: 12 }}>
              <InfoLine label="Daily Total" value={formatMinutes(alignedAnalytics.daily.unplannedMergedMin)} />
              <InfoLine label="Daily %" value={formatPercent(alignedAnalytics.daily.downtimePctOfNet)} />
              <InfoLine label="Running Today" value={formatMinutes(alignedAnalytics.daily.operatingMin)} />
              <InfoLine label="Top Category" value={alignedAnalytics.daily.categoriesUnplannedMerged?.[0]?.label || "—"} />
              <InfoLine label="Top Reason" value={alignedAnalytics.daily.reasonsUnplannedMerged?.[0]?.label || "—"} />
              <InfoLine
                label="Last Manual"
                value={
                  alignedAnalytics.reconciliation.lastManualEntry
                    ? formatTs(
                        alignedAnalytics.reconciliation.lastManualEntry.endedAt ||
                          alignedAnalytics.reconciliation.lastManualEntry.startedAt
                      )
                    : "—"
                }
              />
              <InfoLine
                label="Last System"
                value={
                  alignedAnalytics.reconciliation.lastSystemEntry
                    ? formatTs(
                        alignedAnalytics.reconciliation.lastSystemEntry.endedAt ||
                          alignedAnalytics.reconciliation.lastSystemEntry.startedAt
                      )
                    : "—"
                }
              />
              <InfoLine label="Reconciliation" value={alignedAnalytics.reconciliation.reconciliationStatus} />
            </div>
          </Card>

          <Card title="Selected Unit Detail" subtitle="Unit-focused downtime summary" tone="default">
            {!selectedUnit ? (
              <Typography sx={{ color: PAGE.subtext }}>Select a unit from the 3D map.</Typography>
            ) : (
              <Box sx={{ display: "grid", gap: 1.5 }}>
                <SectionGrid min={145} gap={10}>
                  <KpiCard label="DT Sessions" value={formatNumber(selectedUnitDetail?.totalSessions || 0)} tone="accent" />
                  <KpiCard
                    label="Active"
                    value={formatNumber(selectedUnitDetail?.activeSessions || 0)}
                    tone={pickToneByCount(selectedUnitDetail?.activeSessions || 0)}
                  />
                  <KpiCard label="Closed" value={formatNumber(selectedUnitDetail?.closedSessions || 0)} tone="success" />
                  <KpiCard label="Unit Total" value={formatMinutes(selectedUnitDetail?.daily?.unplannedMergedMin || 0)} tone="warn" />
                </SectionGrid>

                <Box
                  sx={{
                    border: `1px solid ${PAGE.border}`,
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 2.5,
                    p: 1.75,
                    display: "grid",
                    gap: 1.1,
                  }}
                >
                  <InfoLine label="Unit" value={selectedUnit?.name} />
                  <InfoLine label="Top Category" value={selectedUnitDetail?.topCategory} />
                  <InfoLine label="Top Reason" value={selectedUnitDetail?.topReason} />
                  <InfoLine label="Daily %" value={formatPercent(selectedUnitDetail?.daily?.downtimePctOfNet || 0)} />
                  <InfoLine label="Latest Status" value={selectedUnitDetail?.latest?.status || "—"} />
                  <InfoLine label="Latest Start" value={formatTs(selectedUnitDetail?.latest?.startISO)} />
                  <InfoLine
                    label="Latest End"
                    value={selectedUnitDetail?.latest?.endISO ? formatTs(selectedUnitDetail?.latest?.endISO) : "Still active"}
                  />
                </Box>
              </Box>
            )}
          </Card>
        </SectionGrid>
      </Box>

      <Drawer
        anchor="bottom"
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: PAGE.panel,
            color: PAGE.text,
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            borderTop: `1px solid ${PAGE.border}`,
            height: "86dvh",
            width: "100%",
            overflow: "hidden",
          },
        }}
      >
        <Box
          sx={{
            p: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            borderBottom: `1px solid ${PAGE.borderSoft}`,
            bgcolor: "rgba(255,255,255,0.02)",
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 900, fontSize: 15 }} noWrap>
              Downtime Sessions
            </Typography>
            <Typography sx={{ color: PAGE.subtext, fontSize: 12 }} noWrap>
              Last 24 hours
            </Typography>
          </Box>

          <IconButton
            size="small"
            onClick={() => setHistoryOpen(false)}
            sx={{
              color: "rgba(255,255,255,0.8)",
              border: `1px solid ${PAGE.borderSoft}`,
              borderRadius: 2,
              bgcolor: "rgba(255,255,255,0.03)",
            }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ p: 1.5, height: "calc(86dvh - 64px)", overflow: "auto" }}>
          <SessionHistory
            sessionHistory={sessionHistory}
            filteredHistory={filteredHistory}
            search={search}
            setSearch={setSearch}
            sevFilter={sevFilter}
            setSevFilter={setSevFilter}
            catFilter={catFilter}
            setCatFilter={setCatFilter}
            onClear={clearAll}
            onResetFilters={() => {
              setSearch("");
              setSevFilter("ALL");
              setCatFilter("ALL");
            }}
            onClickItem={(n) => {
              if (n?.unitId) setFocusUnitId(n.unitId);
              setHistoryOpen(false);
            }}
            mobileSizing
          />
        </Box>
      </Drawer>

      <Dialog open={!!selectedUnit} onClose={() => setSelectedId(null)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Start Downtime — {selectedUnit?.name || "—"}</Typography>

          <Typography sx={{ color: "text.secondary", fontSize: 13, mb: 1 }}>
            This workflow is only for formal downtime entry and resume tracking.
          </Typography>

          <Divider sx={{ mb: 2 }} />

          <Typography sx={{ fontWeight: 800, fontSize: 13, mb: 1 }}>Category</Typography>
          <Select
            value={dtCategoryCode}
            onChange={(e) => {
              setDtCategoryCode(e.target.value);
              setDtReasonCode("");
            }}
            fullWidth
          >
            {DOWNTIME_CATALOG.map((c) => (
              <MenuItem key={c.code} value={c.code}>
                {c.group}
              </MenuItem>
            ))}
          </Select>

          <Typography sx={{ fontWeight: 800, fontSize: 13, mt: 2, mb: 1 }}>Reason</Typography>
          <Select value={dtReasonCode} onChange={(e) => setDtReasonCode(e.target.value)} fullWidth disabled={!dtCategoryCode}>
            {reasonsForCategory.map((r) => (
              <MenuItem key={r.code} value={r.code}>
                {r.label}
              </MenuItem>
            ))}
          </Select>

          <Typography sx={{ fontWeight: 800, fontSize: 13, mt: 2, mb: 1 }}>Explanation / Details</Typography>
          <TextField
            value={dtDetails}
            onChange={(e) => setDtDetails(e.target.value)}
            placeholder="Optional operator note"
            fullWidth
            multiline
            minRows={3}
          />

          <Stack direction="row" spacing={1.2} sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={() => setSelectedId(null)} sx={{ flex: 1 }}>
              Close
            </Button>
            <Button
              variant="contained"
              color="warning"
              startIcon={<PauseCircleRoundedIcon />}
              onClick={handleSubmitDowntime}
              sx={{ flex: 1 }}
              disabled={!dtCategoryCode || !dtReasonCode}
            >
              Start Downtime
            </Button>
          </Stack>

          {selectedUnit?.id && activeDowntimeMap[selectedUnit.id] ? (
            <Box sx={{ mt: 1.5, color: "text.secondary", fontSize: 12 }}>
              This unit is already in downtime. Use Resume from the Active Downtime Board.
            </Box>
          ) : null}
        </Box>
      </Dialog>
    </Box>
  );
}