import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Billboard, Text } from "@react-three/drei";
import { useMediaQuery } from "@mui/material";
import { getPlant3Units } from "../data/mock/plant3.units.mock";

const LAYOUT_SPREAD = 1.34;

const SHIFT_ORDER = ["A", "B", "C"];
const SHIFT_TOTAL_MIN = 480;
const PLANNED_BREAK_MIN = 40;
const NET_WORK_MIN = SHIFT_TOTAL_MIN - PLANNED_BREAK_MIN;
const DAILY_SHIFT_COUNT = 3;
const DAILY_NET_WORK_MIN = NET_WORK_MIN * DAILY_SHIFT_COUNT;
const DEFAULT_TOLERANCE_MIN = 5;

const MATERIAL_SUBJECT_OPTIONS = [
  "Shift Start Supply",
  "Mid Shift Refill",
  "Component Request",
  "Urgent Supply",
  "Lot Verification",
  "Other",
];

/**
 * Sample cell-specific component masters.
 * Later you can replace/extend this with uploaded per-cell forms.
 */
const COMPONENT_INVENTORY_MASTER = {
  "c1yx spoiler": {
    cellName: "C1YX Spoiler",
    items: [
      { partName: "YC RH EOL SEALS", partNumber: "380068B/26541021", defaultQty: 1 },
      { partName: "YC LH EOL SEALS", partNumber: "380069B/26541020", defaultQty: 1 },
      { partName: "YB RH EOL SEALS", partNumber: "380093B/26571989", defaultQty: 1 },
      { partName: "YB LH EOL SEALS", partNumber: "380094B/26571988", defaultQty: 1 },
      { partName: "LIGHT CONNECTOR WIRE HARNESS", partNumber: "380071A", defaultQty: 1 },
      { partName: "REAR SPOILER NOZZLE", partNumber: "380072A", defaultQty: 1 },
      { partName: "REAR CAMERA NOZZLE", partNumber: "380073B", defaultQty: 1 },
      { partName: "EDGE SEAL", partNumber: "380075A", defaultQty: 1 },
      { partName: "GLASS SEAL", partNumber: "380076A", defaultQty: 1 },
      { partName: "CAMERA", partNumber: "380077A", defaultQty: 1 },
      { partName: "CAMERA SCREW", partNumber: "380078A", defaultQty: 2 },
      { partName: "OVAL SEAL", partNumber: "380079A", defaultQty: 1 },
      { partName: "T-STUD", partNumber: "386340", defaultQty: 2 },
      { partName: "O RING NUT", partNumber: "386344", defaultQty: 2 },
      { partName: "LONG SPOILER SCREW", partNumber: "386450", defaultQty: 2 },
      { partName: "J CLIP", partNumber: "386600", defaultQty: 2 },
      { partName: "ROUND SEAL", partNumber: "386635", defaultQty: 1 },
      { partName: "YC WIRE HARNESS ANTENNA", partNumber: "380074B", defaultQty: 1 },
      { partName: "YB WIRE HARNESS ANTENNA", partNumber: "380098B", defaultQty: 1 },
      { partName: "FOL SEAL", partNumber: "393050", defaultQty: 1 },
      { partName: "CHMSL LIGHT", partNumber: "380070A", defaultQty: 1 },
      { partName: "ANTENNA TAPE", partNumber: "371494", defaultQty: 1 },
      { partName: "YB CAMERA BRACKET", partNumber: "724110000B", defaultQty: 1 },
      { partName: "YC CAMERA BRACKET", partNumber: "723780000B", defaultQty: 1 },
      { partName: "CHMSL FOAM", partNumber: "310404", defaultQty: 1 },
    ],
  },
  "c1xx spoiler": {
    cellName: "C1XX Spoiler",
    items: [
      { partName: "XC RH EOL SEALS", partNumber: "480068B/36541021", defaultQty: 1 },
      { partName: "XC LH EOL SEALS", partNumber: "480069B/36541020", defaultQty: 1 },
      { partName: "REAR CAMERA", partNumber: "480077A", defaultQty: 1 },
      { partName: "CAMERA SCREW", partNumber: "480078A", defaultQty: 2 },
      { partName: "WIRE HARNESS", partNumber: "480071A", defaultQty: 1 },
      { partName: "GLASS SEAL", partNumber: "480076A", defaultQty: 1 },
      { partName: "ROUND SEAL", partNumber: "486635", defaultQty: 1 },
      { partName: "ANTENNA TAPE", partNumber: "471494", defaultQty: 1 },
    ],
  },
};

