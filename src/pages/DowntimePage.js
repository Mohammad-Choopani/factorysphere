// src/pages/DowntimePage.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Paper,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  useMediaQuery,
  Button,
} from "@mui/material";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Billboard, Text } from "@react-three/drei";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  LabelList,
  LineChart,
  Line,
  Area,
  CartesianGrid,
  ComposedChart,
} from "recharts";

import { getPlant3Units } from "../data/mock/plant3.units.mock";
import { useAlarmCenter, EVENT_TYPE } from "../state/alarmCenter.store";

const LAYOUT_SPREAD = 1.34;

// Persisted downtime memory (independent from live alarm history)
const DT_PERSIST_KEY = "FS_DOWNTIME_MEMORY_V1";

const PAGE = {
  bg: "#0b0f14",
  panel: "#111826",
  panel2: "#0f1623",
  border: "rgba(255,255,255,0.10)",
  borderSoft: "rgba(255,255,255,0.08)",
  text: "rgba(255,255,255,0.92)",
  subtext: "rgba(255,255,255,0.65)",
  muted: "rgba(255,255,255,0.52)",
};

const COLOR_GREEN = "#22c55e";
const COLOR_RED = "#ef4444";
const COLOR_YELLOW = "#f59e0b";

/* ------------------- utils ------------------- */

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function baseLineColor(status) {
  return status === "RUNNING" ? COLOR_GREEN : COLOR_RED;
}

