// src/pages/AlarmsPage.js
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
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import VolumeOffRoundedIcon from "@mui/icons-material/VolumeOffRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import EngineeringRoundedIcon from "@mui/icons-material/EngineeringRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Billboard, Text } from "@react-three/drei";

import { getPlant3Units } from "../data/mock/plant3.units.mock";
import { useAlarmCenter, EVENT_TYPE } from "../state/alarmCenter.store";

const LAYOUT_SPREAD = 1.34;

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

const SEVERITY = { LOW: "LOW", MED: "MED", HIGH: "HIGH" };

const SOURCE_TYPE = {
  SYSTEM: "SYSTEM",
  OPERATOR: "OPERATOR",
  TEAM_LEAD: "TEAM_LEAD",
};

const SCOPE_TYPE = {
  UNIT: "UNIT",
  STATION: "STATION",
};

const COLOR_GREEN = "#22c55e";
const COLOR_RED = "#ef4444";
const COLOR_YELLOW = "#f59e0b";

const ALARM_HOLD_MS = 10 * 60 * 1000;
const LIVE_RETENTION_MS = 24 * 60 * 60 * 1000;

const COLORS = [
  "#38bdf8",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#14b8a6",
  "#f97316",
  "#64748b",
];

const ALARM_TYPE_CATALOG = [
  {
    code: "SUPERVISOR",
    label: "Supervisor",
    severity: SEVERITY.MED,
    subjects: [
      "Team Lead Support",
      "Production Decision",
      "Escalation Needed",
      "Operator Assistance",
      "Shift Coordination",
    ],
  },
  {
    code: "MAINTENANCE",
    label: "Maintenance",
    severity: SEVERITY.HIGH,
    subjects: [
      "Robot Issue",
      "Sensor Issue",
      "Vision System Issue",
      "Conveyor Issue",
      "Welder Issue",
      "Torque Gun Issue",
      "Fixture Issue",
    ],
  },
  {
    code: "QUALITY",
    label: "Quality",
    severity: SEVERITY.MED,
    subjects: [
      "Quality Check Needed",
      "Suspect / Defect Review",
      "Part Quality Issue",
      "Validation Support",
      "Containment Request",
    ],
  },
  {
    code: "MATERIAL",
    label: "Material",
    severity: SEVERITY.LOW,
    subjects: [
      "Waiting Components",
      "Container Needed",
      "Part Shortage",
      "Label / Packaging Support",
      "Inventory Check",
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

function formatTs(tsISO) {
  if (!tsISO) return "—";
  try {
    return new Date(tsISO).toLocaleString();
  } catch {
    return "—";
  }
}

function compactLabel(text, max = 14) {
  const value = String(text || "—");
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function baseLineColor(status) {
  return status === "RUNNING" ? COLOR_GREEN : COLOR_RED;
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

function pickPreferredVoice(voices, lang) {
  const list = (voices || []).filter((v) => (v.lang || "").toLowerCase().startsWith(lang.toLowerCase()));
  if (!list.length) return null;

  const preferredNames = [
    "zira",
    "samantha",
    "victoria",
    "karen",
    "tessa",
    "allison",
    "microsoft aria",
    "microsoft zira",
    "google us english",
  ];

  const byName = list.find((v) => preferredNames.some((p) => (v.name || "").toLowerCase().includes(p)));
  return byName || list[0];
}

function safeSpeak(text, enabled, opts = {}) {
  if (!enabled) return;
  if (!("speechSynthesis" in window)) return;

  const { lang = "en-US", rate = 1.0, pitch = 1.05, volume = 1.0, preferFemale = true } = opts;

  try {
    window.speechSynthesis.cancel();

    const utter = new window.SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = rate;
    utter.pitch = pitch;
    utter.volume = volume;

    const voices = window.speechSynthesis.getVoices?.() || [];
    if (preferFemale && voices.length) {
      const v = pickPreferredVoice(voices, lang);
      if (v) utter.voice = v;
    }

    window.speechSynthesis.speak(utter);
  } catch {
    // ignore
  }
}

function getTorontoDateParts(tsISO = new Date().toISOString()) {
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

function getShiftMeta(tsISO = new Date().toISOString()) {
  const p = getTorontoDateParts(tsISO);
  const minutes = p.hour * 60 + p.minute;

  let shiftKey = "C";
  if (minutes >= 360 && minutes < 840) shiftKey = "A";
  else if (minutes >= 840 && minutes < 1320) shiftKey = "B";

  let businessDate = `${String(p.year).padStart(4, "0")}-${String(p.month).padStart(2, "0")}-${String(
    p.day
  ).padStart(2, "0")}`;

  if (minutes < 360) {
    const noonUtc = new Date(`${businessDate}T12:00:00Z`);
    noonUtc.setUTCDate(noonUtc.getUTCDate() - 1);
    businessDate = noonUtc.toISOString().slice(0, 10);
  }

  return { shiftKey, businessDate };
}

function formatDurationMs(ms) {
  const safe = Math.max(0, Number(ms) || 0);
  const totalSec = Math.floor(safe / 1000);
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
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
  const { shiftKey, businessDate } = getShiftMeta(tsISO);
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

function deriveAlarmState(log) {
  const liveLog = pruneLiveLog(log);
  const asc = [...liveLog].sort((a, b) => Date.parse(a.tsISO || 0) - Date.parse(b.tsISO || 0));
  const now = Date.now();

  const activeAlarmMap = {};
  const openAlarmStartMap = {};
  const sessions = [];

  asc.forEach((n) => {
    const unitId = n?.unitId;
    if (!unitId) return;

    const type = String(n.eventType || "");
    const ts = n?.tsISO ? Date.parse(n.tsISO) : NaN;

    if (type === EVENT_TYPE.ALARM_RAISE) {
      if (Number.isFinite(ts) && now - ts <= ALARM_HOLD_MS) {
        activeAlarmMap[unitId] = {
          tsISO: n.tsISO,
          severity: n.severity || SEVERITY.LOW,
          stationId: n.stationId || null,
          stationName: n.stationName || null,
          startEventId: n.id,
          category: n.category || "Alarm",
          reason: n.reason || "—",
        };
      }
      openAlarmStartMap[unitId] = n;
      return;
    }

    if (type === EVENT_TYPE.ALARM_CLEAR) {
      const startEvent = openAlarmStartMap[unitId] || null;
      const durationMs =
        startEvent?.tsISO && n?.tsISO ? Math.max(0, Date.parse(n.tsISO) - Date.parse(startEvent.tsISO)) : 0;

      sessions.push({
        id: n.id || `alarm-clear-${unitId}`,
        kind: "ALARM",
        status: "CLOSED",
        unitId,
        unitName: n.unitName || startEvent?.unitName || "—",
        stationId: n.stationId || startEvent?.stationId || null,
        stationName: n.stationName || startEvent?.stationName || null,
        severity: startEvent?.severity || n.severity || SEVERITY.LOW,
        category: startEvent?.category || n.category || "Alarm",
        reason: startEvent?.reason || n.reason || "—",
        startISO: startEvent?.tsISO || null,
        endISO: n.tsISO || null,
        durationMs,
        durationLabel: formatDurationMs(durationMs),
        businessDate: startEvent?.businessDate || n.businessDate || null,
        shiftKey: startEvent?.shiftKey || n.shiftKey || null,
        sourceType: startEvent?.sourceType || n.sourceType || SOURCE_TYPE.SYSTEM,
        text: startEvent?.text || n.text || "",
      });

      delete activeAlarmMap[unitId];
      delete openAlarmStartMap[unitId];
    }
  });

  Object.values(openAlarmStartMap).forEach((n) => {
    const ts = n?.tsISO ? Date.parse(n.tsISO) : NaN;
    if (!Number.isFinite(ts) || now - ts > ALARM_HOLD_MS) return;

    const durationMs = Math.max(0, now - ts);
    sessions.push({
      id: `open-alarm-${n.id}`,
      kind: "ALARM",
      status: "ACTIVE",
      unitId: n.unitId,
      unitName: n.unitName || "—",
      stationId: n.stationId || null,
      stationName: n.stationName || null,
      severity: n.severity || SEVERITY.LOW,
      category: n.category || "Alarm",
      reason: n.reason || "—",
      startISO: n.tsISO || null,
      endISO: null,
      durationMs,
      durationLabel: formatDurationMs(durationMs),
      businessDate: n.businessDate || null,
      shiftKey: n.shiftKey || null,
      sourceType: n.sourceType || SOURCE_TYPE.SYSTEM,
      text: n.text || "",
    });
  });

  sessions.sort((a, b) => Date.parse(b.startISO || 0) - Date.parse(a.startISO || 0));

  return {
    liveLog,
    activeAlarmMap,
    openAlarmStartMap,
    sessionHistory: sessions,
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
    .sort((a, b) => b.count - a.count)
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
      count: 0,
    };
  });

  (sessionHistory || []).forEach((item) => {
    const ts = item?.startISO ? Date.parse(item.startISO) : NaN;
    if (!Number.isFinite(ts)) return;
    const bucket = buckets.find((b) => ts >= b.start && ts < b.end);
    if (bucket) bucket.count += 1;
  });

  return buckets.map(({ label, count }) => ({ label, value: count }));
}

function buildAlarmAnalytics(sessionHistory, activeAlarmMap, liveLog) {
  const alarmSessions = (sessionHistory || []).filter((n) => n.kind === "ALARM");
  const activeAlarms = alarmSessions.filter((n) => n.status === "ACTIVE");
  const closedAlarms = alarmSessions.filter((n) => n.status === "CLOSED");

  const byReason = buildMixByField(alarmSessions, "reason", 8);
  const byCategory = buildMixByField(alarmSessions, "category", 8);
  const bySeverity = buildMixByField(alarmSessions, "severity", 6);
  const byUnit = buildUnitComparisonRows(alarmSessions);
  const hourlyTrend = buildHourlyTrend(alarmSessions);

  const repeatedHotspots = byReason.filter((item) => Number(item.value || 0) >= 2).slice(0, 6);

  const avgAlarmMin = closedAlarms.length
    ? closedAlarms.reduce((sum, item) => sum + Number(item.durationMs || 0), 0) / closedAlarms.length / 60000
    : 0;

  const topActive = [...activeAlarms].sort((a, b) => Number(b.durationMs || 0) - Number(a.durationMs || 0))[0] || null;
  const latestLive = liveLog?.[0] || null;

  return {
    total: alarmSessions.length,
    active: activeAlarms.length || Object.keys(activeAlarmMap || {}).length,
    closed: closedAlarms.length,
    avgAlarmMin,
    byReason,
    byCategory,
    bySeverity,
    byUnit,
    hourlyTrend,
    repeatedHotspots,
    topActive,
    latestLive,
  };
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
              wordBreak: "normal",
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
                wordBreak: "normal",
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
      <div
        style={{
          color: PAGE.subtext,
          fontSize: 12,
          lineHeight: 1.3,
          whiteSpace: "normal",
          wordBreak: "normal",
          overflowWrap: "break-word",
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: PAGE.text,
          fontWeight: 900,
          fontSize: 20,
          lineHeight: 1.2,
          marginTop: 6,
          whiteSpace: "normal",
          wordBreak: "normal",
          overflowWrap: "break-word",
        }}
      >
        {value}
      </div>
      {subvalue ? (
        <div
          style={{
            color: PAGE.subtext,
            fontSize: 12,
            marginTop: 6,
            lineHeight: 1.35,
            whiteSpace: "normal",
            wordBreak: "normal",
            overflowWrap: "break-word",
          }}
        >
          {subvalue}
        </div>
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
          wordBreak: "normal",
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
              wordBreak: "normal",
              overflowWrap: "break-word",
            }}
          >
            {item.label}
          </div>
          <div
            style={{
              color: PAGE.subtext,
              fontWeight: 800,
              whiteSpace: "nowrap",
              paddingLeft: 4,
            }}
          >
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
                  wordBreak: "normal",
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

function MiniTrendChart({ rows }) {
  const maxValue = Math.max(1, ...rows.map((r) => Number(r?.value || 0)));

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))`,
        gap: 10,
        alignItems: "end",
        height: 220,
      }}
    >
      {rows.map((row, idx) => {
        const value = Number(row?.value || 0);
        const h = `${(value / maxValue) * 100}%`;

        return (
          <div
            key={`${row.label}-${idx}`}
            style={{
              display: "grid",
              gridTemplateRows: "auto 1fr auto",
              gap: 8,
              height: "100%",
              alignItems: "end",
            }}
          >
            <div style={{ textAlign: "center", color: PAGE.text, fontWeight: 800, fontSize: 11 }}>{value}</div>

            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "end",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 18,
                  height: h,
                  minHeight: value > 0 ? 10 : 0,
                  borderRadius: 999,
                  background: PAGE.accent,
                  boxShadow: `0 0 12px ${PAGE.accent}`,
                }}
              />
            </div>

            <div
              style={{
                textAlign: "center",
                color: PAGE.subtext,
                fontSize: 11,
                whiteSpace: "nowrap",
              }}
            >
              {row.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActiveAlarmBoard({ rows, onFocus, onClear }) {
  if (!rows.length) {
    return <Typography sx={{ color: PAGE.subtext }}>No active live alarms right now.</Typography>;
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
              <div
                style={{
                  color: PAGE.text,
                  fontWeight: 900,
                  lineHeight: 1.3,
                  whiteSpace: "normal",
                  wordBreak: "normal",
                  overflowWrap: "break-word",
                }}
              >
                {row.unitName}
              </div>
              <div style={{ color: PAGE.subtext, fontSize: 12, marginTop: 4 }}>
                {row.stationName ? `Station ${row.stationName}` : "Unit Level"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <Chip size="small" label={row.category || "Alarm"} variant="outlined" color="warning" />
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
              <div style={{ color: PAGE.muted, fontSize: 11 }}>Subject</div>
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
            <Button variant="outlined" color="warning" startIcon={<WarningAmberRoundedIcon />} onClick={() => onClear?.(row.unitId)}>
              Clear Alarm
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
  typeFilter,
  setTypeFilter,
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
          placeholder="Search unit / station / subject / type"
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
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <MenuItem value="ALL">All Types</MenuItem>
              {ALARM_TYPE_CATALOG.map((item) => (
                <MenuItem key={item.code} value={item.label}>
                  {item.label}
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
          {sessionHistory.length === 0 ? "No live alarm sessions in the last 24 hours." : "No results for current filters."}
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
                        wordBreak: "normal",
                        overflowWrap: "break-word",
                      }}
                    >
                      {n.unitName || "—"}
                    </Typography>
                    <Typography
                      sx={{
                        color: PAGE.subtext,
                        fontSize: mobileSizing ? 13 : 12,
                        lineHeight: 1.35,
                      }}
                    >
                      Live Alarm Session
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
                  {n.stationName ? (
                    <Chip size="small" label={`Station ${n.stationName}`} variant="outlined" sx={{ color: PAGE.muted }} />
                  ) : null}
                  {n.sourceType ? (
                    <Chip size="small" label={n.sourceType} variant="outlined" sx={{ color: PAGE.muted }} />
                  ) : null}
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

function AlarmPulse({ w, h, enabled }) {
  const ringRef = useRef(null);

  useFrame((state) => {
    if (!ringRef.current) return;
    if (!enabled) {
      ringRef.current.visible = false;
      return;
    }

    ringRef.current.visible = true;
    const t = state.clock.getElapsedTime();
    const k = 0.88 + (Math.sin(t * 3.2) * 0.5 + 0.5) * 0.22;
    ringRef.current.scale.set(k, 1, k);
    ringRef.current.position.y = 0.08 + (Math.sin(t * 2.6) * 0.5 + 0.5) * 0.02;
  });

  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[Math.max(w, h) * 0.58, Math.max(w, h) * 0.72, 48]} />
      <meshStandardMaterial color={COLOR_YELLOW} transparent opacity={0.32} emissive={COLOR_YELLOW} emissiveIntensity={0.35} />
    </mesh>
  );
}

function UnitBox3D({ unit, isSelected, isHovered, onSelect, onHoverChange, zoomDist, isAlarmHeld }) {
  const { x, y, w, h } = unit.layout;

  const height = 0.12;
  const borderUp = isSelected ? 0.03 : 0;

  const baseColor = baseLineColor(unit.status);
  const topColor = isAlarmHeld ? COLOR_YELLOW : baseColor;
  const unitSize = Math.max(w, h);
  const active = isSelected || isHovered || isAlarmHeld;
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
          emissive={isAlarmHeld ? COLOR_YELLOW : isHovered ? "#0ea5e9" : "#000000"}
          emissiveIntensity={isAlarmHeld ? 0.22 : isHovered ? 0.18 : 0}
        />
      </mesh>

      <mesh position={[0, (height + borderUp) / 2 + 0.01, 0]}>
        <boxGeometry args={[w * 0.96, 0.02, h * 0.96]} />
        <meshStandardMaterial color={topColor} transparent opacity={0.94} />
      </mesh>

      <AlarmPulse w={w} h={h} enabled={!!isAlarmHeld} />

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
  activeAlarmMap,
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
          isAlarmHeld={!!activeAlarmMap[u.id]}
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
  activeAlarmMap,
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
            Plant 3 — Live Alarm Center
          </Typography>
          <Typography sx={{ color: PAGE.subtext, fontSize: 12 }} noWrap>
            Operator calls • Quality • Maintenance • Material • Supervisor
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
              activeAlarmMap={activeAlarmMap}
              focusUnitId={focusUnitId}
              onFocusDone={onFocusDone}
            />
          </Canvas>
        </Box>
      </Box>
    </Box>
  );
}

function alarmTypeIcon(type) {
  if (type === "Supervisor") return <CampaignRoundedIcon fontSize="small" />;
  if (type === "Maintenance") return <EngineeringRoundedIcon fontSize="small" />;
  if (type === "Quality") return <VerifiedRoundedIcon fontSize="small" />;
  return <Inventory2RoundedIcon fontSize="small" />;
}

export default function AlarmsPage() {
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
  const isCompact = useMediaQuery("(max-width: 1360px)");
  

  const { unread, log, pushAlarm, clearAll, startEngine } = useAlarmCenter();

  useEffect(() => {
    startEngine?.();
  }, [startEngine]);

  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [zoomDist, setZoomDist] = useState(null);

  const [focusUnitId, setFocusUnitId] = useState(null);
  const selectedUnit = useMemo(() => units.find((u) => u.id === selectedId) || null, [units, selectedId]);

  const [alarmType, setAlarmType] = useState("");
  const [alarmSubject, setAlarmSubject] = useState("");
  const [alarmDetails, setAlarmDetails] = useState("");

  const selectedAlarmType = useMemo(
    () => ALARM_TYPE_CATALOG.find((c) => c.label === alarmType) || null,
    [alarmType]
  );
  const subjectsForType = useMemo(() => selectedAlarmType?.subjects || [], [selectedAlarmType]);

  const [ttsEnabled, setTtsEnabled] = useState(true);
  const lastSpokenIdRef = useRef(null);

  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [desktopSortKey, setDesktopSortKey] = useState("count");

  const { liveLog, activeAlarmMap, openAlarmStartMap, sessionHistory } = useMemo(() => deriveAlarmState(log || []), [log]);

  const analytics = useMemo(
    () => buildAlarmAnalytics(sessionHistory, activeAlarmMap, liveLog),
    [sessionHistory, activeAlarmMap, liveLog]
  );

  const activeAlarmIds = useMemo(() => Object.keys(activeAlarmMap), [activeAlarmMap]);

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();

    return sessionHistory.filter((n) => {
      const sevOk = sevFilter === "ALL" ? true : n.severity === sevFilter;
      const typeOk = typeFilter === "ALL" ? true : n.category === typeFilter;
      const text = [n.unitName, n.stationName, n.category, n.reason, n.shiftKey, n.sourceType, n.businessDate]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const qOk = q.length === 0 ? true : text.includes(q);
      return sevOk && typeOk && qOk;
    });
  }, [sessionHistory, search, sevFilter, typeFilter]);

  const selectedUnitDetail = useMemo(() => {
    if (!selectedUnit) return null;
    const rows = sessionHistory.filter((n) => n.unitId === selectedUnit.id);
    const activeRows = rows.filter((n) => n.status === "ACTIVE");
    const closedRows = rows.filter((n) => n.status === "CLOSED");

    const totalMin = Math.round(rows.reduce((sum, item) => sum + Number(item.durationMs || 0), 0) / 60000);
    const avgMin = closedRows.length
      ? closedRows.reduce((sum, item) => sum + Number(item.durationMs || 0), 0) / closedRows.length / 60000
      : 0;

    const topReason = buildMixByField(rows, "reason", 1)[0]?.label || "—";
    const topCategory = buildMixByField(rows, "category", 1)[0]?.label || "—";
    const latest = [...rows].sort((a, b) => Date.parse(b.startISO || 0) - Date.parse(a.startISO || 0))[0] || null;

    return {
      totalSessions: rows.length,
      activeSessions: activeRows.length,
      closedSessions: closedRows.length,
      totalMin,
      avgMin,
      topReason,
      topCategory,
      latest,
    };
  }, [selectedUnit, sessionHistory]);

  const unitComparisonRows = useMemo(() => {
    const rows = [...analytics.byUnit];
    if (desktopSortKey === "minutes") {
      rows.sort((a, b) => b.totalMinutes - a.totalMinutes);
    } else if (desktopSortKey === "active") {
      rows.sort((a, b) => b.activeCount - a.activeCount);
    } else {
      rows.sort((a, b) => b.count - a.count);
    }
    return rows;
  }, [analytics.byUnit, desktopSortKey]);

  const activeRows = useMemo(
    () => sessionHistory.filter((n) => n.status === "ACTIVE").sort((a, b) => Number(b.durationMs || 0) - Number(a.durationMs || 0)),
    [sessionHistory]
  );

  useEffect(() => {
    try {
      window.speechSynthesis?.getVoices?.();
      const h = () => window.speechSynthesis?.getVoices?.();
      window.speechSynthesis?.addEventListener?.("voiceschanged", h);
      return () => window.speechSynthesis?.removeEventListener?.("voiceschanged", h);
    } catch {
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (!ttsEnabled) return;
    if (!Array.isArray(log) || log.length === 0) return;

    const top = log[0];
    if (!top?.id) return;
    if (lastSpokenIdRef.current === top.id) return;
    lastSpokenIdRef.current = top.id;

    const type = String(top.eventType || "");
    const unit = top.unitName || "Unknown unit";
    const station = top.stationName ? `Station ${top.stationName}. ` : "";
    const cat = top.category || "Alarm";
    const reason = top.reason || "";

    if (type === EVENT_TYPE.ALARM_RAISE) {
      safeSpeak(`Live alarm. ${cat}. Unit ${unit}. ${station}${reason}.`, true, {
        preferFemale: true,
        lang: "en-US",
        pitch: 1.05,
      });
      return;
    }

    if (type === EVENT_TYPE.ALARM_CLEAR) {
      safeSpeak(`Alarm cleared. Unit ${unit}. ${station}System back to normal.`, true, {
        preferFemale: true,
        lang: "en-US",
        pitch: 1.05,
      });
    }
  }, [log, ttsEnabled]);

  const openAlarmDialog = useCallback((unit) => {
    if (!unit) return;
    setSelectedId(unit.id);
    setAlarmType("");
    setAlarmSubject("");
    setAlarmDetails("");
  }, []);

  const applyAlarmStart = useCallback(
    ({ unit, category, subject, details }) => {
      const tsISO = new Date().toISOString();

      const event = buildEventPayload({
        unit,
        tsISO,
        eventType: EVENT_TYPE.ALARM_RAISE,
        severity: category.severity,
        category: category.label,
        categoryCode: category.code,
        reason: subject,
        reasonCode: subject.toUpperCase().replace(/[^A-Z0-9]+/g, "_"),
        text: details?.trim() || `${category.label} request: ${subject}`,
        sourceType: SOURCE_TYPE.OPERATOR,
      });

      pushAlarm(event);
      setFocusUnitId(unit.id);
      setSelectedId(null);
      setAlarmType("");
      setAlarmSubject("");
      setAlarmDetails("");
    },
    [pushAlarm]
  );

  const applyAlarmClear = useCallback(
    (unitId) => {
      const unit = units.find((u) => u.id === unitId);
      if (!unit) return;

      const startEvent = openAlarmStartMap[unitId] || null;
      const tsISO = new Date().toISOString();
      const durationMs = startEvent?.tsISO ? Math.max(0, Date.parse(tsISO) - Date.parse(startEvent.tsISO)) : 0;

      const event = buildEventPayload({
        unit,
        tsISO,
        eventType: EVENT_TYPE.ALARM_CLEAR,
        severity: SEVERITY.LOW,
        category: startEvent?.category || "Alarm",
        categoryCode: startEvent?.categoryCode || "ALARM",
        reason: startEvent?.reason || "Alarm Cleared",
        reasonCode: "ALARM_CLEARED",
        text: `Alarm cleared. Active time ${formatDurationMs(durationMs)}.`,
        sourceType: SOURCE_TYPE.OPERATOR,
        linkedEventId: startEvent?.id || null,
      });

      pushAlarm(event);
    },
    [openAlarmStartMap, pushAlarm, units]
  );

  const handleSubmitAlarm = useCallback(() => {
    if (!selectedUnit || !selectedAlarmType || !alarmSubject) return;
    applyAlarmStart({
      unit: selectedUnit,
      category: selectedAlarmType,
      subject: alarmSubject,
      details: alarmDetails,
    });
  }, [selectedUnit, selectedAlarmType, alarmSubject, alarmDetails, applyAlarmStart]);

  const pad = isMobile ? 12 : isTablet ? 14 : 18;
  const framePad = isMobile ? 10 : isTablet ? 12 : 14;
  const canvasH = isMobile ? 560 : isTablet ? 640 : 760;
  const gridCols = isTablet || isMobile ? "1fr" : "minmax(0, 1.35fr) minmax(420px, 0.95fr)";

  const typeQuickCards = useMemo(
    () =>
      ALARM_TYPE_CATALOG.map((item) => ({
        ...item,
        count: analytics.byCategory.find((x) => x.label === item.label)?.value || 0,
      })),
    [analytics.byCategory]
  );

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
            Live Alarm Center
          </Typography>
          <Typography sx={{ color: PAGE.subtext }}>
            Alarm requests only. Downtime is handled in a separate downtime workflow.
          </Typography>
        </Box>

        <SectionGrid min={180} gap={10}>
          <KpiCard label="Total Alarm Sessions" value={formatNumber(analytics.total)} subvalue="24h live memory" tone="accent" />
          <KpiCard
            label="Active Live Alarms"
            value={formatNumber(analytics.active)}
            subvalue={`Units in alarm ${activeAlarmIds.length}`}
            tone={pickToneByCount(analytics.active)}
          />
          <KpiCard label="Closed Alarms" value={formatNumber(analytics.closed)} subvalue="Resolved alarm sessions" tone="success" />
          <KpiCard label="Avg Alarm Duration" value={formatMinutes(analytics.avgAlarmMin)} subvalue="Closed alarms only" tone="warn" />
          <KpiCard
            label="Latest Event"
            value={analytics.latestLive?.category || "—"}
            subvalue={analytics.latestLive?.reason || "No recent event"}
            tone="default"
          />
          <KpiCard label="Unread" value={formatNumber(unread)} subvalue={`Live buffer ${formatNumber(liveLog.length)}`} tone="purple" />
        </SectionGrid>

        <SectionGrid min={220} gap={10}>
          {typeQuickCards.map((item) => (
            <Card
              key={item.code}
              title={item.label}
              subtitle="Live alarm type"
              tone={item.code === "MAINTENANCE" ? "danger" : item.code === "QUALITY" ? "warn" : item.code === "SUPERVISOR" ? "accent" : "success"}
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
                  {alarmTypeIcon(item.label)}
                </div>
              }
            >
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 22 }}>{formatNumber(item.count)}</div>
                <div style={{ color: PAGE.subtext, fontSize: 12 }}>Events in the last 24h</div>
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
                  onSelect={openAlarmDialog}
                  heightPx={canvasH}
                  isMobile={isMobile}
                  onZoomUpdate={setZoomDist}
                  activeAlarmMap={activeAlarmMap}
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
                    <span>Active Alarm: {activeAlarmIds.length}</span>
                    <span>Sessions: {sessionHistory.length}</span>
                    <span>Buffer 24h: {liveLog.length}</span>
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

                    <Tooltip title={ttsEnabled ? "TTS enabled" : "TTS muted"} arrow>
                      <IconButton
                        size="small"
                        onClick={() => setTtsEnabled((v) => !v)}
                        sx={{
                          color: "rgba(255,255,255,0.78)",
                          border: `1px solid ${PAGE.borderSoft}`,
                          borderRadius: 2,
                          bgcolor: "rgba(255,255,255,0.03)",
                        }}
                      >
                        {ttsEnabled ? <VolumeUpRoundedIcon fontSize="small" /> : <VolumeOffRoundedIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Reset filters" arrow>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSearch("");
                          setSevFilter("ALL");
                          setTypeFilter("ALL");
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
                  title="Active Alarm Board"
                  subtitle="Operational live queue"
                  tone="danger"
                  right={
                    <div style={{ color: PAGE.subtext, fontWeight: 800, fontSize: 12 }}>
                      {formatNumber(activeRows.length)} active
                    </div>
                  }
                >
                  <ActiveAlarmBoard
                    rows={activeRows.slice(0, 6)}
                    onFocus={(unitId) => setFocusUnitId(unitId)}
                    onClear={(unitId) => applyAlarmClear(unitId)}
                  />
                </Card>

                <Card
                  title="Alarm Trend"
                  subtitle="Hourly alarm starts across the last 12 hours"
                  tone="accent"
                >
                  <MiniTrendChart rows={analytics.hourlyTrend} />
                </Card>
              </Box>
            </Box>
          </Box>
        </Box>

        <SectionGrid min={360}>
          <Card
            title="Top Units by Alarm Load"
            subtitle="Which units are generating the most live alarm traffic"
            tone="accent"
            right={
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                <SortButton active={desktopSortKey === "count"} onClick={() => setDesktopSortKey("count")}>
                  Count
                </SortButton>
                <SortButton active={desktopSortKey === "active"} onClick={() => setDesktopSortKey("active")}>
                  Active
                </SortButton>
                <SortButton active={desktopSortKey === "minutes"} onClick={() => setDesktopSortKey("minutes")}>
                  Minutes
                </SortButton>
              </Stack>
            }
          >
            <HorizontalBarChart
              rows={unitComparisonRows.map((row) => ({
                ...row,
                label: row.label,
                value: desktopSortKey === "minutes" ? row.totalMinutes : desktopSortKey === "active" ? row.activeCount : row.count,
              }))}
              valueKey="value"
              unit={desktopSortKey === "minutes" ? " min" : ""}
              onRowClick={(row) => setFocusUnitId(row.id)}
            />
          </Card>

          <Card
            title="Top Alarm Subjects"
            subtitle="Most repeated live alarm reasons"
            tone="warn"
          >
            <HorizontalBarChart
              rows={analytics.byReason.map((row) => ({
                ...row,
                value: row.value,
              }))}
              valueKey="value"
              unit=""
            />
          </Card>
        </SectionGrid>

        <SectionGrid min={360}>
          <Card
            title="Alarm Type Distribution"
            subtitle="Supervisor, maintenance, quality, and material call load"
            tone="success"
          >
            <LegendList items={analytics.byCategory} suffix=" count" />
          </Card>

          <Card
            title="Severity Distribution"
            subtitle="Current live alarm severity mix"
            tone="default"
          >
            <LegendList items={analytics.bySeverity} suffix=" count" />
          </Card>
        </SectionGrid>

        <SectionGrid min={360}>
          <Card
            title="Recurring Alarm Subjects"
            subtitle="Subjects that repeat enough to become preventive action candidates"
            tone="success"
          >
            {analytics.repeatedHotspots.length ? (
              <div style={{ display: "grid", gap: 10 }}>
                {analytics.repeatedHotspots.map((item, idx) => (
                  <div
                    key={`${item.label}-${idx}`}
                    style={{
                      border: `1px solid ${PAGE.border}`,
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 14,
                      padding: 12,
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div style={{ color: PAGE.text, fontWeight: 900 }}>{item.label}</div>
                    <div style={{ color: PAGE.subtext, fontSize: 12 }}>{formatNumber(item.value)} repeated calls</div>
                  </div>
                ))}
              </div>
            ) : (
              <Typography sx={{ color: PAGE.subtext }}>No recurring live alarm subject yet.</Typography>
            )}
          </Card>

          <Card
            title="Selected Unit Detail"
            subtitle="Unit-focused alarm summary"
            tone="default"
          >
            {!selectedUnit ? (
              <Typography sx={{ color: PAGE.subtext }}>Select a unit from the 3D map.</Typography>
            ) : (
              <Box sx={{ display: "grid", gap: 1.5 }}>
                <SectionGrid min={145} gap={10}>
                  <KpiCard label="Alarm Sessions" value={formatNumber(selectedUnitDetail?.totalSessions || 0)} tone="accent" />
                  <KpiCard
                    label="Active"
                    value={formatNumber(selectedUnitDetail?.activeSessions || 0)}
                    tone={pickToneByCount(selectedUnitDetail?.activeSessions || 0)}
                  />
                  <KpiCard label="Closed" value={formatNumber(selectedUnitDetail?.closedSessions || 0)} tone="success" />
                  <KpiCard label="Total Active/Closed Min" value={formatMinutes(selectedUnitDetail?.totalMin || 0)} tone="warn" />
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
                  <InfoLine label="Top Type" value={selectedUnitDetail?.topCategory} />
                  <InfoLine label="Top Subject" value={selectedUnitDetail?.topReason} />
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

        {!isCompact ? (
          <Card
            title="Alarm Session History"
            subtitle="24h live memory • tap item to focus unit"
            tone="default"
          >
            <SessionHistory
              sessionHistory={sessionHistory}
              filteredHistory={filteredHistory}
              search={search}
              setSearch={setSearch}
              sevFilter={sevFilter}
              setSevFilter={setSevFilter}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              onClear={clearAll}
              onResetFilters={() => {
                setSearch("");
                setSevFilter("ALL");
                setTypeFilter("ALL");
              }}
              onClickItem={(n) => {
                if (n?.unitId) setFocusUnitId(n.unitId);
              }}
              mobileSizing={false}
            />
          </Card>
        ) : (
          <Card
            title="Alarm Session History"
            subtitle="24h live memory • tap item to focus unit"
            tone="default"
            right={
              <Tooltip title="Open full history drawer" arrow>
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
                  <InsightsRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            }
          >
            <SessionHistory
              sessionHistory={sessionHistory}
              filteredHistory={filteredHistory.slice(0, 8)}
              search={search}
              setSearch={setSearch}
              sevFilter={sevFilter}
              setSevFilter={setSevFilter}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              onClear={clearAll}
              onResetFilters={() => {
                setSearch("");
                setSevFilter("ALL");
                setTypeFilter("ALL");
              }}
              onClickItem={(n) => {
                if (n?.unitId) setFocusUnitId(n.unitId);
              }}
              mobileSizing
            />
          </Card>
        )}
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
              Live Alarm Sessions
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
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            onClear={clearAll}
            onResetFilters={() => {
              setSearch("");
              setSevFilter("ALL");
              setTypeFilter("ALL");
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
          <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Raise Live Alarm — {selectedUnit?.name || "—"}</Typography>

          <Typography sx={{ color: "text.secondary", fontSize: 13, mb: 1 }}>
            This page is for live alarm requests only. Downtime is handled separately.
          </Typography>

          <Divider sx={{ mb: 2 }} />

          <Typography sx={{ fontWeight: 800, fontSize: 13, mb: 1 }}>Alarm Type</Typography>
          <Select
            value={alarmType}
            onChange={(e) => {
              setAlarmType(e.target.value);
              setAlarmSubject("");
            }}
            fullWidth
          >
            {ALARM_TYPE_CATALOG.map((c) => (
              <MenuItem key={c.code} value={c.label}>
                {c.label}
              </MenuItem>
            ))}
          </Select>

          <Typography sx={{ fontWeight: 800, fontSize: 13, mt: 2, mb: 1 }}>Subject</Typography>
          <Select
            value={alarmSubject}
            onChange={(e) => setAlarmSubject(e.target.value)}
            fullWidth
            disabled={!alarmType}
          >
            {subjectsForType.map((subject) => (
              <MenuItem key={subject} value={subject}>
                {subject}
              </MenuItem>
            ))}
          </Select>

          <Typography sx={{ fontWeight: 800, fontSize: 13, mt: 2, mb: 1 }}>Details</Typography>
          <TextField
            value={alarmDetails}
            onChange={(e) => setAlarmDetails(e.target.value)}
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
              onClick={handleSubmitAlarm}
              sx={{ flex: 1 }}
              disabled={!alarmType || !alarmSubject}
            >
              Submit Alarm
            </Button>
          </Stack>

          {selectedUnit?.id && activeAlarmMap[selectedUnit.id] ? (
            <Box sx={{ mt: 1.5, color: "text.secondary", fontSize: 12 }}>
              This unit already has an active live alarm. You can clear it from the Active Alarm Board.
            </Box>
          ) : null}
        </Box>
      </Dialog>
    </Box>
  );
}