const PAGE = {
  padding: 16,
  gap: 12,
  bg: "#0b0f14",
  panel: "#111826",
  panel2: "#0f1623",
  border: "rgba(255,255,255,0.08)",
  text: "rgba(255,255,255,0.92)",
  subtext: "rgba(255,255,255,0.65)",
  accent: "rgba(56,189,248,0.95)",
  success: "#22c55e",
  warn: "#f59e0b",
  danger: "#ef4444",
  info: "#38bdf8",
  purple: "#a855f7",
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

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function formatNumber(n) {
  const value = Number(n || 0);
  return Number.isFinite(value) ? value.toLocaleString() : "0";
}

function formatMinutes(n) {
  return `${formatNumber(n)} min`;
}

function formatPercent(n) {
  const value = Number(n || 0);
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

function statusColor(status) {
  if (status === "RUNNING") return PAGE.success;
  if (status === "ATTN") return PAGE.warn;
  return PAGE.danger;
}

function formatUnitStatus(u) {
  return u?.status || u?.runtime?.status || "—";
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

function getShiftLabelFromCardKey(key) {
  return SHIFT_META[key]?.label || "—";
}

function toSafeNumber(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function toDateSafe(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function normalizeShiftProductionRow(row = {}) {
  return {
    ok: toSafeNumber(row.ok, row.good, row.goodQty, row.producedGood, row.accepted, row.pass),
    ng: toSafeNumber(row.ng, row.fail, row.bad, row.reject, row.rejected, row.nok, row.scrap, row.defect),
    suspect: toSafeNumber(row.suspect, row.hold, row.quarantine, row.pendingReview),
  };
}

function buildMergedDailyProductionFromNormalized(normalizedTotals = {}) {
  return SHIFT_ORDER.reduce(
    (acc, key) => {
      const row = normalizedTotals[key] || {};
      acc.ok += Number(row.ok || 0);
      acc.ng += Number(row.ng || 0);
      acc.suspect += Number(row.suspect || 0);
      return acc;
    },
    { ok: 0, ng: 0, suspect: 0 }
  );
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

function getCanonicalRuntime(unit) {
  if (!unit) return null;
  return unit.runtime || unit.mock || null;
}

function getCanonicalStatus(unit) {
  return unit?.status || getCanonicalRuntime(unit)?.status || "DOWN";
}

function getCanonicalMessages(unit) {
  return getCanonicalRuntime(unit)?.messages || [];
}

function getCanonicalShiftKey(unit) {
  const runtime = getCanonicalRuntime(unit);
  const raw = runtime?.activeShift || getCurrentPlantShiftKey();
  return SHIFT_ORDER.includes(raw) ? raw : getCurrentPlantShiftKey();
}

function buildCanonicalPartTargetConfig(unit, activeJob) {
  const runtime = getCanonicalRuntime(unit);
  const targetConfig = runtime?.targetConfig || unit?.targetConfig || {};

  return {
    stationId: unit?.id || "",
    internalPartCode: activeJob?.internalPartCode || targetConfig?.internalPartCode || "",
    customerPartNumber: activeJob?.customerPartNumber || targetConfig?.customerPartNumber || "",
    partName: activeJob?.partName || targetConfig?.partName || "",
    targetPerHour: toSafeNumber(targetConfig?.targetPerHour, targetConfig?.uph, targetConfig?.piecesPerHour),
    idealCycleSec: toSafeNumber(targetConfig?.idealCycleSec, targetConfig?.cycleSec, targetConfig?.stdCycleSec),
    packQty: toSafeNumber(targetConfig?.packQty, targetConfig?.packQuantity),
    changePackQty: toSafeNumber(targetConfig?.changePackQty),
    containerCapacity: toSafeNumber(targetConfig?.containerCapacity, targetConfig?.containerQty),
    version: targetConfig?.version || "v1",
    effectiveFrom: targetConfig?.effectiveFrom || null,
    effectiveTo: targetConfig?.effectiveTo || null,
    isActive: targetConfig?.isActive !== false,
  };
}

function buildCanonicalActiveJob(unit) {
  const runtime = getCanonicalRuntime(unit);
  const raw = runtime?.activeJob || runtime?.currentJob || null;
  if (!raw) return null;

  return {
    jobId: raw.jobId || raw.id || null,
    orderNo: raw.orderNo || raw.workOrder || raw.order || "",
    internalPartCode: raw.internalPartCode || raw.internalNumber || raw.partCode || "",
    customerPartNumber: raw.customerPartNumber || raw.customerNumber || "",
    partName: raw.partName || raw.name || "",
    arNumber: raw.arNumber || raw.ar || "",
    customerReference: raw.customerReference || raw.reference || "",
    scheduledQty: toSafeNumber(raw.scheduledQty, raw.targetQty, raw.orderQty),
    producedQty: toSafeNumber(raw.producedQty, raw.actualQty, raw.completedQty),
    remainingQty: toSafeNumber(raw.remainingQty),
    completionPct: toSafeNumber(raw.completionPct),
    startedAt: raw.startedAt || raw.startTime || null,
    status: raw.status || "active",
  };
}

function buildCanonicalShiftTotals(unit) {
  const runtime = getCanonicalRuntime(unit);
  const rawTotals = runtime?.shiftTotals || unit?.shiftTotals || {};

  return SHIFT_ORDER.reduce((acc, key) => {
    acc[key] = normalizeShiftProductionRow(rawTotals[key] || {});
    return acc;
  }, {});
}

function buildCanonicalProductionHistory(unit) {
  const runtime = getCanonicalRuntime(unit);
  return runtime?.productionHistory || null;
}

function buildCanonicalCompletedJobs(unit) {
  const runtime = getCanonicalRuntime(unit);
  return runtime?.completedJobsToday || [];
}

function buildCanonicalDowntimeBase(unit) {
  const runtime = getCanonicalRuntime(unit);
  return runtime?.downtime || unit?.mock?.downtime || unit?.downtime || null;
}

function getStationMaterialOptions(unit) {
  if (!unit) return [];
  const runtime = getCanonicalRuntime(unit);
  const raw = runtime?.materialMaster || unit?.materialMaster || unit?.mock?.materialMaster || [];

  return (raw || [])
    .map((item, index) => ({
      id: item.id || `${unit.id}::MAT-${index}`,
      materialId: item.materialId || item.id || `${unit.id}::MAT-${index}`,
      partNumber: item.partNumber || item.code || item.partCode || "",
      partName: item.partName || item.name || item.description || "",
      category: item.category || "",
      uom: item.uom || item.unit || "pcs",
      lotRequired: item.lotRequired !== false,
      activeFlag: item.activeFlag !== false,
    }))
    .filter((item) => item.activeFlag);
}

function normalizeInventoryKey(value) {
  return String(value || "").trim().toLowerCase();
}

function getInventoryMasterByCellName(cellName) {
  return COMPONENT_INVENTORY_MASTER[normalizeInventoryKey(cellName)] || null;
}

function getInventoryItemsForCellName(cellName) {
  return getInventoryMasterByCellName(cellName)?.items || [];
}

function findInventoryItemByPartName(cellName, partName) {
  const items = getInventoryItemsForCellName(cellName);
  return items.find((item) => item.partName === partName) || null;
}

function getInventoryCellOptions(unit, allUnits = []) {
  const fromMaster = Object.values(COMPONENT_INVENTORY_MASTER).map((entry) => entry.cellName);
  const fromSelectedUnit = unit?.name ? [unit.name] : [];
  const fromAllUnits = (allUnits || []).map((item) => item?.name).filter(Boolean);

  return Array.from(new Set([...fromSelectedUnit, ...fromAllUnits, ...fromMaster])).sort((a, b) =>
    String(a).localeCompare(String(b))
  );
}

function buildDowntimeAnalytics(unit, extraManualEntries = []) {
  const baseDowntime = buildCanonicalDowntimeBase(unit) || {};
  const systemEntries = [...(baseDowntime.systemEntries || [])];
  const manualEntries = [...(baseDowntime.manualEntries || []), ...(extraManualEntries || [])];
  const toleranceMin = Number(baseDowntime?.toleranceMin || DEFAULT_TOLERANCE_MIN);

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
    const availableWorkMin = NET_WORK_MIN;
    const unplannedMin = Math.round(row.unplannedMerged);
    const operatingMin = Math.max(0, availableWorkMin - unplannedMin);

    return {
      shiftKey: key,
      label: SHIFT_META[key].shortLabel,
      availableWorkMin,
      plannedMin: Math.round(row.planned),
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
      acc.availableWorkMin += row.availableWorkMin;
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
      availableWorkMin: 0,
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
      availableWorkMin: Math.round(daily.availableWorkMin),
      systemUnplannedMin: Math.round(daily.systemUnplannedMin),
      manualUnplannedMin: Math.round(daily.manualUnplannedMin),
      unplannedMergedMin: Math.round(daily.unplannedMergedMin),
      operatingMin: Math.round(daily.operatingMin),
      allActualMin: Math.round(daily.allActualMin),
      downtimePctOfNet: daily.availableWorkMin > 0 ? Number(((daily.unplannedMergedMin / daily.availableWorkMin) * 100).toFixed(1)) : 0,
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

function buildCanonicalRuntimeSnapshot(unit, extraManualEntries = [], materialRequests = []) {
  if (!unit) return null;

  const activeJob = buildCanonicalActiveJob(unit);
  const shiftTotals = buildCanonicalShiftTotals(unit);
  const productionHistory = buildCanonicalProductionHistory(unit);
  const completedJobsToday = buildCanonicalCompletedJobs(unit);
  const baseDowntime = buildCanonicalDowntimeBase(unit) || {};
  const partTargetConfig = buildCanonicalPartTargetConfig(unit, activeJob);
  const activeShift = getCanonicalShiftKey(unit);
  const downtimeAnalytics = buildDowntimeAnalytics(unit, extraManualEntries);

  const openMaterialRequests = (materialRequests || []).filter((req) =>
    ["requested", "acknowledged", "in_progress", "partially_fulfilled"].includes(req.requestStatus)
  );

  return {
    unitId: unit.id,
    unitName: unit.name,
    status: getCanonicalStatus(unit),
    activeShift,
    messages: getCanonicalMessages(unit),
    activeJob,
    partTargetConfig,
    shiftTotals,
    productionHistory,
    completedJobsToday,
    downtime: {
      raw: baseDowntime,
      analytics: downtimeAnalytics,
    },
    material: {
      stationMaterials: getStationMaterialOptions(unit),
      allRequests: materialRequests || [],
      openRequests: openMaterialRequests,
    },
  };
}

function buildMaterialRequestEvent({ unit, shiftKey, activeJob, draft }) {
  const nowIso = new Date().toISOString();
  const selectedInventoryItem = findInventoryItemByPartName(draft.cellName, draft.partName);

  return {
    id: `${unit?.id || "UNIT"}::MATREQ::${Date.now()}`,
    plantId: unit?.plantId || "plant-3",
    cellId: draft.cellName || unit?.cellId || unit?.cell || "",
    cellName: draft.cellName || unit?.name || "",
    unitId: unit?.id || "",
    stationId: unit?.id || "",
    shiftKey,
    requestType: "material_requirement",
    requestStatus: "requested",
    targetDepartment: "warehouse",
    notificationMode: "dashboard",
    requestedAt: nowIso,
    acknowledgedAt: null,
    fulfilledAt: null,
    cancelledAt: null,
    requestedByRole: "operator",
    requestedByName: "Operator",
    subject: draft.subject || "",
    quantityRequested: Math.max(1, Number(draft.quantity || 0)),
    partName: draft.partName || selectedInventoryItem?.partName || "",
    partNumber: draft.partNumber || selectedInventoryItem?.partNumber || "",
    materialId: draft.partNumber || selectedInventoryItem?.partNumber || "",
    category: "Component Inventory",
    uom: "pcs",
    note: draft.note || "",
    activeJobSnapshot: activeJob
      ? {
          jobId: activeJob.jobId || null,
          orderNo: activeJob.orderNo || "",
          internalPartCode: activeJob.internalPartCode || "",
          customerPartNumber: activeJob.customerPartNumber || "",
          partName: activeJob.partName || "",
          arNumber: activeJob.arNumber || "",
        }
      : null,
    inventoryImpact: {
      deductOnFulfillment: true,
      deductionStatus: "pending_warehouse",
      riskStatus: "unknown",
    },
    audit: {
      createdAt: nowIso,
      updatedAt: nowIso,
      version: 1,
    },
  };
}

function Button({ label, onClick, kind = "primary", disabled = false }) {
  const bg = kind === "primary" ? "rgba(56,189,248,0.14)" : "rgba(255,255,255,0.06)";
  const bd = kind === "primary" ? "rgba(56,189,248,0.28)" : "rgba(255,255,255,0.10)";

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        minWidth: 0,
        minHeight: 38,
        padding: "8px 12px",
        borderRadius: 12,
        border: `1px solid ${bd}`,
        background: bg,
        color: disabled ? "rgba(255,255,255,0.45)" : PAGE.text,
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 800,
        letterSpacing: 0.2,
        transition: "transform 140ms ease, filter 140ms ease, box-shadow 140ms ease",
        userSelect: "none",
        whiteSpace: "normal",
        overflowWrap: "anywhere",
        opacity: disabled ? 0.7 : 1,
      }}
      onMouseDown={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = "scale(0.98)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "none";
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.filter = "brightness(1.06)";
        e.currentTarget.style.boxShadow = "0 14px 40px rgba(0,0,0,0.35)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.filter = "none";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {label}
    </button>
  );
}

function Panel({ title, children, right }) {
  return (
    <div
      style={{
        minWidth: 0,
        width: "100%",
        border: `1px solid ${PAGE.border}`,
        background: PAGE.panel,
        borderRadius: 18,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          borderBottom: `1px solid ${PAGE.border}`,
          background: "rgba(255,255,255,0.02)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ color: PAGE.text, fontWeight: 900, minWidth: 0, overflowWrap: "anywhere" }}>{title}</div>
        <div style={{ minWidth: 0, maxWidth: "100%" }}>{right}</div>
      </div>
      <div style={{ padding: 14, minWidth: 0 }}>{children}</div>
    </div>
  );
}

function KpiCard({ label, value, accent = false, tone = "default" }) {
  const toneMap = {
    default: {
      border: accent ? "1px solid rgba(56,189,248,0.32)" : `1px solid ${PAGE.border}`,
      bg: accent ? "rgba(56,189,248,0.08)" : "rgba(255,255,255,0.03)",
    },
    success: {
      border: "1px solid rgba(34,197,94,0.28)",
      bg: "rgba(34,197,94,0.08)",
    },
    warn: {
      border: "1px solid rgba(245,158,11,0.28)",
      bg: "rgba(245,158,11,0.08)",
    },
    danger: {
      border: "1px solid rgba(239,68,68,0.28)",
      bg: "rgba(239,68,68,0.08)",
    },
    purple: {
      border: "1px solid rgba(168,85,247,0.28)",
      bg: "rgba(168,85,247,0.08)",
    },
    info: {
      border: "1px solid rgba(56,189,248,0.28)",
      bg: "rgba(56,189,248,0.08)",
    },
  };

  const skin = toneMap[tone] || toneMap.default;

  return (
    <div
      style={{
        minWidth: 0,
        border: skin.border,
        background: skin.bg,
        borderRadius: 16,
        padding: "12px 14px",
      }}
    >
      <div style={{ color: PAGE.subtext, fontSize: 12, marginBottom: 8 }}>{label}</div>
      <div
        style={{
          color: PAGE.text,
          fontWeight: 900,
          fontSize: 18,
          lineHeight: 1.3,
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function InfoLine({ label, value }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(100px, 140px) minmax(0, 1fr)",
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
          overflowWrap: "anywhere",
          wordBreak: "break-word",
          minWidth: 0,
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function MiniBar({ value, color = "linear-gradient(90deg, rgba(56,189,248,0.92), rgba(34,197,94,0.9))" }) {
  return (
    <div
      style={{
        height: 10,
        borderRadius: 999,
        overflow: "hidden",
        background: "rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          width: `${clamp(Number(value || 0), 0, 100)}%`,
          height: "100%",
          background: color,
        }}
      />
    </div>
  );
}

function DonutChart({ items, size = 180 }) {
  const safeItems = (items || []).filter((x) => Number(x?.value || 0) > 0);
  const total = safeItems.reduce((sum, item) => sum + Number(item.value || 0), 0);

  if (!safeItems.length || total <= 0) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: `1px solid ${PAGE.border}`,
          display: "grid",
          placeItems: "center",
          color: PAGE.subtext,
          background: "rgba(255,255,255,0.03)",
          flexShrink: 0,
        }}
      >
        No data
      </div>
    );
  }

  const colors = ["#38bdf8", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#14b8a6", "#f97316", "#64748b"];

  let start = 0;
  const segments = safeItems.map((item, idx) => {
    const value = Number(item.value || 0);
    const angle = (value / total) * 360;
    const segment = `${colors[idx % colors.length]} ${start}deg ${start + angle}deg`;
    start += angle;
    return segment;
  });

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `conic-gradient(${segments.join(", ")})`,
        position: "relative",
        flexShrink: 0,
        border: `1px solid ${PAGE.border}`,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "22%",
          borderRadius: "50%",
          background: PAGE.panel,
          border: `1px solid ${PAGE.border}`,
          display: "grid",
          placeItems: "center",
          textAlign: "center",
          padding: 8,
        }}
      >
        <div>
          <div style={{ color: PAGE.subtext, fontSize: 11 }}>Total</div>
          <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 20 }}>{total}</div>
        </div>
      </div>
    </div>
  );
}

function LegendList({ items, suffix = "" }) {
  const colors = ["#38bdf8", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#14b8a6", "#f97316", "#64748b"];

  return (
    <div style={{ display: "grid", gap: 8, minWidth: 0, width: "100%" }}>
      {(items || []).map((item, idx) => (
        <div
          key={`${item.label}-${idx}`}
          style={{
            display: "grid",
            gridTemplateColumns: "14px minmax(0, 1fr) auto",
            gap: 10,
            alignItems: "center",
            minWidth: 0,
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 99,
              background: colors[idx % colors.length],
              display: "inline-block",
            }}
          />
          <div
            style={{
              color: PAGE.text,
              fontWeight: 700,
              minWidth: 0,
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            }}
          >
            {item.label}
          </div>
          <div style={{ color: PAGE.subtext, fontWeight: 800, whiteSpace: "nowrap" }}>
            {item.value}
            {suffix}
          </div>
        </div>
      ))}
    </div>
  );
}

function GroupedBarChart({ rows }) {
  const maxValue = Math.max(
    1,
    ...((rows || []).flatMap((r) => [Number(r.system || 0), Number(r.manual || 0), Number(r.merged || 0)]))
  );

  return (
    <div style={{ display: "grid", gap: 12, width: "100%" }}>
      {(rows || []).map((row) => (
        <div
          key={row.label}
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
            <div style={{ color: PAGE.text, fontWeight: 900 }}>{row.label}</div>
            <div style={{ color: PAGE.subtext, fontSize: 12 }}>
              Total: <span style={{ color: PAGE.text, fontWeight: 900 }}>{row.merged}</span> min
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {[
              { key: "system", label: "System", color: PAGE.info, value: row.system },
              { key: "manual", label: "Manual", color: PAGE.purple, value: row.manual },
              { key: "merged", label: "Total", color: PAGE.warn, value: row.merged },
            ].map((bar) => (
              <div
                key={bar.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "70px minmax(0, 1fr) auto",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div style={{ color: PAGE.subtext, fontSize: 12 }}>{bar.label}</div>
                <div
                  style={{
                    height: 10,
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${(Number(bar.value || 0) / maxValue) * 100}%`,
                      height: "100%",
                      background: bar.color,
                    }}
                  />
                </div>
                <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 12, whiteSpace: "nowrap" }}>
                  {bar.value} min
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PercentBreakdown({ items, denominatorMin, operatingMin }) {
  const safeItems = (items || []).filter((item) => Number(item?.value || 0) > 0);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {safeItems.map((item) => {
        const pct = denominatorMin > 0 ? Number(((Number(item.value || 0) / denominatorMin) * 100).toFixed(1)) : 0;
        return (
          <div
            key={item.label}
            style={{
              border: `1px solid ${PAGE.border}`,
              background: "rgba(255,255,255,0.03)",
              borderRadius: 14,
              padding: 12,
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <div style={{ color: PAGE.text, fontWeight: 900 }}>{item.label}</div>
              <div style={{ color: PAGE.subtext, fontSize: 12 }}>
                {item.value} min • <span style={{ color: PAGE.text, fontWeight: 900 }}>{formatPercent(pct)}</span>
              </div>
            </div>
            <div
              style={{
                height: 10,
                background: "rgba(255,255,255,0.08)",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${clamp(pct, 0, 100)}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, rgba(56,189,248,0.92), rgba(168,85,247,0.92))",
                }}
              />
            </div>
          </div>
        );
      })}

      <div
        style={{
          border: `1px solid ${PAGE.border}`,
          background: "rgba(34,197,94,0.08)",
          borderRadius: 14,
          padding: 12,
          display: "grid",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <div style={{ color: PAGE.text, fontWeight: 900 }}>Running</div>
          <div style={{ color: PAGE.subtext, fontSize: 12 }}>
            {operatingMin} min •{" "}
            <span style={{ color: PAGE.text, fontWeight: 900 }}>
              {formatPercent(denominatorMin > 0 ? (operatingMin / denominatorMin) * 100 : 0)}
            </span>
          </div>
        </div>
        <div
          style={{
            height: 10,
            background: "rgba(255,255,255,0.08)",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${clamp(denominatorMin > 0 ? (operatingMin / denominatorMin) * 100 : 0, 0, 100)}%`,
              height: "100%",
              background: "linear-gradient(90deg, rgba(34,197,94,0.95), rgba(56,189,248,0.9))",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function SourceBadge({ label, value, tone = "default" }) {
  const map = {
    default: {
      bg: "rgba(255,255,255,0.05)",
      bd: PAGE.border,
    },
    info: {
      bg: "rgba(56,189,248,0.12)",
      bd: "rgba(56,189,248,0.28)",
    },
    purple: {
      bg: "rgba(168,85,247,0.12)",
      bd: "rgba(168,85,247,0.28)",
    },
    warn: {
      bg: "rgba(245,158,11,0.12)",
      bd: "rgba(245,158,11,0.28)",
    },
    success: {
      bg: "rgba(34,197,94,0.12)",
      bd: "rgba(34,197,94,0.28)",
    },
    danger: {
      bg: "rgba(239,68,68,0.12)",
      bd: "rgba(239,68,68,0.28)",
    },
  };
  const skin = map[tone] || map.default;

  return (
    <div
      style={{
        border: `1px solid ${skin.bd}`,
        background: skin.bg,
        borderRadius: 999,
        padding: "8px 12px",
        color: PAGE.text,
        fontWeight: 800,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {label}: {value}
    </div>
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
  const opacity = clamp(0.2 + t * (active ? 0.8 : 0.72), 0.2, 1);

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

function UnitBox3D({ unit, isSelected, isHovered, onSelect, onHoverChange, zoomDist }) {
  const { x, y, w, h } = unit.layout;
  const height = 0.12;
  const borderUp = isSelected ? 0.03 : 0;
  const color = statusColor(getCanonicalStatus(unit));

  const unitSize = Math.max(w, h);
  const active = isSelected || isHovered;
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
          emissive={isHovered ? "#0ea5e9" : "#000000"}
          emissiveIntensity={isHovered ? 0.18 : 0}
        />
      </mesh>

      <mesh position={[0, (height + borderUp) / 2 + 0.01, 0]}>
        <boxGeometry args={[w * 0.96, 0.02, h * 0.96]} />
        <meshStandardMaterial color={color} transparent opacity={0.9} />
      </mesh>

      <group position={[0, lift, 0]}>
        <LabelTag3D text={unit.name} dotColor={color} active={active} unitSize={unitSize} zoomDist={zoomDist} />
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
      maxDistance={isMobile ? 32 : 38}
      minDistance={isMobile ? 8.5 : 10}
    />
  );
}

function CadScene({ units, selectedId, hoveredId, onHoverChange, onSelect, bounds, isMobile, onZoomUpdate }) {
  const target = useMemo(() => [bounds.cx, 0, bounds.cy], [bounds.cx, bounds.cy]);
  const { camera } = useThree();

  const lastSentRef = useRef(0);
  const zoomDistRef = useRef(18);

  useFrame(() => {
    const dx = camera.position.x - target[0];
    const dy = camera.position.y - target[1];
    const dz = camera.position.z - target[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    zoomDistRef.current = dist;

    const now = performance.now();
    if (now - lastSentRef.current > 120) {
      lastSentRef.current = now;
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
        />
      ))}

      <StableControls target={target} isMobile={isMobile} />
    </>
  );
}

function CadView({ units, selectedId, hoveredId, onHoverChange, onSelect, heightPx, isMobile, onZoomUpdate, expanded = false }) {
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

    const width = clamp(maxX - minX, 6, 160);
    const height = clamp(maxY - minY, 6, 160);
    return { minX, minY, maxX, maxY, w: width, h: height, cx: minX + width / 2, cy: minY + height / 2 };
  }, [units]);

  return (
    <div
      style={{
        border: expanded ? "1px solid rgba(56,189,248,0.2)" : `1px solid ${PAGE.border}`,
        background: PAGE.panel2,
        borderRadius: 18,
        overflow: "hidden",
        height: heightPx,
        minWidth: 0,
        boxShadow: expanded ? "0 0 0 1px rgba(56,189,248,0.05) inset, 0 18px 50px rgba(0,0,0,0.28)" : "none",
        transition: "all 260ms ease",
      }}
    >
      <div
        style={{
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          borderBottom: `1px solid ${PAGE.border}`,
          background: "rgba(255,255,255,0.02)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ color: PAGE.text, fontWeight: 900 }}>
          Plant 3 — CAD View {expanded ? "• Focus Mode" : ""}
        </div>
        <div style={{ color: PAGE.subtext, fontSize: 12, whiteSpace: "normal", overflowWrap: "anywhere" }}>
          Pan + Zoom + Rotate • Hover to identify • Click a unit
        </div>
      </div>

      <div style={{ height: "calc(100% - 44px)" }}>
        <Canvas
          camera={{ position: [bounds.cx, 7.4, bounds.cy + 14], fov: 45 }}
          onPointerMissed={() => onSelect(null)}
          dpr={[1, 1.6]}
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
          />
        </Canvas>
      </div>
    </div>
  );
}

function MaterialRequirementModal({
  open,
  unit,
  shiftKey,
  draft,
  allCellOptions,
  onDraftChange,
  onClose,
  onSubmit,
  onClearDraft,
}) {
  const isTablet = useMediaQuery("(max-width: 1100px)");
  const isMobile = useMediaQuery("(max-width: 760px)");

  if (!open) return null;

  const cellOptions = allCellOptions || [];
  const currentItems = getInventoryItemsForCellName(draft.cellName);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1400,
        background: "rgba(3,6,12,0.72)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "grid",
        placeItems: "center",
        padding: isMobile ? 8 : 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(1100px, 100%)",
          maxWidth: "100%",
          maxHeight: "calc(100vh - 16px)",
          border: `1px solid ${PAGE.border}`,
          background: PAGE.panel,
          borderRadius: isMobile ? 16 : 20,
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
          display: "grid",
          gridTemplateRows: "auto 1fr",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: isMobile ? "12px 12px" : "14px 16px",
            borderBottom: `1px solid ${PAGE.border}`,
            background: "rgba(255,255,255,0.02)",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
            <div style={{ color: PAGE.text, fontWeight: 900 }}>Material / Component Request</div>
            <div style={{ color: PAGE.subtext, fontSize: 12, overflowWrap: "anywhere" }}>
              Station: <span style={{ color: PAGE.text, fontWeight: 800 }}>{unit?.name || "—"}</span> • Shift:{" "}
              <span style={{ color: PAGE.text, fontWeight: 800 }}>{getShiftLabelFromCardKey(shiftKey)}</span>
            </div>
          </div>

          <Button label="Close" kind="secondary" onClick={onClose} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isTablet ? "1fr" : "240px minmax(0, 1fr)",
            minHeight: 0,
          }}
        >
          <div
            style={{
              borderRight: isTablet ? "none" : `1px solid ${PAGE.border}`,
              borderBottom: isTablet ? `1px solid ${PAGE.border}` : "none",
              background: "rgba(255,255,255,0.02)",
              padding: isMobile ? 10 : 12,
              overflowY: "auto",
              maxHeight: isTablet ? (isMobile ? 140 : 180) : "none",
            }}
          >
            <div style={{ color: PAGE.subtext, fontSize: 12, marginBottom: 10 }}>Cells</div>

            <div
              style={{
                display: "grid",
                gap: 8,
                gridTemplateColumns: isTablet ? "repeat(auto-fit, minmax(160px, 1fr))" : "1fr",
              }}
            >
              {cellOptions.map((cellName) => {
                const active = draft.cellName === cellName;
                return (
                  <button
                    key={cellName}
                    onClick={() => {
                      onDraftChange("cellName", cellName);
                      onDraftChange("partName", "");
                      onDraftChange("partNumber", "");
                    }}
                    style={{
                      minHeight: 44,
                      padding: "10px 12px",
                      textAlign: "left",
                      borderRadius: 12,
                      border: `1px solid ${active ? "rgba(56,189,248,0.32)" : PAGE.border}`,
                      background: active ? "rgba(56,189,248,0.12)" : "rgba(255,255,255,0.03)",
                      color: PAGE.text,
                      cursor: "pointer",
                      fontWeight: active ? 900 : 700,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {cellName}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              padding: isMobile ? 12 : 16,
              overflowY: "auto",
              display: "grid",
              gap: 14,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 10,
              }}
            >
              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ color: PAGE.subtext, fontSize: 12 }}>Cell Name</label>
                <input
                  value={draft.cellName}
                  onChange={(e) => onDraftChange("cellName", e.target.value)}
                  placeholder="Enter cell name"
                  style={{
                    height: 44,
                    borderRadius: 12,
                    border: `1px solid ${PAGE.border}`,
                    background: "rgba(255,255,255,0.04)",
                    color: PAGE.text,
                    padding: "0 12px",
                    minWidth: 0,
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ color: PAGE.subtext, fontSize: 12 }}>Subject</label>
                <select
                  value={draft.subject}
                  onChange={(e) => onDraftChange("subject", e.target.value)}
                  style={{
                    height: 44,
                    borderRadius: 12,
                    border: `1px solid ${PAGE.border}`,
                    background: "rgba(255,255,255,0.04)",
                    color: PAGE.text,
                    padding: "0 12px",
                    minWidth: 0,
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="">Select subject</option>
                  {MATERIAL_SUBJECT_OPTIONS.map((item) => (
                    <option key={item} value={item} style={{ color: "#111" }}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ color: PAGE.subtext, fontSize: 12 }}>Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={draft.quantity}
                  onChange={(e) => onDraftChange("quantity", e.target.value)}
                  style={{
                    height: 44,
                    borderRadius: 12,
                    border: `1px solid ${PAGE.border}`,
                    background: "rgba(255,255,255,0.04)",
                    color: PAGE.text,
                    padding: "0 12px",
                    minWidth: 0,
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isTablet ? "1fr" : "minmax(0, 1fr) minmax(260px, 0.9fr)",
                gap: 14,
                alignItems: "start",
              }}
            >
              <div
                style={{
                  border: `1px solid ${PAGE.border}`,
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 16,
                  padding: isMobile ? 12 : 14,
                  display: "grid",
                  gap: 10,
                  minWidth: 0,
                }}
              >
                <div style={{ color: PAGE.subtext, fontSize: 12 }}>Components for selected cell</div>

                {draft.cellName ? (
                  currentItems.length ? (
                    <div
                      style={{
                        display: "grid",
                        gap: 8,
                        maxHeight: isMobile ? 240 : 320,
                        overflowY: "auto",
                        paddingRight: 2,
                      }}
                    >
                      {currentItems.map((item) => {
                        const active = draft.partName === item.partName;
                        return (
                          <button
                            key={`${item.partNumber}-${item.partName}`}
                            onClick={() => {
                              onDraftChange("partName", item.partName);
                              onDraftChange("partNumber", item.partNumber);
                              if (!draft.quantity || Number(draft.quantity) <= 0) {
                                onDraftChange("quantity", String(item.defaultQty || 1));
                              }
                            }}
                            style={{
                              minHeight: 48,
                              padding: "10px 12px",
                              borderRadius: 12,
                              border: `1px solid ${active ? "rgba(56,189,248,0.32)" : PAGE.border}`,
                              background: active ? "rgba(56,189,248,0.10)" : "rgba(255,255,255,0.03)",
                              color: PAGE.text,
                              cursor: "pointer",
                              display: "grid",
                              gap: 4,
                              textAlign: "left",
                              minWidth: 0,
                            }}
                          >
                            <div style={{ fontWeight: 900, overflowWrap: "anywhere", wordBreak: "break-word" }}>
                              {item.partName}
                            </div>
                            <div style={{ color: PAGE.subtext, fontSize: 12, overflowWrap: "anywhere", wordBreak: "break-word" }}>
                              {item.partNumber}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ color: PAGE.subtext }}>No component list found for this cell yet.</div>
                  )
                ) : (
                  <div style={{ color: PAGE.subtext }}>Select a cell from the list.</div>
                )}
              </div>

              <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ color: PAGE.subtext, fontSize: 12 }}>Part Name</label>
                  <input
                    type="text"
                    value={draft.partName}
                    readOnly
                    placeholder="Select part from cell list"
                    style={{
                      height: 44,
                      borderRadius: 12,
                      border: `1px solid ${PAGE.border}`,
                      background: "rgba(255,255,255,0.03)",
                      color: PAGE.text,
                      padding: "0 12px",
                      minWidth: 0,
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ color: PAGE.subtext, fontSize: 12 }}>Part Number</label>
                  <input
                    type="text"
                    value={draft.partNumber}
                    readOnly
                    placeholder="Auto-filled from selected part"
                    style={{
                      height: 44,
                      borderRadius: 12,
                      border: `1px solid ${PAGE.border}`,
                      background: "rgba(255,255,255,0.03)",
                      color: PAGE.text,
                      padding: "0 12px",
                      minWidth: 0,
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ color: PAGE.subtext, fontSize: 12 }}>Note</label>
                  <textarea
                    rows={isMobile ? 3 : 4}
                    value={draft.note}
                    onChange={(e) => onDraftChange("note", e.target.value)}
                    placeholder="Optional note for warehouse"
                    style={{
                      borderRadius: 12,
                      border: `1px solid ${PAGE.border}`,
                      background: "rgba(255,255,255,0.04)",
                      color: PAGE.text,
                      padding: "10px 12px",
                      resize: "vertical",
                      minWidth: 0,
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div
                  style={{
                    border: `1px solid ${PAGE.border}`,
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 14,
                    padding: 12,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ color: PAGE.subtext, fontSize: 12 }}>Warehouse request preview</div>
                  <InfoLine label="Station" value={unit?.name || "—"} />
                  <InfoLine label="Cell Name" value={draft.cellName || "—"} />
                  <InfoLine label="Shift" value={getShiftLabelFromCardKey(shiftKey)} />
                  <InfoLine label="Subject" value={draft.subject || "—"} />
                  <InfoLine label="Qty" value={draft.quantity || "—"} />
                  <InfoLine label="Part Name" value={draft.partName || "—"} />
                  <InfoLine label="Part #" value={draft.partNumber || "—"} />
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: isMobile ? "stretch" : "flex-end",
                gap: 10,
                flexWrap: "wrap",
                flexDirection: isMobile ? "column" : "row",
              }}
            >
              <Button label="Clear Draft" kind="secondary" onClick={onClearDraft} />
              <Button label="Cancel" kind="secondary" onClick={onClose} />
              <Button
                label="Send Request"
                onClick={onSubmit}
                disabled={!draft.cellName || !draft.subject || !draft.quantity || !draft.partName || !draft.partNumber}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function MaterialRequirementPanel({ unit, snapshot, onOpenForm, onCancelRequest }) {
  const openRequests = snapshot?.material?.openRequests || [];
  const lastRequest = openRequests[0] || null;

  return (
    <Panel
      title="Material Requirement"
      right={
        unit ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <SourceBadge
              label="Open"
              value={formatNumber(openRequests.length)}
              tone={openRequests.length ? "warn" : "default"}
            />
          </div>
        ) : null
      }
    >
      {!unit ? (
        <div style={{ color: PAGE.subtext }}>Select a unit to manage material requests.</div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.15fr) minmax(260px, 0.85fr)",
              gap: 12,
            }}
          >
            <button
              onClick={onOpenForm}
              style={{
                border: "1px solid rgba(56,189,248,0.28)",
                background: "linear-gradient(180deg, rgba(56,189,248,0.10), rgba(56,189,248,0.04))",
                borderRadius: 18,
                padding: 16,
                color: PAGE.text,
                cursor: "pointer",
                display: "grid",
                gap: 12,
                textAlign: "left",
                minWidth: 0,
                transition: "transform 140ms ease, filter 140ms ease, box-shadow 140ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.filter = "brightness(1.04)";
                e.currentTarget.style.boxShadow = "0 18px 48px rgba(0,0,0,0.30)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.filter = "none";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
                <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                  <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 16 }}>Work / Material Requirement</div>
                  <div style={{ color: PAGE.subtext, fontSize: 12 }}>
                    Select cell, load its component list, choose part, auto-fill part number, and send request.
                  </div>
                </div>

                <div
                  style={{
                    minWidth: 44,
                    height: 44,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    background: "rgba(255,255,255,0.08)",
                    color: PAGE.text,
                    fontWeight: 900,
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  WORK
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: 10,
                }}
              >
                <KpiCard label="Station" value={unit?.name || "—"} accent />
                <KpiCard label="Cell Lists" value={formatNumber(getInventoryCellOptions(unit).length)} tone="info" />
                <KpiCard label="Open Requests" value={formatNumber(openRequests.length)} tone="warn" />
                <KpiCard
                  label="Last Status"
                  value={lastRequest?.requestStatus || "Idle"}
                  tone={lastRequest ? "info" : "default"}
                />
              </div>
            </button>

            <div
              style={{
                border: `1px solid ${PAGE.border}`,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 18,
                padding: 14,
                display: "grid",
                gap: 10,
                minWidth: 0,
              }}
            >
              <div style={{ color: PAGE.subtext, fontSize: 12 }}>Quick context</div>
              <InfoLine label="Shift" value={getShiftLabelFromCardKey(snapshot?.activeShift)} />
              <InfoLine label="Active Part" value={snapshot?.activeJob?.internalPartCode || "—"} />
              <InfoLine label="Order #" value={snapshot?.activeJob?.orderNo || "—"} />
              <InfoLine label="Part Name" value={snapshot?.activeJob?.partName || "—"} />
            </div>
          </div>

          <div
            style={{
              border: `1px solid ${PAGE.border}`,
              background: "rgba(255,255,255,0.03)",
              borderRadius: 16,
              padding: 14,
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ color: PAGE.subtext, fontSize: 12 }}>Open requests for selected unit / component flow</div>

            {openRequests.length ? (
              <div style={{ display: "grid", gap: 8 }}>
                {openRequests
                  .slice()
                  .reverse()
                  .slice(0, 8)
                  .map((req) => (
                    <div
                      key={req.id}
                      style={{
                        border: `1px solid ${PAGE.border}`,
                        background: "rgba(255,255,255,0.03)",
                        borderRadius: 14,
                        padding: 12,
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ color: PAGE.text, fontWeight: 900 }}>{req.subject || "Component Request"}</div>
                        <div style={{ color: PAGE.subtext, fontSize: 12 }}>{req.requestStatus}</div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                          gap: 8,
                        }}
                      >
                        <KpiCard label="Cell Name" value={req.cellName || "—"} tone="default" />
                        <KpiCard label="Part Name" value={req.partName || "—"} tone="default" />
                        <KpiCard label="Part #" value={req.partNumber || "—"} tone="info" />
                        <KpiCard label="Qty" value={formatNumber(req.quantityRequested)} tone="warn" />
                      </div>

                      <div style={{ color: PAGE.subtext, fontSize: 12, overflowWrap: "anywhere" }}>
                        Requested at: <span style={{ color: PAGE.text, fontWeight: 800 }}>{req.requestedAt}</span>
                      </div>

                      {req.note ? (
                        <div style={{ color: PAGE.subtext, fontSize: 12, overflowWrap: "anywhere" }}>
                          Note: <span style={{ color: PAGE.text, fontWeight: 800 }}>{req.note}</span>
                        </div>
                      ) : null}

                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
                        <Button label="Cancel Request" kind="secondary" onClick={() => onCancelRequest(req.id)} />
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div style={{ color: PAGE.subtext }}>No open component requests for this unit.</div>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}

function HmiOperationalPanel({
  unit,
  snapshot,
  activeShift,
  manualDowntimeDraft,
  onManualDraftChange,
  onAddManualDowntime,
  onOpenMaterialForm,
  onCancelMaterialRequest,
}) {
  const status = snapshot?.status || "—";
  const color = statusColor(status);
  const activeJob = snapshot?.activeJob || null;
  const completedJobsToday = snapshot?.completedJobsToday || [];
  const history = snapshot?.productionHistory || null;
  const messages = snapshot?.messages || [];
  const partTargetConfig = snapshot?.partTargetConfig || null;
  const downtimeAnalytics = snapshot?.downtime?.analytics || null;

  const shiftData = downtimeAnalytics?.byShiftList?.find((row) => row.shiftKey === activeShift) || null;
  const rec = downtimeAnalytics?.reconciliation || null;

  const partMixItems = (history?.daily?.parts || []).map((part) => ({
    label: `${part.internalPartCode} • ${part.sharePct}%`,
    value: Number(part.producedQty || 0),
  }));

  const baseDowntime = snapshot?.downtime?.raw || {};
  const categoryOptions = baseDowntime?.categoryOptions || [];
  const reasonOptions = (baseDowntime?.reasonOptions || {})[manualDowntimeDraft.category] || [];

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <MaterialRequirementPanel
        unit={unit}
        snapshot={snapshot}
        onOpenForm={onOpenMaterialForm}
        onCancelRequest={onCancelMaterialRequest}
      />

      <Panel
        title="Live Active Part"
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flexWrap: "wrap" }}>
            <div style={{ color: PAGE.subtext, fontSize: 12 }}>Status</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <span style={{ width: 10, height: 10, borderRadius: 99, background: color, display: "inline-block", flexShrink: 0 }} />
              <span style={{ color: PAGE.text, fontWeight: 900 }}>{status}</span>
            </div>
          </div>
        }
      >
        {!unit ? (
          <div style={{ color: PAGE.subtext }}>Select a unit to view HMI.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 10,
              }}
            >
              <KpiCard label="Active Internal Part" value={activeJob?.internalPartCode || "—"} accent />
              <KpiCard label="Current Shift" value={getShiftLabelFromCardKey(activeShift)} />
              <KpiCard label="Order Qty" value={activeJob?.scheduledQty ?? "—"} />
              <KpiCard label="Produced Qty" value={activeJob?.producedQty ?? "—"} />
              <KpiCard label="Remaining Qty" value={activeJob?.remainingQty ?? "—"} />
              <KpiCard label="Completion %" value={activeJob?.completionPct != null ? `${activeJob.completionPct}%` : "—"} />
            </div>

            <div
              style={{
                border: `1px solid ${PAGE.border}`,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 16,
                padding: 14,
                display: "grid",
                gap: 10,
              }}
            >
              <InfoLine label="Part Name" value={activeJob?.partName} />
              <InfoLine label="Customer Part #" value={activeJob?.customerPartNumber} />
              <InfoLine label="Reference" value={activeJob?.customerReference} />
              <InfoLine label="AR Number" value={activeJob?.arNumber} />
              <InfoLine label="Order #" value={activeJob?.orderNo} />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                gap: 10,
              }}
            >
              <KpiCard
                label="Target / Hour"
                value={partTargetConfig?.targetPerHour ? formatNumber(partTargetConfig.targetPerHour) : "—"}
                tone="info"
              />
              <KpiCard
                label="Ideal Cycle Sec"
                value={partTargetConfig?.idealCycleSec ? formatNumber(partTargetConfig.idealCycleSec) : "—"}
                tone="purple"
              />
              <KpiCard
                label="Pack Qty"
                value={partTargetConfig?.packQty ? formatNumber(partTargetConfig.packQty) : "—"}
                tone="warn"
              />
              <KpiCard
                label="Container Cap"
                value={partTargetConfig?.containerCapacity ? formatNumber(partTargetConfig.containerCapacity) : "—"}
                tone="default"
              />
            </div>

            <div>
              <div style={{ color: PAGE.subtext, fontSize: 12, marginBottom: 8 }}>Active job progress</div>
              <MiniBar value={activeJob?.completionPct || 0} />
            </div>
          </div>
        )}
      </Panel>

      <Panel
        title="Today Production Mix"
        right={
          unit ? (
            <div style={{ color: PAGE.subtext, fontSize: 12 }}>
              Completed jobs today: <span style={{ color: PAGE.text, fontWeight: 900 }}>{completedJobsToday.length}</span>
            </div>
          ) : null
        }
      >
        {!unit ? (
          <div style={{ color: PAGE.subtext }}>No active station selected.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
              {(history?.daily?.parts || []).length ? (
                history.daily.parts.map((part) => (
                  <div
                    key={`${part.internalPartCode}-${part.partName}`}
                    style={{
                      border: `1px solid ${PAGE.border}`,
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 14,
                      padding: "10px 12px",
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: PAGE.text, fontWeight: 900, overflowWrap: "anywhere" }}>{part.internalPartCode}</div>
                      <div style={{ color: PAGE.subtext, fontSize: 12, overflowWrap: "anywhere" }}>{part.partName}</div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: 8,
                      }}
                    >
                      <KpiCard label="Produced" value={part.producedQty} />
                      <KpiCard label="Good" value={part.goodQty} />
                      <KpiCard label="Share" value={`${part.sharePct}%`} accent />
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: PAGE.subtext }}>No production mix data.</div>
              )}
            </div>

            <div
              style={{
                border: `1px solid ${PAGE.border}`,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 16,
                padding: 14,
                display: "grid",
                gap: 14,
                justifyItems: "center",
              }}
            >
              <DonutChart items={partMixItems} size={180} />
              <LegendList items={partMixItems} />
            </div>
          </div>
        )}
      </Panel>

      <Panel
        title={`Downtime Snapshot — ${getShiftLabelFromCardKey(activeShift)}`}
        right={
          rec ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <SourceBadge
                label="Status"
                value={
                  rec.reconciliationStatus === "within_tolerance"
                    ? "Synced"
                    : rec.reconciliationStatus === "outside_tolerance"
                    ? "Review"
                    : rec.reconciliationStatus === "system_only"
                    ? "System"
                    : rec.reconciliationStatus === "manual_only"
                    ? "Manual"
                    : "OK"
                }
                tone={rec.withinTolerance ? "success" : "warn"}
              />
            </div>
          ) : null
        }
      >
        {!unit || !shiftData ? (
          <div style={{ color: PAGE.subtext }}>No downtime data.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 10,
              }}
            >
              <KpiCard label="System Unplanned" value={formatMinutes(shiftData.systemUnplannedMin)} tone="info" />
              <KpiCard label="Manual Unplanned" value={formatMinutes(shiftData.manualUnplannedMin)} tone="purple" />
              <KpiCard label="Shift Unplanned Total" value={formatMinutes(shiftData.unplannedMergedMin)} accent tone="warn" />
              <KpiCard label="Downtime %" value={formatPercent(shiftData.downtimePctOfNet)} tone="danger" />
              <KpiCard label="Running" value={formatMinutes(shiftData.operatingMin)} tone="success" />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 16,
                alignItems: "start",
              }}
            >
              <div
                style={{
                  border: `1px solid ${PAGE.border}`,
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 16,
                  padding: 14,
                  display: "grid",
                  gap: 14,
                  justifyItems: "center",
                }}
              >
                <div style={{ color: PAGE.subtext, fontSize: 12 }}>Downtime category mix</div>
                <DonutChart items={shiftData.categoriesUnplannedMerged} size={170} />
                <LegendList items={shiftData.categoriesUnplannedMerged} suffix=" min" />
              </div>

              <div
                style={{
                  border: `1px solid ${PAGE.border}`,
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 16,
                  padding: 14,
                  display: "grid",
                  gap: 12,
                }}
              >
                <div style={{ color: PAGE.subtext, fontSize: 12 }}>Shift loss distribution</div>

                <PercentBreakdown
                  items={shiftData.categoriesUnplannedMerged}
                  denominatorMin={NET_WORK_MIN}
                  operatingMin={shiftData.operatingMin}
                />
              </div>
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Downtime Entry">
        {!unit ? (
          <div style={{ color: PAGE.subtext }}>Select a unit first.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 10,
              }}
            >
              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ color: PAGE.subtext, fontSize: 12 }}>Category</label>
                <select
                  value={manualDowntimeDraft.category}
                  onChange={(e) => onManualDraftChange("category", e.target.value)}
                  style={{
                    height: 42,
                    borderRadius: 12,
                    border: `1px solid ${PAGE.border}`,
                    background: "rgba(255,255,255,0.04)",
                    color: PAGE.text,
                    padding: "0 12px",
                    minWidth: 0,
                  }}
                >
                  <option value="">Select category</option>
                  {categoryOptions.map((item) => (
                    <option key={item} value={item} style={{ color: "#111" }}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ color: PAGE.subtext, fontSize: 12 }}>Reason</label>
                <select
                  value={manualDowntimeDraft.reason}
                  onChange={(e) => onManualDraftChange("reason", e.target.value)}
                  style={{
                    height: 42,
                    borderRadius: 12,
                    border: `1px solid ${PAGE.border}`,
                    background: "rgba(255,255,255,0.04)",
                    color: PAGE.text,
                    padding: "0 12px",
                    minWidth: 0,
                  }}
                >
                  <option value="">Select reason</option>
                  {reasonOptions.map((item) => (
                    <option key={item} value={item} style={{ color: "#111" }}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ color: PAGE.subtext, fontSize: 12 }}>Duration (min)</label>
                <input
                  type="number"
                  min="1"
                  value={manualDowntimeDraft.durationMin}
                  onChange={(e) => onManualDraftChange("durationMin", e.target.value)}
                  style={{
                    height: 42,
                    borderRadius: 12,
                    border: `1px solid ${PAGE.border}`,
                    background: "rgba(255,255,255,0.04)",
                    color: PAGE.text,
                    padding: "0 12px",
                    minWidth: 0,
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ color: PAGE.subtext, fontSize: 12 }}>Note</label>
              <textarea
                rows={3}
                value={manualDowntimeDraft.note}
                onChange={(e) => onManualDraftChange("note", e.target.value)}
                style={{
                  borderRadius: 12,
                  border: `1px solid ${PAGE.border}`,
                  background: "rgba(255,255,255,0.04)",
                  color: PAGE.text,
                  padding: "10px 12px",
                  resize: "vertical",
                  minWidth: 0,
                }}
              />
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <Button label={`Add Entry to ${activeShift}`} onClick={onAddManualDowntime} />
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Live Messages">
        {!unit ? (
          <div style={{ color: PAGE.subtext }}>No station selected.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {messages.length ? (
              messages.map((message, index) => (
                <div
                  key={index}
                  style={{
                    color: PAGE.text,
                    fontWeight: 800,
                    border: `1px solid ${PAGE.border}`,
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 12,
                    padding: "10px 12px",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  {message}
                </div>
              ))
            ) : (
              <div style={{ color: PAGE.subtext }}>No messages.</div>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}

function ShiftTotalsPanel({ unit, snapshot, activeShift, onShiftChange, shiftCardRefs }) {
  const normalizedTotals = snapshot?.shiftTotals || {};
  const dailyProduction = buildMergedDailyProductionFromNormalized(normalizedTotals);
  const dailyDowntime = snapshot?.downtime?.analytics?.daily || null;
  const downtimeAnalytics = snapshot?.downtime?.analytics || null;

  return (
    <Panel
      title="Shift Totals / Reports"
      right={
        unit ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {SHIFT_ORDER.map((key) => {
              const active = activeShift === key;
              return (
                <button
                  key={key}
                  onClick={() => onShiftChange?.(key)}
                  style={{
                    height: 30,
                    minWidth: 34,
                    padding: "0 10px",
                    borderRadius: 10,
                    border: `1px solid ${active ? "rgba(56,189,248,0.36)" : PAGE.border}`,
                    background: active ? "rgba(56,189,248,0.14)" : "rgba(255,255,255,0.04)",
                    color: PAGE.text,
                    cursor: "pointer",
                    fontWeight: 900,
                  }}
                >
                  {key}
                </button>
              );
            })}
          </div>
        ) : null
      }
    >
      {!unit ? (
        <div style={{ color: PAGE.subtext }}>Select a unit to view shift totals.</div>
      ) : (
        <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
          <div
            style={{
              border: "1px solid rgba(34,197,94,0.22)",
              borderRadius: 18,
              padding: 14,
              background: "rgba(34,197,94,0.06)",
              display: "grid",
              gap: 12,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div style={{ color: PAGE.text, fontWeight: 900 }}>Daily Report</div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 10,
              }}
            >
              <KpiCard label="Good" value={formatNumber(dailyProduction.ok)} tone="success" />
              <KpiCard label="Fail" value={formatNumber(dailyProduction.ng)} tone="danger" />
              <KpiCard label="Suspect" value={formatNumber(dailyProduction.suspect)} tone="warn" />
              <KpiCard label="System Unplanned" value={formatMinutes(dailyDowntime?.systemUnplannedMin || 0)} tone="info" />
              <KpiCard label="Manual Unplanned" value={formatMinutes(dailyDowntime?.manualUnplannedMin || 0)} tone="purple" />
              <KpiCard label="Daily Unplanned Total" value={formatMinutes(dailyDowntime?.unplannedMergedMin || 0)} accent tone="warn" />
              <KpiCard label="Daily Downtime %" value={formatPercent(dailyDowntime?.downtimePctOfNet || 0)} tone="danger" />
              <KpiCard label="Daily Running" value={formatMinutes(dailyDowntime?.operatingMin || DAILY_NET_WORK_MIN)} tone="success" />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 14,
                alignItems: "start",
              }}
            >
              <div
                style={{
                  border: `1px solid ${PAGE.border}`,
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 16,
                  padding: 14,
                  display: "grid",
                  gap: 12,
                  justifyItems: "center",
                }}
              >
                <div style={{ color: PAGE.subtext, fontSize: 12 }}>Daily downtime category mix</div>
                <DonutChart items={dailyDowntime?.categoriesUnplannedMerged || []} size={170} />
                <LegendList items={dailyDowntime?.categoriesUnplannedMerged || []} suffix=" min" />
              </div>

              <div
                style={{
                  border: `1px solid ${PAGE.border}`,
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 16,
                  padding: 14,
                  display: "grid",
                  gap: 12,
                }}
              >
                <div style={{ color: PAGE.subtext, fontSize: 12 }}>Shift comparison</div>

                <GroupedBarChart
                  rows={(downtimeAnalytics?.byShiftList || []).map((row) => ({
                    label: `${row.label} / ${getShiftLabelFromCardKey(row.shiftKey)}`,
                    system: row.systemUnplannedMin,
                    manual: row.manualUnplannedMin,
                    merged: row.unplannedMergedMin,
                  }))}
                />
              </div>
            </div>
          </div>

          {SHIFT_ORDER.map((key) => {
            const production = normalizedTotals[key] || { ok: 0, ng: 0, suspect: 0 };
            const shiftDowntime = downtimeAnalytics?.byShiftList?.find((row) => row.shiftKey === key) || null;
            const active = activeShift === key;

            return (
              <div
                key={key}
                ref={shiftCardRefs?.[key] || null}
                style={{
                  border: active ? "1px solid rgba(56,189,248,0.36)" : `1px solid ${PAGE.border}`,
                  borderRadius: 16,
                  padding: 12,
                  background: active ? "rgba(56,189,248,0.08)" : "rgba(255,255,255,0.03)",
                  boxShadow: active ? "0 0 0 1px rgba(56,189,248,0.08) inset" : "none",
                  scrollMarginTop: 110,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    marginBottom: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ color: PAGE.text, fontWeight: 900, overflowWrap: "anywhere" }}>
                    {getShiftLabelFromCardKey(key)} {active ? "• Active" : ""}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
                    gap: 10,
                  }}
                >
                  <KpiCard label="Good" value={formatNumber(production.ok)} accent={active} />
                  <KpiCard label="Fail" value={formatNumber(production.ng)} accent={active} tone="danger" />
                  <KpiCard label="Suspect" value={formatNumber(production.suspect)} accent={active} tone="warn" />
                  <KpiCard label="System Unplanned" value={formatMinutes(shiftDowntime?.systemUnplannedMin ?? 0)} tone="info" />
                  <KpiCard label="Manual Unplanned" value={formatMinutes(shiftDowntime?.manualUnplannedMin ?? 0)} tone="purple" />
                  <KpiCard label="Unplanned Total" value={formatMinutes(shiftDowntime?.unplannedMergedMin ?? 0)} accent={active} tone="warn" />
                  <KpiCard label="Downtime %" value={formatPercent(shiftDowntime?.downtimePctOfNet ?? 0)} tone="danger" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function SegmentedScroll({ value, onChange }) {
  const itemStyle = (active) => ({
    height: 40,
    padding: "0 12px",
    borderRadius: 12,
    border: `1px solid ${active ? "rgba(56,189,248,0.35)" : PAGE.border}`,
    background: active ? "rgba(56,189,248,0.14)" : "rgba(255,255,255,0.04)",
    color: PAGE.text,
    fontWeight: 900,
    cursor: "pointer",
    flex: 1,
    minWidth: 0,
  });

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: 10,
        borderRadius: 16,
        border: `1px solid ${PAGE.border}`,
        background: "rgba(255,255,255,0.03)",
        minWidth: 0,
      }}
    >
      <button style={itemStyle(value === "cad")} onClick={() => onChange("cad")}>
        CAD View
      </button>
      <button style={itemStyle(value === "hmi")} onClick={() => onChange("hmi")}>
        HMI
      </button>
    </div>
  );
}

function TopStatusStrip({ units, selectedUnit, snapshot, zoomDist, isMobile, activeShift }) {
  const online = units.filter((u) => getCanonicalStatus(u) !== "DOWN").length;
  const attn = units.filter((u) => getCanonicalStatus(u) === "ATTN").length;
  const down = units.filter((u) => getCanonicalStatus(u) === "DOWN").length;
  const activeJob = snapshot?.activeJob || null;
  const dailyUnplanned = snapshot?.downtime?.analytics?.daily?.unplannedMergedMin || 0;
  const dailyPct = snapshot?.downtime?.analytics?.daily?.downtimePctOfNet || 0;

  const pill = {
    border: `1px solid ${PAGE.border}`,
    background: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    padding: "10px 12px",
    minWidth: isMobile ? 180 : 220,
    flex: "0 0 auto",
    overflow: "hidden",
  };

  const row = isMobile
    ? { display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6, WebkitOverflowScrolling: "touch" }
    : { display: "flex", gap: 10, flexWrap: "wrap" };

  return (
    <div style={row}>
      <div style={pill}>
        <div style={{ color: PAGE.subtext, fontSize: 12 }}>Units Online</div>
        <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 18 }}>
          {online}/{units.length}
        </div>
      </div>

      <div style={pill}>
        <div style={{ color: PAGE.subtext, fontSize: 12 }}>Attention</div>
        <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 18 }}>{attn}</div>
      </div>

      <div style={pill}>
        <div style={{ color: PAGE.subtext, fontSize: 12 }}>Down</div>
        <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 18 }}>{down}</div>
      </div>

      <div style={pill}>
        <div style={{ color: PAGE.subtext, fontSize: 12 }}>Selected Unit</div>
        <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 16, overflowWrap: "anywhere", wordBreak: "break-word" }}>
          {selectedUnit ? selectedUnit.name : "—"}
        </div>
      </div>

      <div style={pill}>
        <div style={{ color: PAGE.subtext, fontSize: 12 }}>Live Part</div>
        <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 15, overflowWrap: "anywhere", wordBreak: "break-word" }}>
          {activeJob?.internalPartCode || "—"}
        </div>
      </div>

      <div style={pill}>
        <div style={{ color: PAGE.subtext, fontSize: 12 }}>Active Shift</div>
        <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 16, overflowWrap: "anywhere" }}>
          {getShiftLabelFromCardKey(activeShift)}
        </div>
      </div>

      <div style={pill}>
        <div style={{ color: PAGE.subtext, fontSize: 12 }}>Daily Unplanned Downtime</div>
        <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 18 }}>
          {formatMinutes(dailyUnplanned)} • {formatPercent(dailyPct)}
        </div>
      </div>

      <div style={pill}>
        <div style={{ color: PAGE.subtext, fontSize: 12 }}>CAD Zoom</div>
        <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 18 }}>{zoomDist ? Math.round(zoomDist) : "—"}</div>
      </div>
    </div>
  );
}

export default function DevicesPage() {
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
    const spread = LAYOUT_SPREAD;

    return rawUnits.map((u) => {
      const { x, y, w, h } = u.layout;
      const nx = cx + (x - cx) * spread;
      const ny = cy + (y - cy) * spread;

      return {
        ...u,
        layout: {
          ...u.layout,
          x: nx,
          y: ny,
          w,
          h,
        },
      };
    });
  }, [rawUnits]);

  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [zoomDist, setZoomDist] = useState(null);
  const [selectedShift, setSelectedShift] = useState(getCurrentPlantShiftKey());
  const [pendingShiftScroll, setPendingShiftScroll] = useState(null);

  const [manualDowntimeByUnit, setManualDowntimeByUnit] = useState({});
  const [manualDraftByUnit, setManualDraftByUnit] = useState({});
  const [materialRequestsByUnit, setMaterialRequestsByUnit] = useState({});
  const [materialFormByUnit, setMaterialFormByUnit] = useState({});
  const [materialModalUnitId, setMaterialModalUnitId] = useState(null);

  const isMobile = useMediaQuery("(max-width: 900px)");
  const isTablet = useMediaQuery("(max-width: 1200px)");
  const isSmall = useMediaQuery("(max-width: 520px)");

  const selectedUnit = useMemo(() => units.find((u) => u.id === selectedId) || null, [units, selectedId]);
  const desktopExpanded = !isMobile && !!selectedUnit;

  const selectedUnitDraft = manualDraftByUnit[selectedId] || {
    category: "",
    reason: "",
    durationMin: "5",
    note: "",
  };

  const selectedUnitManualExtras = useMemo(() => {
    if (!selectedId) return [];
    return manualDowntimeByUnit[selectedId] || [];
  }, [manualDowntimeByUnit, selectedId]);

  const selectedUnitMaterialRequests = useMemo(() => {
    if (!selectedId) return [];
    return materialRequestsByUnit[selectedId] || [];
  }, [materialRequestsByUnit, selectedId]);

  const selectedUnitMaterialForm = materialFormByUnit[selectedId] || {
    subject: "",
    quantity: "1",
    cellName: selectedUnit?.name || "",
    partName: "",
    partNumber: "",
    note: "",
  };

  const runtimeSnapshot = useMemo(() => {
    if (!selectedUnit) return null;
    return buildCanonicalRuntimeSnapshot(selectedUnit, selectedUnitManualExtras, selectedUnitMaterialRequests);
  }, [selectedUnit, selectedUnitManualExtras, selectedUnitMaterialRequests]);

  const allInventoryCellOptions = useMemo(() => {
    return getInventoryCellOptions(selectedUnit, units);
  }, [selectedUnit, units]);

  const cadRef = useRef(null);
  const hmiRef = useRef(null);
  const shiftARef = useRef(null);
  const shiftBRef = useRef(null);
  const shiftCRef = useRef(null);

  const shiftCardRefs = useMemo(
    () => ({
      A: shiftARef,
      B: shiftBRef,
      C: shiftCRef,
    }),
    []
  );

  const [mobileSection, setMobileSection] = useState("cad");

  const scrollToSection = useCallback((key) => {
    const el = key === "cad" ? cadRef.current : hmiRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const scrollToShiftCard = useCallback(
    (shift) => {
      const el = shiftCardRefs?.[shift]?.current;
      if (!el) return;

      el.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
    },
    [shiftCardRefs]
  );

  useEffect(() => {
    if (!isMobile) return;

    const handler = () => {
      const cadTop = cadRef.current?.getBoundingClientRect?.().top ?? 9999;
      const hmiTop = hmiRef.current?.getBoundingClientRect?.().top ?? 9999;
      const active = Math.abs(cadTop) < Math.abs(hmiTop) ? "cad" : "hmi";
      setMobileSection(active);
    };

    window.addEventListener("scroll", handler, { passive: true });
    handler();

    return () => window.removeEventListener("scroll", handler);
  }, [isMobile]);

  useEffect(() => {
    if (!pendingShiftScroll) return;

    const timer = setTimeout(() => {
      scrollToShiftCard(pendingShiftScroll);
      setPendingShiftScroll(null);
    }, isMobile ? 180 : 90);

    return () => clearTimeout(timer);
  }, [pendingShiftScroll, isMobile, scrollToShiftCard]);

  useEffect(() => {
    if (!selectedId || !selectedShift) return;

    const timer = setTimeout(() => {
      scrollToShiftCard(selectedShift);
    }, isMobile ? 260 : 120);

    return () => clearTimeout(timer);
  }, [selectedId, selectedShift, isMobile, scrollToShiftCard]);

  function onSelect(unit) {
    setSelectedId(unit ? unit.id : null);

    if (!unit) return;

    const unitShift = getCanonicalShiftKey(unit);
    const currentShift = unitShift || getCurrentPlantShiftKey();

    setSelectedShift(currentShift);
    setPendingShiftScroll(currentShift);

    if (isMobile) {
      setMobileSection("hmi");
      setTimeout(() => {
        scrollToSection("hmi");
      }, 80);
    } else {
      setTimeout(() => {
        hmiRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      }, 140);
    }
  }

  function onManualDraftChange(field, value) {
    if (!selectedId) return;

    setManualDraftByUnit((prev) => ({
      ...prev,
      [selectedId]: {
        ...(prev[selectedId] || {
          category: "",
          reason: "",
          durationMin: "5",
          note: "",
        }),
        [field]: value,
        ...(field === "category" ? { reason: "" } : {}),
      },
    }));
  }

  function onAddManualDowntime() {
    if (!selectedId) return;

    const draft = manualDraftByUnit[selectedId] || selectedUnitDraft;
    if (!draft.category || !draft.reason || !draft.durationMin) return;

    const now = new Date();
    const durationMin = Math.max(1, Number(draft.durationMin || 0));
    const startedAt = new Date(now.getTime() - durationMin * 60000).toISOString();
    const endedAt = now.toISOString();

    const newEntry = {
      id: `${selectedId}::MANUAL-UI-${Date.now()}`,
      stationId: selectedId,
      unitId: selectedId,
      shiftKey: selectedShift,
      source: "team_lead_manual",
      entryMode: "manual",
      category: draft.category,
      reason: draft.reason,
      customCategory: "",
      customReason: "",
      note: draft.note || "",
      startedAt,
      endedAt,
      durationMin,
      affectsDowntime: true,
      isPlanned: false,
      enteredByRole: "team_lead",
      enteredByName: "Team Lead",
      approvalStatus: "approved",
      audit: {
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        version: 1,
      },
    };

    setManualDowntimeByUnit((prev) => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] || []), newEntry],
    }));

    setManualDraftByUnit((prev) => ({
      ...prev,
      [selectedId]: {
        category: "",
        reason: "",
        durationMin: "5",
        note: "",
      },
    }));

    setPendingShiftScroll(selectedShift);
  }

  function onMaterialDraftChange(field, value) {
    if (!selectedId) return;

    setMaterialFormByUnit((prev) => {
      const next = {
        ...(prev[selectedId] || {
          subject: "",
          quantity: "1",
          cellName: selectedUnit?.name || "",
          partName: "",
          partNumber: "",
          note: "",
        }),
        [field]: value,
      };

      if (field === "cellName") {
        next.partName = "";
        next.partNumber = "";
      }

      return {
        ...prev,
        [selectedId]: next,
      };
    });
  }

  function openMaterialForm() {
    if (!selectedUnit) return;

    setMaterialFormByUnit((prev) => ({
      ...prev,
      [selectedUnit.id]: {
        subject: prev[selectedUnit.id]?.subject || "",
        quantity: prev[selectedUnit.id]?.quantity || "1",
        cellName: prev[selectedUnit.id]?.cellName || selectedUnit.name || "",
        partName: prev[selectedUnit.id]?.partName || "",
        partNumber: prev[selectedUnit.id]?.partNumber || "",
        note: prev[selectedUnit.id]?.note || "",
      },
    }));

    setMaterialModalUnitId(selectedUnit.id);
  }

  function closeMaterialForm() {
    setMaterialModalUnitId(null);
  }

  function clearMaterialDraft() {
    if (!selectedUnit) return;

    setMaterialFormByUnit((prev) => ({
      ...prev,
      [selectedUnit.id]: {
        subject: "",
        quantity: "1",
        cellName: selectedUnit?.name || "",
        partName: "",
        partNumber: "",
        note: "",
      },
    }));
  }

  function submitMaterialRequest() {
    if (!selectedUnit) return;

    const draft = materialFormByUnit[selectedUnit.id] || selectedUnitMaterialForm;
    if (!draft.cellName || !draft.subject || !draft.quantity || !draft.partName || !draft.partNumber) return;

    const activeJob = runtimeSnapshot?.activeJob || buildCanonicalActiveJob(selectedUnit);

    const newRequest = buildMaterialRequestEvent({
      unit: selectedUnit,
      shiftKey: selectedShift,
      activeJob,
      draft,
    });

    setMaterialRequestsByUnit((prev) => ({
      ...prev,
      [selectedUnit.id]: [...(prev[selectedUnit.id] || []), newRequest],
    }));

    setMaterialFormByUnit((prev) => ({
      ...prev,
      [selectedUnit.id]: {
        subject: "",
        quantity: "1",
        cellName: selectedUnit?.name || "",
        partName: "",
        partNumber: "",
        note: "",
      },
    }));

    setMaterialModalUnitId(null);
  }

  function cancelMaterialRequest(requestId) {
    if (!selectedId) return;

    setMaterialRequestsByUnit((prev) => {
      const current = prev[selectedId] || [];
      return {
        ...prev,
        [selectedId]: current.map((req) =>
          req.id === requestId
            ? {
                ...req,
                requestStatus: "cancelled",
                cancelledAt: new Date().toISOString(),
                audit: {
                  ...(req.audit || {}),
                  updatedAt: new Date().toISOString(),
                  version: Number(req?.audit?.version || 1) + 1,
                },
              }
            : req
        ),
      };
    });
  }

  const cadHeight = isMobile ? (isSmall ? 420 : 520) : desktopExpanded ? 620 : 560;

  return (
    <div
      style={{
        background: PAGE.bg,
        minHeight: "100%",
        color: PAGE.text,
        padding: isMobile ? 12 : PAGE.padding,
        paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: 1480,
          margin: "0 auto",
          width: "100%",
          display: "grid",
          gap: 12,
          minWidth: 0,
        }}
      >
        <TopStatusStrip
          units={units}
          selectedUnit={selectedUnit}
          snapshot={runtimeSnapshot}
          zoomDist={zoomDist}
          isMobile={isMobile}
          activeShift={selectedShift}
        />

        {isMobile ? (
          <div
            style={{
              position: "sticky",
              top: 10,
              zIndex: 20,
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              minWidth: 0,
            }}
          >
            <SegmentedScroll
              value={mobileSection}
              onChange={(key) => {
                setMobileSection(key);
                scrollToSection(key);
              }}
            />
          </div>
        ) : null}

        {!isMobile ? (
          desktopExpanded ? (
            <div
              style={{
                display: "grid",
                gap: PAGE.gap,
                minWidth: 0,
                alignItems: "start",
                transition: "all 260ms ease",
              }}
            >
              <div ref={cadRef} style={{ minWidth: 0 }}>
                <CadView
                  units={units}
                  selectedId={selectedId}
                  hoveredId={hoveredId}
                  onHoverChange={setHoveredId}
                  onSelect={onSelect}
                  heightPx={cadHeight}
                  isMobile={isMobile}
                  onZoomUpdate={setZoomDist}
                  expanded
                />
              </div>

              <div
                ref={hmiRef}
                style={{
                  display: "grid",
                  gap: PAGE.gap,
                  minWidth: 0,
                  alignContent: "start",
                  animation: "none",
                }}
              >
                <HmiOperationalPanel
                  unit={selectedUnit}
                  snapshot={runtimeSnapshot}
                  activeShift={selectedShift}
                  manualDowntimeDraft={selectedUnitDraft}
                  onManualDraftChange={onManualDraftChange}
                  onAddManualDowntime={onAddManualDowntime}
                  onOpenMaterialForm={openMaterialForm}
                  onCancelMaterialRequest={cancelMaterialRequest}
                />

                <ShiftTotalsPanel
                  unit={selectedUnit}
                  snapshot={runtimeSnapshot}
                  activeShift={selectedShift}
                  onShiftChange={(shift) => {
                    setSelectedShift(shift);
                    setPendingShiftScroll(shift);
                  }}
                  shiftCardRefs={shiftCardRefs}
                />
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isTablet ? "1fr" : "minmax(0, 1.03fr) minmax(0, 0.97fr)",
                gap: PAGE.gap,
                alignItems: "stretch",
                minWidth: 0,
                transition: "all 260ms ease",
              }}
            >
              <div ref={cadRef} style={{ minWidth: 0 }}>
                <CadView
                  units={units}
                  selectedId={selectedId}
                  hoveredId={hoveredId}
                  onHoverChange={setHoveredId}
                  onSelect={onSelect}
                  heightPx={cadHeight}
                  isMobile={isMobile}
                  onZoomUpdate={setZoomDist}
                />
              </div>

              <div ref={hmiRef} style={{ display: "grid", gap: PAGE.gap, alignContent: "start", minWidth: 0 }}>
                <HmiOperationalPanel
                  unit={selectedUnit}
                  snapshot={runtimeSnapshot}
                  activeShift={selectedShift}
                  manualDowntimeDraft={selectedUnitDraft}
                  onManualDraftChange={onManualDraftChange}
                  onAddManualDowntime={onAddManualDowntime}
                  onOpenMaterialForm={openMaterialForm}
                  onCancelMaterialRequest={cancelMaterialRequest}
                />

                <ShiftTotalsPanel
                  unit={selectedUnit}
                  snapshot={runtimeSnapshot}
                  activeShift={selectedShift}
                  onShiftChange={(shift) => {
                    setSelectedShift(shift);
                    setPendingShiftScroll(shift);
                  }}
                  shiftCardRefs={shiftCardRefs}
                />
              </div>
            </div>
          )
        ) : (
          <div style={{ display: "grid", gap: PAGE.gap, minWidth: 0 }}>
            <div ref={cadRef} style={{ scrollMarginTop: 90, minWidth: 0 }}>
              <CadView
                units={units}
                selectedId={selectedId}
                hoveredId={hoveredId}
                onHoverChange={setHoveredId}
                onSelect={onSelect}
                heightPx={cadHeight}
                isMobile={isMobile}
                onZoomUpdate={setZoomDist}
                expanded={!!selectedUnit}
              />
            </div>

            <div ref={hmiRef} style={{ scrollMarginTop: 90, minWidth: 0 }}>
              <div style={{ display: "grid", gap: PAGE.gap, minWidth: 0 }}>
                <HmiOperationalPanel
                  unit={selectedUnit}
                  snapshot={runtimeSnapshot}
                  activeShift={selectedShift}
                  manualDowntimeDraft={selectedUnitDraft}
                  onManualDraftChange={onManualDraftChange}
                  onAddManualDowntime={onAddManualDowntime}
                  onOpenMaterialForm={openMaterialForm}
                  onCancelMaterialRequest={cancelMaterialRequest}
                />

                <ShiftTotalsPanel
                  unit={selectedUnit}
                  snapshot={runtimeSnapshot}
                  activeShift={selectedShift}
                  onShiftChange={(shift) => {
                    setSelectedShift(shift);
                    setPendingShiftScroll(shift);
                  }}
                  shiftCardRefs={shiftCardRefs}
                />
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: 2,
            color: PAGE.subtext,
            fontSize: 12,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            minWidth: 0,
          }}
        >
          <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>
            Selected: <span style={{ color: PAGE.text, fontWeight: 900 }}>{selectedUnit ? selectedUnit.name : "—"}</span> •
            Status: <span style={{ color: PAGE.text, fontWeight: 900 }}>{formatUnitStatus(selectedUnit)}</span> • Shift:{" "}
            <span style={{ color: PAGE.text, fontWeight: 900 }}>{getShiftLabelFromCardKey(selectedShift)}</span>
          </div>
        </div>
      </div>

      <MaterialRequirementModal
        open={materialModalUnitId === selectedId && !!selectedUnit}
        unit={selectedUnit}
        shiftKey={selectedShift}
        draft={selectedUnitMaterialForm}
        allCellOptions={allInventoryCellOptions}
        onDraftChange={onMaterialDraftChange}
        onClose={closeMaterialForm}
        onSubmit={submitMaterialRequest}
        onClearDraft={clearMaterialDraft}
      />
    </div>
  );
}