function toLocalDT(tsISO) {
  try {
    const d = new Date(tsISO);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

function normalizeText(x) {
  return String(x || "").trim();
}

function startOfDayLocal(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDayLocal(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}
function clipIntervalMs(aStart, aEnd, bStart, bEnd) {
  const s = Math.max(aStart.getTime(), bStart.getTime());
  const e = Math.min(aEnd.getTime(), bEnd.getTime());
  return Math.max(0, e - s);
}

function msToMinutes(ms) {
  return Math.max(0, Math.round(Number(ms || 0) / 60000));
}

function formatMinutes(m) {
  const mm = Math.max(0, Math.round(Number(m || 0)));
  if (mm < 60) return `${mm}m`;
  const h = Math.floor(mm / 60);
  const r = mm % 60;
  return `${h}h ${r}m`;
}

function safeISO(ms) {
  try {
    return new Date(ms).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function softHash(seedStr) {
  const s = String(seedStr || "");
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h >>> 0;
}
function paletteIdx(seedStr) {
  return softHash(seedStr) % 10;
}

function makeLocal(d, hh, mm, ss = 0, ms = 0) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm, ss, ms);
}

function getShiftWindowsForDay(dayLocal) {
  const day0 = startOfDayLocal(dayLocal);

  const A = { key: "A", label: "Shift A", start: makeLocal(day0, 6, 0), end: makeLocal(day0, 14, 0) };
  const B = { key: "B", label: "Shift B", start: makeLocal(day0, 14, 0), end: makeLocal(day0, 22, 0) };

  const C_start = makeLocal(day0, 22, 0);
  const nextDay0 = new Date(day0);
  nextDay0.setDate(nextDay0.getDate() + 1);
  const C_end = makeLocal(nextDay0, 6, 0);

  const C = { key: "C", label: "Shift C", start: C_start, end: C_end };

  return [A, B, C];
}

function minutesOfDay(d) {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

function fmtHHMM(min) {
  const m = Math.max(0, Math.min(1440, Math.round(min)));
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/* -------------------------------------------------------
   OPTION B CORE:
   Downtime = Alarm-based (aligned with Live Alarm)
-------------------------------------------------------- */

function getEventTsMs(e) {
  const ms = toLocalDT(e?.tsISO)?.getTime();
  return Number.isFinite(ms) ? ms : NaN;
}

function isAlarmOnEvent(e) {
  const raw = e || {};
  const et = String(raw?.eventType || "").toUpperCase();

  if (raw?.isActive === true || raw?.active === true) return true;
  if (raw?.cleared === true || raw?.isCleared === true) return false;

  if (et.includes("ALARM") && (et.includes("ON") || et.includes("START") || et.includes("ACTIVE") || et.includes("RAISE"))) return true;
  if (et.includes("ON") || et.includes("START") || et.includes("ACTIVE") || et.includes("RAISE")) return true;

  if (raw?.eventType === EVENT_TYPE?.DT_START) return true;

  return false;
}

function isAlarmOffEvent(e) {
  const raw = e || {};
  const et = String(raw?.eventType || "").toUpperCase();

  if (raw?.cleared === true || raw?.isCleared === true) return true;
  if (raw?.isActive === true || raw?.active === true) return false;

  if (et.includes("ALARM") && (et.includes("OFF") || et.includes("END") || et.includes("CLEAR") || et.includes("RESOLVE"))) return true;
  if (et.includes("OFF") || et.includes("END") || et.includes("CLEAR") || et.includes("RESOLVE")) return true;

  if (raw?.eventType === EVENT_TYPE?.DT_END) return true;

  return false;
}

function buildActiveAlarmMapFromSessions(sessions, nowMs) {
  const map = {};
  for (const s of sessions || []) {
    if (!s?.unitId) continue;
    if (!s.isOpen) continue;
    map[s.unitId] = {
      unitId: s.unitId,
      unitName: s.unitName || s.unitId,
      category: normalizeText(s.category) || "Alarm",
      reason: normalizeText(s.reason) || "Active alarm",
      startMs: s.startMs,
      startISO: s.startISO,
      endMs: nowMs,
      endISO: safeISO(nowMs),
      isOpen: true,
    };
  }
  return map;
}

/* ------------------- Persisted Downtime Memory ------------------- */

function loadPersisted() {
  if (typeof window === "undefined") return { sessions: [], lastCursorMs: 0 };
  try {
    const raw = window.localStorage.getItem(DT_PERSIST_KEY);
    if (!raw) return { sessions: [], lastCursorMs: 0 };
    const parsed = JSON.parse(raw);
    const sessions = Array.isArray(parsed?.sessions) ? parsed.sessions : [];
    const lastCursorMs = Number(parsed?.lastCursorMs || 0);
    return { sessions, lastCursorMs };
  } catch {
    return { sessions: [], lastCursorMs: 0 };
  }
}

function savePersisted(payload) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DT_PERSIST_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function normalizeSessionUnitName(unitsById, unitId, fallbackName) {
  const u = unitsById?.get?.(unitId);
  return u?.name || fallbackName || unitId;
}

/**
 * Ingest new alarm log events into persisted downtime sessions.
 * - Only uses new events after lastCursorMs
 * - Keeps sessions even if alarm log is cleared (persisted memory)
 */
function ingestLogToPersistedSessions({
  log,
  nowMs,
  unitsById,
  persisted,
}) {
  const prevSessions = Array.isArray(persisted?.sessions) ? persisted.sessions : [];
  const prevCursor = Number(persisted?.lastCursorMs || 0);

  const list = Array.isArray(log) ? log : [];
  if (!list.length) return { sessions: prevSessions, lastCursorMs: prevCursor, changed: false };

  // Work in ASC order for ingestion
  const asc = [...list]
    .filter((n) => n && n.unitId)
    .map((n) => ({ raw: n, unitId: n.unitId, ts: getEventTsMs(n), tsISO: n.tsISO }))
    .filter((n) => Number.isFinite(n.ts))
    .sort((a, b) => a.ts - b.ts);

  // Only new events after cursor (strict)
  const fresh = asc.filter((e) => e.ts > prevCursor);
  if (!fresh.length) return { sessions: prevSessions, lastCursorMs: prevCursor, changed: false };

  // Build open session map from prevSessions
  const openByUnit = new Map();
  for (const s of prevSessions) {
    if (s?.unitId && s?.isOpen) openByUnit.set(s.unitId, s);
  }

  let sessions = [...prevSessions];
  let cursor = prevCursor;
  let changed = false;

  for (const e of fresh) {
    cursor = Math.max(cursor, e.ts);

    const raw = e.raw;
    const unitId = e.unitId;
    const unitName = normalizeSessionUnitName(unitsById, unitId, raw?.unitName);

    const on = isAlarmOnEvent(raw);
    const off = isAlarmOffEvent(raw);

    const cat = normalizeText(raw?.category) || "Alarm";
    const reason = normalizeText(raw?.reason) || normalizeText(raw?.message) || "Alarm active";

    if (on && !off) {
      // Start session if not already open
      if (!openByUnit.has(unitId)) {
        const sess = {
          unitId,
          unitName,
          startMs: e.ts,
          endMs: nowMs,
          startISO: raw?.tsISO || safeISO(e.ts),
          endISO: safeISO(nowMs),
          category: cat,
          reason,
          isOpen: true,
          // minor trace
          openedByEventId: raw?.id || "",
        };
        openByUnit.set(unitId, sess);
        sessions = [sess, ...sessions].slice(0, 3000);
        changed = true;
      }
      continue;
    }

    if (off) {
      const open = openByUnit.get(unitId);
      if (open) {
        // Close existing open session
        const endMs = e.ts;
        open.endMs = endMs;
        open.endISO = raw?.tsISO || safeISO(endMs);
        open.isOpen = false;
        open.closedByEventId = raw?.id || "";
        openByUnit.delete(unitId);
        changed = true;
      }
      continue;
    }
  }

  // Keep open sessions "live" endMs at nowMs for charts
  if (openByUnit.size) {
    for (const s of sessions) {
      if (s?.isOpen) {
        s.endMs = nowMs;
        s.endISO = safeISO(nowMs);
      }
    }
    changed = true;
  }

  return { sessions, lastCursorMs: cursor, changed };
}

/* ------------------- Aggregations for Daily Reporting ------------------- */

function aggregateReasons(sessions, rangeStart, rangeEnd, unitIdOrAll) {
  const map = new Map();

  for (const s of sessions || []) {
    if (unitIdOrAll && unitIdOrAll !== "ALL" && s.unitId !== unitIdOrAll) continue;

    const ms = clipIntervalMs(new Date(s.startMs), new Date(s.endMs), rangeStart, rangeEnd);
    if (ms <= 0) continue;

    const cat = normalizeText(s.category) || "Alarm";
    const reason = normalizeText(s.reason) || "Alarm active";
    const key = `${cat}|||${reason}`;

    const prev = map.get(key) || { category: cat, reason, ms: 0, count: 0 };
    prev.ms += ms;
    prev.count += 1;
    map.set(key, prev);
  }

  return [...map.values()].sort((a, b) => b.ms - a.ms);
}

function aggregateShiftDowntimeByCategory(sessions, dayLocal, unitIdOrAll) {
  const shifts = getShiftWindowsForDay(dayLocal);
  const out = new Map();
  shifts.forEach((s) => out.set(s.key, new Map()));

  for (const sess of sessions || []) {
    if (unitIdOrAll && unitIdOrAll !== "ALL" && sess.unitId !== unitIdOrAll) continue;

    const sStart = new Date(sess.startMs);
    const sEnd = new Date(sess.endMs);
    if (sEnd <= sStart) continue;

    const cat = normalizeText(sess.category) || "Alarm";

    for (const sh of shifts) {
      const ms = clipIntervalMs(sStart, sEnd, sh.start, sh.end);
      if (ms <= 0) continue;

      const mapCat = out.get(sh.key);
      const prev = mapCat.get(cat) || { ms: 0, count: 0 };
      prev.ms += ms;
      prev.count += 1;
      mapCat.set(cat, prev);
    }
  }

  const categories = new Set();
  for (const m of out.values()) for (const c of m.keys()) categories.add(c);

  const rows = shifts.map((sh) => {
    const m = out.get(sh.key);
    const row = { shift: sh.key, label: sh.label, totalMinutes: 0, events: 0 };
    for (const c of categories) {
      const v = m.get(c);
      const minutes = msToMinutes(v?.ms || 0);
      row[c] = minutes;
      row.totalMinutes += minutes;
      row.events += v?.count || 0;
    }
    return row;
  });

  return { rows, categories: [...categories] };
}

function aggregateTopReasonsByShift(sessions, dayLocal, unitIdOrAll, topN = 12) {
  const shifts = getShiftWindowsForDay(dayLocal);
  const map = new Map();

  for (const sess of sessions || []) {
    if (unitIdOrAll && unitIdOrAll !== "ALL" && sess.unitId !== unitIdOrAll) continue;

    const sStart = new Date(sess.startMs);
    const sEnd = new Date(sess.endMs);
    if (sEnd <= sStart) continue;

    const cat = normalizeText(sess.category) || "Alarm";
    const reason = normalizeText(sess.reason) || "Alarm active";
    const k = `${cat}|||${reason}`;

    let rec = map.get(k);
    if (!rec) {
      rec = { category: cat, reason, A: 0, B: 0, C: 0, totalMs: 0, count: 0 };
      map.set(k, rec);
    }

    for (const sh of shifts) {
      const ms = clipIntervalMs(sStart, sEnd, sh.start, sh.end);
      if (ms <= 0) continue;
      rec[sh.key] += ms;
      rec.totalMs += ms;
      rec.count += 1;
    }
  }

  const list = [...map.values()].sort((a, b) => b.totalMs - a.totalMs).slice(0, topN);
  const maxMin = Math.max(1, ...list.map((r) => msToMinutes(r.totalMs)));

  return list.map((r) => {
    const full = `${r.category} — ${r.reason}`;
    const label = full.length > 46 ? `${full.slice(0, 44)}…` : full;

    const A = msToMinutes(r.A);
    const B = msToMinutes(r.B);
    const C = msToMinutes(r.C);
    const total = msToMinutes(r.totalMs);

    return {
      key: `${r.category}|||${r.reason}`,
      label,
      full,
      A,
      B,
      C,
      total,
      count: r.count,
      intensity: clamp(Math.round((total / maxMin) * 100), 1, 100),
    };
  });
}

function bucketDailyDowntimeMinutes(sessions, daysBack, nowLocal, unitIdOrAll) {
  const end = endOfDayLocal(nowLocal);
  const start = new Date(end);
  start.setDate(start.getDate() - (daysBack - 1));
  start.setHours(0, 0, 0, 0);

  const buckets = [];
  for (let i = 0; i < daysBack; i += 1) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const s = startOfDayLocal(d);
    const e = endOfDayLocal(d);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    buckets.push({ key, date: key, start: s, end: e, minutes: 0, events: 0 });
  }

  for (const sess of sessions || []) {
    if (unitIdOrAll && unitIdOrAll !== "ALL" && sess.unitId !== unitIdOrAll) continue;

    const sStart = new Date(sess.startMs);
    const sEnd = new Date(sess.endMs);
    if (sEnd <= sStart) continue;

    for (const b of buckets) {
      const ms = clipIntervalMs(sStart, sEnd, b.start, b.end);
      if (ms <= 0) continue;
      b.minutes += msToMinutes(ms);
      b.events += 1;
    }
  }

  return buckets;
}

function buildParetoToday(reasons, maxBars = 12) {
  const rows = (Array.isArray(reasons) ? reasons : []).filter((r) => (r?.ms || 0) > 0).sort((a, b) => b.ms - a.ms);

  const top = rows.slice(0, maxBars);
  const totalMs = top.reduce((acc, r) => acc + (r.ms || 0), 0) || 0;

  let cum = 0;
  return top.map((r, idx) => {
    const full = `${r.category} — ${r.reason}`;
    const short = full.length > 28 ? `${full.slice(0, 26)}…` : full;

    const minutes = msToMinutes(r.ms);
    cum += r.ms || 0;
    const cumPct = totalMs ? Math.round((cum / totalMs) * 100) : 0;

    return {
      idx: idx + 1,
      short,
      full,
      minutes,
      cumPct,
      count: r.count || 0,
    };
  });
}

function buildTodayGantt(sessions, dayLocal, unitIdOrAll, topUnits = 8) {
  const dayStart = startOfDayLocal(dayLocal);
  const dayEnd = endOfDayLocal(dayLocal);

  const unitAgg = new Map();
  for (const s of sessions || []) {
    if (unitIdOrAll && unitIdOrAll !== "ALL" && s.unitId !== unitIdOrAll) continue;

    const ms = clipIntervalMs(new Date(s.startMs), new Date(s.endMs), dayStart, dayEnd);
    if (ms <= 0) continue;

    const key = s.unitId;
    const prev = unitAgg.get(key) || { unitId: s.unitId, unitName: s.unitName || s.unitId, ms: 0 };
    prev.ms += ms;
    unitAgg.set(key, prev);
  }

  const top = [...unitAgg.values()].sort((a, b) => b.ms - a.ms).slice(0, topUnits);

  const rows = top.map((u) => {
    const segs = [];

    for (const s of sessions || []) {
      if (s.unitId !== u.unitId) continue;

      const sStart = new Date(s.startMs);
      const sEnd = new Date(s.endMs);
      const ms = clipIntervalMs(sStart, sEnd, dayStart, dayEnd);
      if (ms <= 0) continue;

      const clipS = new Date(Math.max(sStart.getTime(), dayStart.getTime()));
      const clipE = new Date(Math.min(sEnd.getTime(), dayEnd.getTime()));

      const leftMin = minutesOfDay(clipS);
      const rightMin = minutesOfDay(clipE);
      const wMin = Math.max(1, rightMin - leftMin);

      const cat = normalizeText(s.category) || "Alarm";
      const reason = normalizeText(s.reason) || "Alarm active";

      segs.push({
        leftMin,
        wMin,
        category: cat,
        reason,
        full: `${cat} — ${reason}`,
        startLabel: fmtHHMM(leftMin),
        endLabel: fmtHHMM(leftMin + wMin),
        minutes: msToMinutes(ms),
      });
    }

    segs.sort((a, b) => a.leftMin - b.leftMin);

    return {
      unitId: u.unitId,
      unitName: u.unitName,
      minutes: msToMinutes(u.ms),
      segments: segs,
    };
  });

  return rows;
}

function categoryColor(cat) {
  const PALETTE = [
    "rgba(59,130,246,0.82)",
    "rgba(245,158,11,0.82)",
    "rgba(34,197,94,0.82)",
    "rgba(239,68,68,0.82)",
    "rgba(167,139,250,0.82)",
    "rgba(20,184,166,0.82)",
    "rgba(244,114,182,0.82)",
    "rgba(234,179,8,0.82)",
    "rgba(251,113,133,0.82)",
    "rgba(148,163,184,0.70)",
  ];
  return PALETTE[paletteIdx(cat)];
}

function buildDailyUnitTotals(sessions, dayLocal, unitIdOrAll = "ALL") {
  const dayStart = startOfDayLocal(dayLocal);
  const dayEnd = endOfDayLocal(dayLocal);

  const map = new Map();

  for (const s of sessions || []) {
    if (unitIdOrAll !== "ALL" && s.unitId !== unitIdOrAll) continue;

    const ms = clipIntervalMs(new Date(s.startMs), new Date(s.endMs), dayStart, dayEnd);
    if (ms <= 0) continue;

    const prev = map.get(s.unitId) || { unitId: s.unitId, unitName: s.unitName || s.unitId, ms: 0, events: 0 };
    prev.ms += ms;
    prev.events += 1;
    map.set(s.unitId, prev);
  }

  const rows = [...map.values()]
    .map((r) => ({ ...r, minutes: msToMinutes(r.ms) }))
    .sort((a, b) => b.minutes - a.minutes);

  const totalMinutesAll = rows.reduce((acc, r) => acc + (r.minutes || 0), 0);
  return { rows, totalMinutesAll };
}

function buildTopReasonForUnitToday(sessions, dayLocal, unitId) {
  const dayStart = startOfDayLocal(dayLocal);
  const dayEnd = endOfDayLocal(dayLocal);

  const map = new Map();

  for (const s of sessions || []) {
    if (s.unitId !== unitId) continue;

    const ms = clipIntervalMs(new Date(s.startMs), new Date(s.endMs), dayStart, dayEnd);
    if (ms <= 0) continue;

    const cat = normalizeText(s.category) || "Alarm";
    const reason = normalizeText(s.reason) || "Alarm active";
    const key = `${cat}|||${reason}`;

    const prev = map.get(key) || { category: cat, reason, ms: 0, count: 0 };
    prev.ms += ms;
    prev.count += 1;
    map.set(key, prev);
  }

  const list = [...map.values()].sort((a, b) => b.ms - a.ms);
  const totalMs = list.reduce((acc, r) => acc + (r.ms || 0), 0) || 0;

  const top = list[0] || null;
  if (!top) return null;

  const pct = totalMs ? Math.round((top.ms / totalMs) * 100) : 0;

  return {
    category: top.category,
    reason: top.reason,
    minutes: msToMinutes(top.ms),
    events: top.count,
    pctOfUnit: pct,
    totalUnitMinutes: msToMinutes(totalMs),
  };
}

/* ------------------- UI primitives ------------------- */

function Panel({ title, subtitle, icon, right, children }) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${PAGE.border}`,
        bgcolor: PAGE.panel,
        borderRadius: 3,
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      }}
    >
      <Box sx={{ p: 1.6, borderBottom: `1px solid ${PAGE.borderSoft}`, bgcolor: "rgba(255,255,255,0.02)" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 950, fontSize: 14, color: PAGE.text }} noWrap>
              {title}
            </Typography>
            {subtitle ? (
              <Typography sx={{ color: PAGE.subtext, fontSize: 12, mt: 0.4 }} noWrap title={subtitle}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "rgba(255,255,255,0.72)" }}>
            {icon}
            {right ? <Box sx={{ ml: 1 }}>{right}</Box> : null}
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ p: 1.6 }}>{children}</Box>
    </Paper>
  );
}

function MetricStrip({ selectionLabel, activeCount, onReset, kpis, rightControls }) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${PAGE.border}`,
        bgcolor: PAGE.panel,
        borderRadius: 3,
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      }}
    >
      <Box sx={{ p: 1.4, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
        <Stack spacing={0.35} sx={{ minWidth: 0 }}>
          <Typography sx={{ color: PAGE.text, fontWeight: 950, fontSize: 14 }} noWrap>
            Downtime Intelligence
          </Typography>
          <Typography sx={{ color: PAGE.subtext, fontSize: 12 }} noWrap>
            Daily (3 shifts) • Alarm-based downtime • Selection: {selectionLabel}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Chip
            icon={<BoltRoundedIcon />}
            size="small"
            label={`Active: ${activeCount}`}
            variant="outlined"
            sx={{ color: PAGE.subtext, borderColor: "rgba(255,255,255,0.14)" }}
          />

          {kpis}

          {rightControls}

          <Tooltip title="Reset (Daily default)" arrow>
            <IconButton
              size="small"
              onClick={onReset}
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
    </Paper>
  );
}

/* ------------------- Charts ------------------- */

function ShiftDowntimeStacked({ rows, categories }) {
  const data = Array.isArray(rows) ? rows : [];
  const cats = Array.isArray(categories) ? categories : [];

  if (!data.length) {
    return <Typography sx={{ color: PAGE.subtext, fontSize: 13 }}>No shift data for today.</Typography>;
  }

  return (
    <Box sx={{ width: "100%", height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 14, right: 18, left: 6, bottom: 10 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="shift" tick={{ fill: "rgba(255,255,255,0.78)", fontSize: 12 }} axisLine={{ stroke: "rgba(255,255,255,0.12)" }} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.62)", fontSize: 11 }} axisLine={{ stroke: "rgba(255,255,255,0.12)" }} />

          <RTooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload?.[0]?.payload || {};
              const total = row.totalMinutes || 0;
              const events = row.events || 0;

              return (
                <Box sx={{ p: 1.1, borderRadius: 2, bgcolor: "rgba(10,14,18,0.95)", border: "1px solid rgba(255,255,255,0.10)", maxWidth: 520 }}>
                  <Typography sx={{ color: PAGE.text, fontSize: 12, fontWeight: 950, mb: 0.6 }}>
                    Shift {label} • {formatMinutes(total)}
                  </Typography>
                  <Typography sx={{ color: PAGE.muted, fontSize: 11, mb: 0.6 }}>Events: {events}</Typography>

                  <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", mb: 0.6 }} />

                  <Stack spacing={0.4}>
                    {cats.map((c) => {
                      const v = row[c] || 0;
                      if (!v) return null;
                      return (
                        <Stack key={c} direction="row" justifyContent="space-between" sx={{ gap: 1 }}>
                          <Typography sx={{ color: PAGE.subtext, fontSize: 11 }} noWrap title={String(c)}>
                            {String(c)}
                          </Typography>
                          <Typography sx={{ color: PAGE.text, fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>
                            {formatMinutes(v)}
                          </Typography>
                        </Stack>
                      );
                    })}
                  </Stack>
                </Box>
              );
            }}
          />

          {/* total label */}
          <Bar dataKey="totalMinutes" fill="rgba(255,255,255,0.00)" isAnimationActive={false}>
            <LabelList
              dataKey="totalMinutes"
              position="top"
              formatter={(v) => formatMinutes(v)}
              style={{ fill: "rgba(255,255,255,0.92)", fontSize: 12, fontWeight: 950 }}
            />
          </Bar>

          {cats.map((c) => (
            <Bar key={c} dataKey={c} stackId="dt" fill={categoryColor(c)} radius={[10, 10, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {cats.length ? (
        <Box sx={{ mt: 1.1, display: "flex", flexWrap: "wrap", gap: 1 }}>
          {cats.slice(0, 10).map((c) => (
            <Chip
              key={c}
              size="small"
              label={c}
              variant="outlined"
              sx={{
                color: "rgba(255,255,255,0.72)",
                borderColor: "rgba(255,255,255,0.14)",
                bgcolor: "rgba(255,255,255,0.02)",
              }}
            />
          ))}
          {cats.length > 10 ? (
            <Chip size="small" label={`+${cats.length - 10} more`} variant="outlined" sx={{ color: PAGE.muted, borderColor: "rgba(255,255,255,0.12)" }} />
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}

function ReasonShiftHeatmap({ rows }) {
  const data = Array.isArray(rows) ? rows : [];
  if (!data.length) {
    return <Typography sx={{ color: PAGE.subtext, fontSize: 13 }}>No shift reason breakdown for today.</Typography>;
  }

  const maxCell = Math.max(1, ...data.map((r) => Math.max(r.A || 0, r.B || 0, r.C || 0)));
  const cellBg = (v) => {
    const t = clamp(v / maxCell, 0, 1);
    const a = 0.10 + t * 0.42;
    return `rgba(59,130,246,${a.toFixed(3)})`;
  };

  const headerSx = {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    borderBottom: `1px solid ${PAGE.borderSoft}`,
    pb: 1,
  };

  return (
    <Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "1.6fr 0.45fr 0.45fr 0.45fr 0.55fr", gap: 1, alignItems: "center", mb: 1.1 }}>
        <Typography sx={headerSx}>Category — Reason</Typography>
        <Typography sx={headerSx} align="center">
          A
        </Typography>
        <Typography sx={headerSx} align="center">
          B
        </Typography>
        <Typography sx={headerSx} align="center">
          C
        </Typography>
        <Typography sx={headerSx} align="right">
          Total
        </Typography>
      </Box>

      <Stack spacing={0.9}>
        {data.map((r) => {
          const a = r.A || 0;
          const b = r.B || 0;
          const c = r.C || 0;
          const total = r.total || 0;

          const pillSx = (v) => ({
            borderRadius: 2,
            border: "1px solid rgba(255,255,255,0.10)",
            bgcolor: cellBg(v),
            px: 1,
            py: 0.65,
            textAlign: "center",
          });

          return (
            <Box key={r.key} sx={{ display: "grid", gridTemplateColumns: "1.6fr 0.45fr 0.45fr 0.45fr 0.55fr", gap: 1, alignItems: "center" }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: PAGE.text, fontSize: 12, fontWeight: 900 }} noWrap title={r.full}>
                  {r.label}
                </Typography>
                <Typography sx={{ color: PAGE.muted, fontSize: 11, mt: 0.25 }} noWrap>
                  Events: {r.count || 0} • Intensity: {r.intensity}%
                </Typography>
              </Box>

              <Box sx={pillSx(a)}>
                <Typography sx={{ color: PAGE.text, fontSize: 12, fontWeight: 900 }}>{a ? formatMinutes(a) : "—"}</Typography>
              </Box>
              <Box sx={pillSx(b)}>
                <Typography sx={{ color: PAGE.text, fontSize: 12, fontWeight: 900 }}>{b ? formatMinutes(b) : "—"}</Typography>
              </Box>
              <Box sx={pillSx(c)}>
                <Typography sx={{ color: PAGE.text, fontSize: 12, fontWeight: 900 }}>{c ? formatMinutes(c) : "—"}</Typography>
              </Box>

              <Box sx={{ textAlign: "right" }}>
                <Typography sx={{ color: PAGE.text, fontSize: 12, fontWeight: 950, whiteSpace: "nowrap" }}>
                  {formatMinutes(total)}
                </Typography>
                <Typography sx={{ color: PAGE.muted, fontSize: 11, mt: 0.2, whiteSpace: "nowrap" }}>
                  Score: {Math.round((total / Math.max(1, maxCell)) * 100)}%
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Stack>

      <Divider sx={{ mt: 1.4, borderColor: PAGE.borderSoft }} />

      <Typography sx={{ color: PAGE.muted, fontSize: 12, mt: 1 }}>
        Values are minutes clipped to shift windows (A/B/C). Intensity scales within today’s top reasons.
      </Typography>
    </Box>
  );
}

function DailyTrend14d({ data }) {
  const rows = Array.isArray(data) ? data : [];
  if (!rows.length) return <Typography sx={{ color: PAGE.subtext, fontSize: 13 }}>No daily trend available.</Typography>;

  return (
    <Box sx={{ width: "100%", height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 16, right: 18, left: 6, bottom: 6 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.60)", fontSize: 11 }} axisLine={{ stroke: "rgba(255,255,255,0.12)" }} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.60)", fontSize: 11 }} axisLine={{ stroke: "rgba(255,255,255,0.12)" }} />
          <RTooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload || {};
              return (
                <Box sx={{ p: 1.1, borderRadius: 2, bgcolor: "rgba(10,14,18,0.95)", border: "1px solid rgba(255,255,255,0.10)" }}>
                  <Typography sx={{ color: PAGE.text, fontSize: 12, fontWeight: 950, mb: 0.5 }}>{label}</Typography>
                  <Typography sx={{ color: PAGE.subtext, fontSize: 12 }}>Downtime: {formatMinutes(p.minutes || 0)}</Typography>
                  <Typography sx={{ color: PAGE.muted, fontSize: 11, mt: 0.3 }}>Events: {p.events || 0}</Typography>
                </Box>
              );
            }}
          />
          <Area type="monotone" dataKey="minutes" stroke="rgba(59,130,246,0.95)" fill="rgba(59,130,246,0.18)" />
          <Line type="monotone" dataKey="minutes" stroke="rgba(59,130,246,0.95)" strokeWidth={2.4} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}

function ParetoToday({ data }) {
  const rows = Array.isArray(data) ? data : [];
  if (!rows.length) return <Typography sx={{ color: PAGE.subtext, fontSize: 13 }}>No Pareto data for today.</Typography>;

  return (
    <Box sx={{ width: "100%", height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 18, right: 18, left: 6, bottom: 10 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="idx" tick={{ fill: "rgba(255,255,255,0.60)", fontSize: 11 }} axisLine={{ stroke: "rgba(255,255,255,0.12)" }} />
          <YAxis yAxisId="min" tick={{ fill: "rgba(255,255,255,0.60)", fontSize: 11 }} axisLine={{ stroke: "rgba(255,255,255,0.12)" }} />
          <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.60)", fontSize: 11 }} />

          <RTooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload?.[0]?.payload || {};
              return (
                <Box sx={{ p: 1.1, borderRadius: 2, bgcolor: "rgba(10,14,18,0.95)", border: "1px solid rgba(255,255,255,0.10)", maxWidth: 520 }}>
                  <Typography sx={{ color: PAGE.text, fontSize: 12, fontWeight: 950, mb: 0.5 }} noWrap title={p.full}>
                    {p.full}
                  </Typography>
                  <Typography sx={{ color: PAGE.subtext, fontSize: 12 }}>Minutes: {formatMinutes(p.minutes || 0)}</Typography>
                  <Typography sx={{ color: PAGE.subtext, fontSize: 12 }}>Cumulative: {p.cumPct || 0}%</Typography>
                  <Typography sx={{ color: PAGE.muted, fontSize: 11, mt: 0.3 }}>Events: {p.count || 0}</Typography>
                </Box>
              );
            }}
          />

          <Bar yAxisId="min" dataKey="minutes" fill="rgba(59,130,246,0.85)" radius={[10, 10, 0, 0]}>
            <LabelList
              dataKey="minutes"
              position="top"
              formatter={(v) => (v ? formatMinutes(v) : "")}
              style={{ fill: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: 900 }}
            />
          </Bar>

          <Line yAxisId="pct" type="monotone" dataKey="cumPct" stroke="rgba(245,158,11,0.95)" strokeWidth={2.6} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>

      <Divider sx={{ mt: 1.1, borderColor: PAGE.borderSoft }} />
      <Typography sx={{ color: PAGE.muted, fontSize: 12, mt: 1 }}>
        Pareto uses today’s top reasons (alarm-derived). Orange line is cumulative percentage.
      </Typography>
    </Box>
  );
}

function TodayShiftGantt({ rows, dayLocal }) {
  const data = Array.isArray(rows) ? rows : [];
  if (!data.length) return <Typography sx={{ color: PAGE.subtext, fontSize: 13 }}>No timeline data for today.</Typography>;

  const shifts = getShiftWindowsForDay(dayLocal);
  const day0 = startOfDayLocal(dayLocal);

  const shiftBands = shifts.map((s) => {
    const a = minutesOfDay(s.start);
    let b = minutesOfDay(s.end);
    if (s.key === "C") b = 1440;
    const leftPct = (a / 1440) * 100;
    const widthPct = ((b - a) / 1440) * 100;
    return { key: s.key, label: s.label, leftPct, widthPct, startLabel: fmtHHMM(a), endLabel: fmtHHMM(b) };
  });

  const ticks = [0, 240, 480, 720, 960, 1200, 1440];

  return (
    <Box>
      <Box
        sx={{
          position: "relative",
          height: 42,
          borderRadius: 2,
          border: `1px solid ${PAGE.borderSoft}`,
          bgcolor: "rgba(0,0,0,0.18)",
          overflow: "hidden",
        }}
      >
        {shiftBands.map((b) => (
          <Box
            key={b.key}
            sx={{
              position: "absolute",
              left: `${b.leftPct}%`,
              width: `${b.widthPct}%`,
              top: 0,
              bottom: 0,
              bgcolor: "rgba(255,255,255,0.035)",
              borderRight: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <Box sx={{ px: 1, py: 0.7, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography sx={{ color: "rgba(255,255,255,0.78)", fontSize: 11, fontWeight: 900, letterSpacing: 0.6 }}>
                {b.key}
              </Typography>
              <Typography sx={{ color: PAGE.muted, fontSize: 11, whiteSpace: "nowrap" }}>
                {b.startLabel}-{b.endLabel}
              </Typography>
            </Box>
          </Box>
        ))}

        {ticks.map((m) => (
          <Box
            key={m}
            sx={{
              position: "absolute",
              left: `${(m / 1440) * 100}%`,
              top: 0,
              bottom: 0,
              width: 1,
              bgcolor: "rgba(255,255,255,0.06)",
            }}
          />
        ))}
      </Box>

      <Box sx={{ mt: 1.1, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
        <Typography sx={{ color: PAGE.muted, fontSize: 12 }}>Timeline reference: {day0.toLocaleDateString()}</Typography>
        <Typography sx={{ color: PAGE.muted, fontSize: 12 }}>Blocks are downtime sessions clipped to today</Typography>
      </Box>

      <Divider sx={{ my: 1.1, borderColor: PAGE.borderSoft }} />

      <Stack spacing={1.1}>
        {data.map((row) => (
          <Box key={row.unitId} sx={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 1.2, alignItems: "center" }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ color: PAGE.text, fontWeight: 950, fontSize: 12 }} noWrap title={row.unitName}>
                {row.unitName}
              </Typography>
              <Typography sx={{ color: PAGE.muted, fontSize: 11, mt: 0.2 }} noWrap>
                DT: {formatMinutes(row.minutes)} • UnitId: {row.unitId}
              </Typography>
            </Box>

            <Box
              sx={{
                position: "relative",
                height: 30,
                borderRadius: 2,
                border: "1px solid rgba(255,255,255,0.08)",
                bgcolor: "rgba(0,0,0,0.18)",
                overflow: "hidden",
              }}
            >
              {ticks.map((m) => (
                <Box
                  key={m}
                  sx={{
                    position: "absolute",
                    left: `${(m / 1440) * 100}%`,
                    top: 0,
                    bottom: 0,
                    width: 1,
                    bgcolor: "rgba(255,255,255,0.05)",
                  }}
                />
              ))}

              {row.segments.map((s, idx) => {
                const leftPct = (s.leftMin / 1440) * 100;
                const widthPct = (s.wMin / 1440) * 100;

                const bg = categoryColor(s.category);
                const title = `${row.unitName}\n${s.full}\n${s.startLabel}-${s.endLabel} • ${formatMinutes(s.minutes)}`;

                return (
                  <Box
                    key={`${row.unitId}-${idx}-${s.leftMin}`}
                    title={title}
                    sx={{
                      position: "absolute",
                      left: `${leftPct}%`,
                      width: `${Math.max(0.4, widthPct)}%`,
                      top: 4,
                      bottom: 4,
                      borderRadius: 1.5,
                      bgcolor: bg,
                      boxShadow: "0 8px 22px rgba(0,0,0,0.35)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      opacity: 0.95,
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        ))}
      </Stack>

      <Divider sx={{ mt: 1.2, borderColor: PAGE.borderSoft }} />
      <Typography sx={{ color: PAGE.muted, fontSize: 12, mt: 1 }}>Tip: Hover a block to see Category — Reason, time window and minutes.</Typography>
    </Box>
  );
}

/* ------------------- 3D map ------------------- */

function LabelTag3D({ text, dotColor, active, unitSize, zoomDist }) {
  const groupRef = useRef(null);

  const name = String(text || "UNIT");
  const mode = active ? "full" : "tiny";
  const shown = mode === "tiny" ? name.slice(0, 14) : name;

  const baseFont = mode === "tiny" ? 0.22 : 0.28;
  const charW = mode === "tiny" ? 0.13 : 0.155;
  const padX = mode === "tiny" ? 0.3 : 0.42;
  const padY = mode === "tiny" ? 0.18 : 0.22;

  const textW = clamp(shown.length * charW, 1.1, mode === "tiny" ? 3.1 : 6.2);
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
          <meshStandardMaterial color="#ffffff" transparent opacity={opacity * 0.09} depthTest={false} />
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

function AlarmRing({ w, h, enabled }) {
  const ringRef = useRef(null);

  useFrame((state) => {
    if (!ringRef.current) return;
    if (!enabled) {
      ringRef.current.visible = false;
      return;
    }
    ringRef.current.visible = true;
    const t = state.clock.getElapsedTime();
    const k = 0.88 + (Math.sin(t * 3.1) * 0.5 + 0.5) * 0.22;
    ringRef.current.scale.set(k, 1, k);
    ringRef.current.position.y = 0.09 + (Math.sin(t * 2.4) * 0.5 + 0.5) * 0.02;
  });

  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[Math.max(w, h) * 0.6, Math.max(w, h) * 0.76, 48]} />
      <meshStandardMaterial color={COLOR_YELLOW} transparent opacity={0.26} emissive={COLOR_YELLOW} emissiveIntensity={0.32} />
    </mesh>
  );
}

function UnitBox3D({ unit, isSelected, isHovered, onSelect, onHoverChange, zoomDist, isAlarmActive }) {
  const { x, y, w, h } = unit.layout;

  const height = 0.12;
  const borderUp = isSelected ? 0.03 : 0;

  const baseColor = baseLineColor(unit.status);
  const topColor = isAlarmActive ? COLOR_YELLOW : baseColor;

  const unitSize = Math.max(w, h);
  const active = isSelected || isHovered || isAlarmActive;

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
          emissive={isAlarmActive ? COLOR_YELLOW : isHovered ? "#0ea5e9" : "#000000"}
          emissiveIntensity={isAlarmActive ? 0.16 : isHovered ? 0.14 : 0}
        />
      </mesh>

      <mesh position={[0, (height + borderUp) / 2 + 0.01, 0]}>
        <boxGeometry args={[w * 0.96, 0.02, h * 0.96]} />
        <meshStandardMaterial color={topColor} transparent opacity={0.92} />
      </mesh>

      <AlarmRing w={w} h={h} enabled={!!isAlarmActive} />

      <group position={[0, lift, 0]}>
        <LabelTag3D text={unit.name} dotColor={topColor} active={active} unitSize={unitSize} zoomDist={zoomDist} />
      </group>
    </group>
  );
}

function StableControls({ target, isMobile }) {
  const controlsRef = useRef(null);

  useEffect(() => {
    if (!controlsRef.current) return;
    controlsRef.current.target.set(target[0], target[1], target[2]);
    controlsRef.current.update();
  }, [target]);

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

function CadScene({ units, selectedId, hoveredId, onHoverChange, onSelect, bounds, isMobile, onZoomUpdate, activeAlarmMap }) {
  const target0 = useMemo(() => [bounds.cx, 0, bounds.cy], [bounds.cx, bounds.cy]);
  const { camera } = useThree();

  const zoomDistRef = useRef(18);
  const lastSentRef = useRef(0);

  useFrame(() => {
    const dx = camera.position.x - target0[0];
    const dy = camera.position.y - target0[1];
    const dz = camera.position.z - target0[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    zoomDistRef.current = dist;

    const nowPerf = performance.now();
    if (nowPerf - lastSentRef.current > 140) {
      lastSentRef.current = nowPerf;
      onZoomUpdate(dist);
    }
  });

  const zoomDist = zoomDistRef.current;

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
          zoomDist={zoomDist}
          isAlarmActive={!!activeAlarmMap[u.id]}
        />
      ))}

      <StableControls target={target0} isMobile={isMobile} />
    </>
  );
}

function CadView({ units, selectedId, hoveredId, onHoverChange, onSelect, heightPx, isMobile, onZoomUpdate, activeAlarmMap }) {
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
  const canvasInnerGutter = 10;

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
            Plant 3 — Alarm Downtime Map
          </Typography>
          <Typography sx={{ color: PAGE.subtext, fontSize: 12 }} noWrap>
            Yellow ring = active downtime/alarm (persisted memory)
          </Typography>
        </Box>

        <Typography sx={{ color: PAGE.subtext, fontSize: 12, whiteSpace: "nowrap" }}>Pan / Zoom / Rotate</Typography>
      </Box>

      <Box sx={{ height: `calc(100% - ${headerH}px)`, p: `${canvasInnerGutter}px`, boxSizing: "border-box", minHeight: 0 }}>
        <Box
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            height: "100%",
            border: "1px solid rgba(255,255,255,0.06)",
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
              activeAlarmMap={activeAlarmMap}
            />
          </Canvas>
        </Box>
      </Box>
    </Box>
  );
}

/* ------------------- Page ------------------- */

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

  const unitsById = useMemo(() => {
    const m = new Map();
    units.forEach((u) => m.set(u.id, u));
    return m;
  }, [units]);

  const isMobile = useMediaQuery("(max-width: 900px)");
  const isTablet = useMediaQuery("(min-width: 900px) and (max-width: 1199px)");

  const pad = isMobile ? 12 : isTablet ? 14 : 18;
  const framePad = isMobile ? 10 : isTablet ? 12 : 14;
  const canvasH = isMobile ? 520 : isTablet ? 640 : 680;
  const gridCols = isTablet || isMobile ? "1fr" : "1.18fr 0.82fr";

  const { log, startEngine, pushAlarm } = useAlarmCenter();

  useEffect(() => {
    startEngine?.();
  }, [startEngine]);

  const [selectedId, setSelectedId] = useState("ALL");
  const [hoveredId, setHoveredId] = useState(null);
  const [zoomDist, setZoomDist] = useState(null);

  const [search, setSearch] = useState("");

  const insightsRef = useRef(null);

  // Live clock tick (keeps open sessions updating)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((x) => x + 1), 5000);
    return () => window.clearInterval(t);
  }, []);

  const nowLive = useMemo(() => {
    void tick;
    return new Date();
  }, [tick]);

  const nowMs = nowLive.getTime();
  const dayRange = useMemo(() => ({ start: startOfDayLocal(nowLive), end: endOfDayLocal(nowLive), label: "Today" }), [nowLive]);

  // Load persisted downtime memory once
  const [persisted, setPersisted] = useState(() => loadPersisted());

  // Ingest alarm log into persisted sessions
  useEffect(() => {
    const next = ingestLogToPersistedSessions({
      log,
      nowMs,
      unitsById,
      persisted,
    });

    if (next.changed) {
      const payload = { sessions: next.sessions, lastCursorMs: next.lastCursorMs };
      setPersisted(payload);
      savePersisted(payload);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log, nowMs, unitsById]);

  // Derived sessions for charts (from persisted memory)
  const sessions = useMemo(() => (Array.isArray(persisted?.sessions) ? persisted.sessions : []), [persisted]);

  // Active map derived from persisted sessions (NOT from alarmCenter.log)
  const activeAlarmMap = useMemo(() => buildActiveAlarmMapFromSessions(sessions, nowMs), [sessions, nowMs]);

  const activeList = useMemo(() => {
    const list = Object.values(activeAlarmMap || {});
    return list.sort((a, b) => (b.startMs || 0) - (a.startMs || 0));
  }, [activeAlarmMap]);

  const activeCount = activeList.length;

  const selectedUnit = useMemo(() => {
    if (!selectedId || selectedId === "ALL") return null;
    return units.find((u) => u.id === selectedId) || null;
  }, [selectedId, units]);

  const selectionKey = selectedId || "ALL";
  const selectionLabel = selectedUnit ? selectedUnit.name : "All Units";

  // Daily reasons (selected unit or all)
  const todayReasons = useMemo(() => aggregateReasons(sessions, dayRange.start, dayRange.end, selectionKey), [sessions, dayRange.start, dayRange.end, selectionKey]);
  const paretoToday = useMemo(() => buildParetoToday(todayReasons, 12), [todayReasons]);

  const shiftAgg = useMemo(() => aggregateShiftDowntimeByCategory(sessions, nowLive, selectionKey), [sessions, nowLive, selectionKey]);
  const shiftRows = shiftAgg.rows;
  const shiftCategories = shiftAgg.categories;

  const topReasonsShift = useMemo(() => aggregateTopReasonsByShift(sessions, nowLive, selectionKey, 12), [sessions, nowLive, selectionKey]);
  const trend14d = useMemo(() => bucketDailyDowntimeMinutes(sessions, 14, nowLive, selectionKey), [sessions, nowLive, selectionKey]);

  const ganttToday = useMemo(() => buildTodayGantt(sessions, nowLive, selectionKey, 8), [sessions, nowLive, selectionKey]);

  const todayTotalMin = useMemo(() => todayReasons.reduce((acc, r) => acc + msToMinutes(r.ms), 0), [todayReasons]);

  // New: Daily Summary (All Units)
  const dailyTotalsAll = useMemo(() => buildDailyUnitTotals(sessions, nowLive, "ALL"), [sessions, nowLive]);
  const maxUnitToday = dailyTotalsAll.rows?.[0] || null;

  const maxUnitTopReason = useMemo(() => {
    if (!maxUnitToday?.unitId) return null;
    return buildTopReasonForUnitToday(sessions, nowLive, maxUnitToday.unitId);
  }, [sessions, nowLive, maxUnitToday?.unitId]);

  const rankingToday = useMemo(() => {
    return (dailyTotalsAll.rows || []).slice(0, 14).map((r) => ({
      unit: r.unitName,
      unitId: r.unitId,
      minutes: r.minutes || 0,
    }));
  }, [dailyTotalsAll.rows]);

  const filteredActive = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = activeList.filter((a) => (selectionKey === "ALL" ? true : a.unitId === selectionKey));

    if (!q) return list;

    return list.filter((a) => {
      const text = `${a.unitName || ""} ${a.unitId || ""} ${a.category || ""} ${a.reason || ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [activeList, search, selectionKey]);

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

  const onReset = useCallback(() => {
    setSelectedId("ALL");
    setSearch("");
  }, []);

  const onSelectUnitFromMap = useCallback((u) => {
    setSelectedId(u?.id ? u.id : "ALL");
    window.setTimeout(() => insightsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 60);
  }, []);

  const resolveUnit = useCallback(
    (unitId) => {
      if (!unitId) return;

      // Close in persisted memory immediately
      const now = Date.now();
      const nextSessions = (Array.isArray(persisted?.sessions) ? persisted.sessions : []).map((s) => {
        if (s?.unitId === unitId && s?.isOpen) {
          return { ...s, isOpen: false, endMs: now, endISO: safeISO(now), closedByManual: true };
        }
        return s;
      });

      const payload = { sessions: nextSessions, lastCursorMs: Number(persisted?.lastCursorMs || 0) };
      setPersisted(payload);
      savePersisted(payload);

      // Push DT_END to keep alignment with alarm store (optional but recommended)
      const u = unitsById.get(unitId);
      pushAlarm?.({
        id: `manual-end-${now}-${unitId}`,
        tsISO: safeISO(now),
        unitId,
        unitName: u?.name || unitId,
        severity: "LOW",
        category: "Process",
        reason: "Manual Resume",
        text: "Downtime End — Manual Resume",
        eventType: EVENT_TYPE.DT_END,
      });
    },
    [persisted, pushAlarm, unitsById]
  );

  const clearDowntimeMemory = useCallback(() => {
    const payload = { sessions: [], lastCursorMs: 0 };
    setPersisted(payload);
    savePersisted(payload);
  }, []);

  const rightControls = (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
      <Chip
        size="small"
        label="Mode: Daily (3 shifts)"
        variant="outlined"
        sx={{ color: PAGE.muted, borderColor: "rgba(255,255,255,0.12)" }}
      />
      <Tooltip title="Clear downtime memory (demo only)" arrow>
        <Button
          size="small"
          variant="outlined"
          onClick={clearDowntimeMemory}
          sx={{ borderColor: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.78)" }}
        >
          Clear DT Memory
        </Button>
      </Tooltip>
    </Stack>
  );

  const kpis = (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
      <Chip
        size="small"
        label={`Today DT: ${formatMinutes(todayTotalMin)}`}
        variant="outlined"
        sx={{ color: "rgba(255,255,255,0.80)", borderColor: "rgba(59,130,246,0.35)", bgcolor: "rgba(59,130,246,0.06)" }}
      />
      <Chip
        size="small"
        label={`Memory Sessions: ${sessions.length}`}
        variant="outlined"
        sx={{ color: PAGE.muted, borderColor: "rgba(255,255,255,0.12)" }}
      />
    </Stack>
  );

  return (
    <Box sx={frameSx}>
      <Box
        sx={{
          width: "100%",
          maxWidth: 1460,
          mx: "auto",
          border: `1px solid ${PAGE.borderSoft}`,
          borderRadius: 4,
          bgcolor: "rgba(255,255,255,0.015)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: `${framePad}px`, boxSizing: "border-box" }}>
          <Box sx={{ width: "100%", display: "grid", gridTemplateColumns: gridCols, gap: `${framePad}px`, alignItems: "stretch", minHeight: 0 }}>
            {/* LEFT */}
            <Box sx={{ minHeight: 0, minWidth: 0 }}>
              <CadView
                units={units}
                selectedId={selectedId === "ALL" ? null : selectedId}
                hoveredId={hoveredId}
                onHoverChange={setHoveredId}
                onSelect={onSelectUnitFromMap}
                heightPx={canvasH}
                isMobile={isMobile}
                onZoomUpdate={setZoomDist}
                activeAlarmMap={activeAlarmMap}
              />

              <Box
                sx={{
                  mt: 1.1,
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
                  <span>Active: {activeCount}</span>
                  <span>Selection: {selectionLabel}</span>
                </Box>

                <Typography sx={{ color: PAGE.muted, fontSize: 12 }}>
                  DT memory is persisted (charts won’t drop to zero if alarm history is cleared)
                </Typography>
              </Box>
            </Box>

            {/* RIGHT */}
            <Box ref={insightsRef} sx={{ minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column", gap: `${framePad}px` }}>
              <MetricStrip
                selectionLabel={selectionLabel}
                activeCount={activeCount}
                onReset={onReset}
                rightControls={rightControls}
                kpis={kpis}
              />

              {/* Daily Summary Panel */}
              <Panel
                title="Daily Summary (All Units)"
                subtitle="Max downtime unit + ranking (Today)"
                icon={<BarChartRoundedIcon fontSize="small" />}
              >
                <Stack spacing={1.2}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.2,
                      borderRadius: 3,
                      bgcolor: "rgba(255,255,255,0.02)",
                      border: `1px solid ${PAGE.borderSoft}`,
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap">
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ color: PAGE.subtext, fontSize: 12 }}>Max Downtime Unit (Today)</Typography>
                        <Typography sx={{ color: PAGE.text, fontWeight: 950, fontSize: 14 }} noWrap>
                          {maxUnitToday ? `${maxUnitToday.unitName}` : "—"}
                        </Typography>
                        <Typography sx={{ color: PAGE.muted, fontSize: 12, mt: 0.4 }}>
                          Total DT: <b style={{ color: PAGE.text }}>{maxUnitToday ? formatMinutes(maxUnitToday.minutes) : "—"}</b>
                          {maxUnitToday ? ` • Events: ${maxUnitToday.events || 0}` : ""}
                        </Typography>
                      </Box>

                      <Box sx={{ minWidth: 260 }}>
                        <Typography sx={{ color: PAGE.subtext, fontSize: 12 }}>Top Reason (for Max Unit)</Typography>
                        <Typography
                          sx={{ color: PAGE.text, fontWeight: 900, fontSize: 12, mt: 0.3 }}
                          noWrap
                          title={maxUnitTopReason ? `${maxUnitTopReason.category} — ${maxUnitTopReason.reason}` : ""}
                        >
                          {maxUnitTopReason ? `${maxUnitTopReason.category} — ${maxUnitTopReason.reason}` : "—"}
                        </Typography>
                        <Typography sx={{ color: PAGE.muted, fontSize: 12, mt: 0.4 }}>
                          Share: <b style={{ color: PAGE.text }}>{maxUnitTopReason ? `${maxUnitTopReason.pctOfUnit}%` : "—"}</b>
                          {maxUnitTopReason ? ` • ${formatMinutes(maxUnitTopReason.minutes)}` : ""}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>

                  <Divider sx={{ borderColor: PAGE.borderSoft }} />

                  <Typography sx={{ color: PAGE.subtext, fontSize: 12 }}>
                    Ranking (Today) — Total downtime minutes (All Units), sorted high → low
                  </Typography>

                  <Box sx={{ width: "100%", height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rankingToday} margin={{ top: 12, right: 18, left: 10, bottom: 10 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="unit" tick={{ fill: "rgba(255,255,255,0.60)", fontSize: 11 }} hide />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.60)", fontSize: 11 }} />
                        <RTooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const p = payload[0]?.payload || {};
                            return (
                              <Box sx={{ p: 1.1, borderRadius: 2, bgcolor: "rgba(10,14,18,0.95)", border: "1px solid rgba(255,255,255,0.10)" }}>
                                <Typography sx={{ color: PAGE.text, fontSize: 12, fontWeight: 950 }}>{p.unit}</Typography>
                                <Typography sx={{ color: PAGE.subtext, fontSize: 12 }}>DT: {formatMinutes(p.minutes || 0)}</Typography>
                                <Typography sx={{ color: PAGE.muted, fontSize: 11 }}>UnitId: {p.unitId}</Typography>
                              </Box>
                            );
                          }}
                        />
                        <Bar dataKey="minutes" fill="rgba(59,130,246,0.85)" radius={[10, 10, 0, 0]}>
                          <LabelList
                            dataKey="minutes"
                            position="top"
                            formatter={(v) => (v ? formatMinutes(v) : "")}
                            style={{ fill: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: 900 }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>

                  <Typography sx={{ color: PAGE.muted, fontSize: 12 }}>
                    Total downtime (All Units Today): <b style={{ color: PAGE.text }}>{formatMinutes(dailyTotalsAll.totalMinutesAll || 0)}</b>
                  </Typography>
                </Stack>
              </Panel>

              <Panel
                title="Shift Timeline Gantt (Today)"
                subtitle={`SCADA-style timeline • Top units by downtime • ${selectionLabel}`}
                icon={<BarChartRoundedIcon fontSize="small" />}
              >
                <TodayShiftGantt rows={ganttToday} dayLocal={nowLive} />
              </Panel>

              <Panel
                title="Downtime by Shift (Today)"
                subtitle={`A(06-14) / B(14-22) / C(22-06) • Stacked by Category • ${selectionLabel}`}
                icon={<BarChartRoundedIcon fontSize="small" />}
              >
                <ShiftDowntimeStacked rows={shiftRows} categories={shiftCategories} />
              </Panel>

              <Panel title="Industrial Pareto (Today)" subtitle={`Top drivers and cumulative impact • ${selectionLabel}`} icon={<BarChartRoundedIcon fontSize="small" />}>
                <ParetoToday data={paretoToday} />
              </Panel>

              <Panel title="Top Reasons by Shift (Today)" subtitle={`Category — Reason matrix • ${selectionLabel}`} icon={<BarChartRoundedIcon fontSize="small" />}>
                <ReasonShiftHeatmap rows={topReasonsShift} />
              </Panel>

              <Panel title="Daily Trend (Last 14 Days)" subtitle={`Downtime minutes (persisted memory) • ${selectionLabel}`} icon={<BarChartRoundedIcon fontSize="small" />}>
                <DailyTrend14d data={trend14d} />
                <Divider sx={{ mt: 1.0, borderColor: PAGE.borderSoft }} />
                <Typography sx={{ color: PAGE.muted, fontSize: 12, mt: 1 }}>
                  Trend uses day buckets; sessions are clipped to each day window.
                </Typography>
              </Panel>

              <Panel
                title="Active Alarms / Downtime (Persisted)"
                subtitle="This list is derived from downtime memory (not from live alarm history)"
                icon={<BoltRoundedIcon fontSize="small" />}
                right={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      size="small"
                      placeholder="Search unit / reason"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchRoundedIcon fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        minWidth: isMobile ? 200 : 260,
                        "& .MuiInputBase-root": { bgcolor: "rgba(255,255,255,0.03)", borderRadius: 2 },
                      }}
                    />
                  </Stack>
                }
              >
                {filteredActive.length ? (
                  <Stack spacing={1}>
                    {filteredActive.slice(0, 14).map((a) => {
                      const durMin = msToMinutes((a.endMs || nowMs) - (a.startMs || nowMs));
                      const title = a.unitName || a.unitId;
                      const sub = `${normalizeText(a.category)} • ${normalizeText(a.reason)}`;
                      const started = a.startMs ? new Date(a.startMs).toLocaleString() : "—";

                      return (
                        <Paper
                          key={`${a.unitId}-${a.startMs}`}
                          elevation={0}
                          sx={{
                            p: 1.1,
                            borderRadius: 3,
                            bgcolor: "rgba(255,255,255,0.02)",
                            border: `1px solid ${PAGE.borderSoft}`,
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1} flexWrap="wrap">
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography sx={{ color: PAGE.text, fontWeight: 900, fontSize: 13 }} noWrap>
                                {title}
                              </Typography>
                              <Typography sx={{ color: PAGE.subtext, fontSize: 12 }} noWrap title={sub}>
                                {sub}
                              </Typography>

                              <Stack direction="row" spacing={1} sx={{ mt: 0.8, flexWrap: "wrap" }}>
                                <Chip size="small" label="ACTIVE" color="warning" variant="outlined" sx={{ borderColor: "rgba(245,158,11,0.55)" }} />
                                <Chip
                                  size="small"
                                  label={`Duration: ${formatMinutes(durMin)}`}
                                  variant="outlined"
                                  sx={{ color: PAGE.muted, borderColor: "rgba(255,255,255,0.12)" }}
                                />
                                <Chip
                                  size="small"
                                  label={`Started: ${started}`}
                                  variant="outlined"
                                  sx={{ color: PAGE.muted, borderColor: "rgba(255,255,255,0.12)" }}
                                />
                              </Stack>
                            </Box>

                            <Box sx={{ textAlign: "right", minWidth: 160 }}>
                              <Typography sx={{ color: PAGE.text, fontWeight: 950, whiteSpace: "nowrap" }}>{formatMinutes(durMin)}</Typography>
                              <Typography sx={{ color: PAGE.muted, fontSize: 11, mt: 0.4, whiteSpace: "nowrap" }}>UnitId: {a.unitId}</Typography>

                              <Tooltip title="Manual Resume / Resolve (closes session in DT memory)" arrow>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<DoneAllRoundedIcon />}
                                  onClick={() => resolveUnit(a.unitId)}
                                  sx={{ mt: 1, borderColor: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.85)" }}
                                >
                                  Resolve
                                </Button>
                              </Tooltip>
                            </Box>
                          </Stack>
                        </Paper>
                      );
                    })}

                    {filteredActive.length > 14 ? (
                      <Typography sx={{ color: PAGE.muted, fontSize: 12 }}>Showing 14 / {filteredActive.length}</Typography>
                    ) : null}
                  </Stack>
                ) : (
                  <Typography sx={{ color: PAGE.subtext, fontSize: 13 }}>
                    No active downtime/alarm found for current filters.
                  </Typography>
                )}
              </Panel>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}