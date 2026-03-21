// src/pages/ProductionPage.js
import React, { useEffect, useMemo, useState } from "react";
import { getPlant3Units } from "../data/mock/plant3.units.mock";

const PAGE = {
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
  purple: "#a855f7",
  info: "#38bdf8",
};

const SHIFT_ORDER = ["A", "B", "C"];
const SHIFT_TOTAL_MIN = 480;
const PLANNED_BREAK_MIN = 40;
const NET_WORK_MIN = SHIFT_TOTAL_MIN - PLANNED_BREAK_MIN;
const DEFAULT_TOLERANCE_MIN = 5;

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
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

function formatMaybePercent(n) {
  const value = Number(n || 0);
  return Number.isFinite(value) ? `${value.toFixed(1)}%` : "0.0%";
}

function pickToneByCompletion(pct) {
  if (pct >= 100) return "success";
  if (pct >= 90) return "accent";
  if (pct >= 75) return "warn";
  return "danger";
}

function pickToneByDowntime(min) {
  if (min <= 20) return "success";
  if (min <= 45) return "accent";
  if (min <= 75) return "warn";
  return "danger";
}

function useViewport() {
  const [width, setWidth] = useState(() => {
    if (typeof window === "undefined") return 1440;
    return window.innerWidth;
  });

  useEffect(() => {
    function onResize() {
      setWidth(window.innerWidth);
    }

    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return {
    width,
    isMobile: width <= 768,
    isTablet: width > 768 && width <= 1100,
    isCompact: width <= 1180,
    isSmall: width <= 520,
  };
}

/**
 * ---------------------------------------------------------
 * Shared source-of-truth helpers
 * Strictly aligned with DevicesPage math.
 * ProductionPage does not invent parallel logic.
 * ---------------------------------------------------------
 */

function getUnitRuntime(unit) {
  if (!unit) return null;
  return unit.runtime || unit.mock || null;
}

function getUnitActiveJob(unit) {
  const runtime = getUnitRuntime(unit);
  return runtime?.activeJob || runtime?.currentJob || unit?.mock?.activeJob || unit?.mock?.currentJob || null;
}

function getUnitCompletedJobsToday(unit) {
  const runtime = getUnitRuntime(unit);
  return runtime?.completedJobsToday || unit?.mock?.completedJobsToday || [];
}

function getUnitProductionHistory(unit) {
  const runtime = getUnitRuntime(unit);
  return runtime?.productionHistory || unit?.mock?.productionHistory || null;
}

function getUnitShiftTotals(unit) {
  const runtime = getUnitRuntime(unit);
  return runtime?.shiftTotals || unit?.shiftTotals || {};
}

function getUnitDowntime(unit) {
  const runtime = getUnitRuntime(unit);
  return runtime?.downtime || unit?.mock?.downtime || null;
}

function toSafeNumber(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function normalizeShiftProductionRow(row = {}) {
  return {
    ok: toSafeNumber(row.ok, row.good, row.goodQty, row.producedGood, row.accepted, row.pass),
    ng: toSafeNumber(row.ng, row.fail, row.bad, row.reject, row.rejected, row.nok, row.scrap, row.defect),
    suspect: toSafeNumber(row.suspect, row.hold, row.quarantine, row.pendingReview),
  };
}

function buildNormalizedShiftTotals(unit) {
  const rawTotals = getUnitShiftTotals(unit) || {};

  return SHIFT_ORDER.reduce((acc, key) => {
    acc[key] = normalizeShiftProductionRow(rawTotals[key] || {});
    return acc;
  }, {});
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

function getShiftKeyForDate(date) {
  return getCurrentPlantShiftKey(date);
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

function splitEntryAcrossShifts(entry) {
  const explicitShift = entry?.shiftKey;
  const startedAt = toDateSafe(entry?.startedAt);
  const endedAt = toDateSafe(entry?.endedAt);
  const fallbackDuration = Math.max(0, Number(entry?.durationMin || 0));

  if (explicitShift && SHIFT_ORDER.includes(explicitShift) && (!startedAt || !endedAt)) {
    return [{ shiftKey: explicitShift, durationMin: fallbackDuration, entry }];
  }

  if (explicitShift && SHIFT_ORDER.includes(explicitShift) && startedAt && endedAt) {
    const calculatedDuration = Math.max(0, Math.round((endedAt - startedAt) / 60000));
    return [{ shiftKey: explicitShift, durationMin: calculatedDuration || fallbackDuration, entry }];
  }

  if (!startedAt || !endedAt || endedAt <= startedAt) {
    return [{ shiftKey: getCurrentPlantShiftKey(), durationMin: fallbackDuration, entry }];
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
      shiftKey: getShiftKeyForDate(startedAt),
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

function buildDowntimeAnalytics(unit, extraManualEntries = []) {
  const baseDowntime = getUnitDowntime(unit) || {};
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
      label: key,
      availableWorkMin,
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

function getStrictDailyTarget(unit) {
  const runtime = getUnitRuntime(unit);
  const scheduledJobs = runtime?.scheduledJobs || [];
  return scheduledJobs.reduce((sum, job) => sum + Number(job?.scheduledQty || 0), 0);
}

function buildStationDowntimeRollup(unit) {
  const baseDowntime = getUnitDowntime(unit) || {};
  const systemEntries = [...(baseDowntime.systemEntries || [])];
  const manualEntries = [...(baseDowntime.manualEntries || [])];
  const allEntries = [...systemEntries, ...manualEntries];

  const stationMap = {};

  allEntries.forEach((entry) => {
    const category = getEntryCategory(entry);
    if (isPlannedCategory(category)) return;

    const stationName = entry?.stationName || entry?.assetType || entry?.stationId || "Unknown Station";
    const reason = getEntryReason(entry);
    const parts = splitEntryAcrossShifts(entry);
    const totalDuration = parts.reduce((sum, part) => sum + Number(part.durationMin || 0), 0);

    if (!stationMap[stationName]) {
      stationMap[stationName] = {
        stationName,
        downtimeMin: 0,
        categoryMap: {},
        reasonMap: {},
      };
    }

    stationMap[stationName].downtimeMin += totalDuration;
    stationMap[stationName].categoryMap[category] = (stationMap[stationName].categoryMap[category] || 0) + totalDuration;
    stationMap[stationName].reasonMap[reason] = (stationMap[stationName].reasonMap[reason] || 0) + totalDuration;
  });

  const stations = Object.values(stationMap)
    .map((station) => {
      const topCategory =
        Object.entries(station.categoryMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "UNCATEGORIZED";
      const topReason =
        Object.entries(station.reasonMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";

      return {
        stationName: station.stationName,
        downtimeMin: Math.round(station.downtimeMin),
        category: topCategory,
        reason: topReason,
      };
    })
    .filter((item) => item.downtimeMin > 0)
    .sort((a, b) => b.downtimeMin - a.downtimeMin);

  const totalStationDowntime = stations.reduce((sum, item) => sum + Number(item.downtimeMin || 0), 0);

  return stations.map((item) => ({
    ...item,
    sharePct: totalStationDowntime > 0 ? (item.downtimeMin / totalStationDowntime) * 100 : 0,
  }));
}

function buildProductionCellsFromUnits() {
  const units = getPlant3Units();

  return units.map((unit, index) => {
    const normalizedShiftTotals = buildNormalizedShiftTotals(unit);
    const mergedProduction = buildMergedDailyProductionFromNormalized(normalizedShiftTotals);
    const downtimeAnalytics = buildDowntimeAnalytics(unit);
    const stationRollup = buildStationDowntimeRollup(unit);
    const activeJob = getUnitActiveJob(unit);
    const completedJobsToday = getUnitCompletedJobsToday(unit);
    const productionHistory = getUnitProductionHistory(unit);

    const target = getStrictDailyTarget(unit);
    const actual =
      Number(mergedProduction.ok || 0) +
      Number(mergedProduction.ng || 0) +
      Number(mergedProduction.suspect || 0);

    const good = Number(mergedProduction.ok || 0);
    const defect = Number(mergedProduction.ng || 0);
    const suspect = Number(mergedProduction.suspect || 0);

    const completionPct = target > 0 ? (actual / target) * 100 : 0;
    const downtimeMin = Number(downtimeAnalytics?.daily?.unplannedMergedMin || 0);
    const qualityPct = actual > 0 ? (good / actual) * 100 : 0;

    const shiftActuals = SHIFT_ORDER.map((key) => {
      const row = normalizedShiftTotals[key] || {};
      return Number(row.ok || 0) + Number(row.ng || 0) + Number(row.suspect || 0);
    });

    const maxProduction = shiftActuals.length ? Math.max(...shiftActuals) : 0;
    const minProduction = shiftActuals.length ? Math.min(...shiftActuals) : 0;

    const downtimeSlices = stationRollup.map((item) => Number(item.downtimeMin || 0)).filter((value) => value > 0);
    const maxDowntime = downtimeSlices.length ? Math.max(...downtimeSlices) : 0;
    const minDowntime = downtimeSlices.length ? Math.min(...downtimeSlices) : 0;

    const topDowntimeStation = stationRollup[0] || {
      stationName: "—",
      downtimeMin: 0,
      category: "—",
      reason: "—",
      sharePct: 0,
    };

    return {
      id: unit.id,
      rank: index + 1,
      cellName: unit.name,
      target: Math.round(target),
      actual: Math.round(actual),
      completionPct,
      downtimeMin: Math.round(downtimeMin),
      maxProduction: Math.round(maxProduction),
      minProduction: Math.round(minProduction),
      maxDowntime: Math.round(maxDowntime),
      minDowntime: Math.round(minDowntime),
      good: Math.round(good),
      defect: Math.round(defect),
      suspect: Math.round(suspect),
      qualityPct,
      topDowntimeStation: {
        ...topDowntimeStation,
        sharePct: downtimeMin > 0 ? (topDowntimeStation.downtimeMin / downtimeMin) * 100 : 0,
      },
      stations: stationRollup,
      livePartCode: activeJob?.internalPartCode || "—",
      livePartName: activeJob?.partName || "—",
      completedJobsCount: completedJobsToday.length,
      partMixCount: productionHistory?.daily?.parts?.length || 0,
      downtimeAnalytics,
      shiftTotals: normalizedShiftTotals,
      activeJob,
    };
  });
}

/**
 * ---------------------------------------------------------
 * UI helpers
 * ---------------------------------------------------------
 */

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

function ChartLegendStack({ chart, legend, reverseOnMobile = false, isMobile = false }) {
  const stack = isMobile || reverseOnMobile;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: stack ? "1fr" : "minmax(220px, 260px) minmax(0, 1fr)",
        gap: 14,
        alignItems: "start",
      }}
    >
      <div style={{ display: "grid", justifyItems: stack ? "center" : "start" }}>{chart}</div>
      <div style={{ minWidth: 0 }}>{legend}</div>
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
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
          borderBottom: `1px solid ${PAGE.border}`,
          background: skin.header,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: PAGE.text,
              fontWeight: 900,
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div style={{ color: PAGE.subtext, fontSize: 12, marginTop: 2 }}>{subtitle}</div>
          ) : null}
        </div>

        {right ? <div style={{ minWidth: 0, maxWidth: "100%" }}>{right}</div> : null}
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
      <div style={{ color: PAGE.subtext, fontSize: 12 }}>{label}</div>
      <div
        style={{
          color: PAGE.text,
          fontWeight: 900,
          fontSize: 20,
          lineHeight: 1.2,
          marginTop: 6,
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
      {subvalue ? (
        <div style={{ color: PAGE.subtext, fontSize: 12, marginTop: 6, overflowWrap: "anywhere" }}>{subvalue}</div>
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
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function TinyBadge({ label, tone = "default" }) {
  const map = {
    default: {
      bd: PAGE.border,
      bg: "rgba(255,255,255,0.04)",
    },
    accent: {
      bd: "rgba(56,189,248,0.28)",
      bg: "rgba(56,189,248,0.08)",
    },
    success: {
      bd: "rgba(34,197,94,0.28)",
      bg: "rgba(34,197,94,0.08)",
    },
    warn: {
      bd: "rgba(245,158,11,0.28)",
      bg: "rgba(245,158,11,0.08)",
    },
    danger: {
      bd: "rgba(239,68,68,0.28)",
      bg: "rgba(239,68,68,0.08)",
    },
    purple: {
      bd: "rgba(168,85,247,0.28)",
      bg: "rgba(168,85,247,0.08)",
    },
  };

  const skin = map[tone] || map.default;

  return (
    <div
      style={{
        border: `1px solid ${skin.bd}`,
        background: skin.bg,
        borderRadius: 999,
        padding: "6px 10px",
        color: PAGE.text,
        fontWeight: 800,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {label}
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

function DonutChart({ items, size = 180, centerLabel = "Total", centerValue = "0" }) {
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
          background: "rgba(255,255,255,0.03)",
          display: "grid",
          placeItems: "center",
          color: PAGE.subtext,
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
        border: `1px solid ${PAGE.border}`,
        flexShrink: 0,
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
          <div style={{ color: PAGE.subtext, fontSize: 11 }}>{centerLabel}</div>
          <div
            style={{
              color: PAGE.text,
              fontWeight: 900,
              fontSize: 18,
              lineHeight: 1.1,
              overflowWrap: "anywhere",
            }}
          >
            {centerValue}
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendList({ items, suffix = "" }) {
  const colors = ["#38bdf8", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#14b8a6", "#f97316", "#64748b"];

  return (
    <div style={{ display: "grid", gap: 8, width: "100%", minWidth: 0 }}>
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

function VerticalComparisonChart({ rows, selectedId, onSelect, isMobile, isTablet, isSmall }) {
  const maxActual = Math.max(1, ...rows.map((item) => item.actual));
  const maxDowntime = Math.max(1, ...rows.map((item) => item.downtimeMin));
  const chartHeight = isMobile ? 240 : isTablet ? 280 : 320;
  const barHeight = isMobile ? 170 : isTablet ? 200 : 230;
  const columnMin = isMobile ? 34 : 30;
  const columnWidth = isMobile ? 46 : 52;
  const minTrackWidth = isMobile ? 1100 : 1400;

  return (
    <div style={{ overflowX: "auto", paddingBottom: 4 }}>
      <div
        style={{
          minWidth: Math.max(minTrackWidth, rows.length * columnWidth),
          display: "grid",
          gap: 14,
        }}
      >
        <div
          style={{
            height: chartHeight,
            display: "grid",
            gridTemplateColumns: `repeat(${rows.length}, minmax(${columnMin}px, 1fr))`,
            gap: isMobile ? 8 : 10,
            alignItems: "end",
          }}
        >
          {rows.map((row) => {
            const productionHeight = (row.actual / maxActual) * 100;
            const downtimeHeight = (row.downtimeMin / maxDowntime) * 100;
            const selected = selectedId === row.id;

            return (
              <button
                key={row.id}
                onClick={() => onSelect(row)}
                style={{
                  border: `1px solid ${selected ? "rgba(56,189,248,0.34)" : PAGE.border}`,
                  background: selected ? "rgba(56,189,248,0.06)" : "rgba(255,255,255,0.03)",
                  borderRadius: 14,
                  padding: isMobile ? "8px 4px 6px" : "10px 6px 8px",
                  display: "grid",
                  gridTemplateRows: "auto 1fr auto",
                  gap: 8,
                  cursor: "pointer",
                  minWidth: 0,
                }}
              >
                <div style={{ display: "grid", gap: 4, justifyItems: "center" }}>
                  <div style={{ color: PAGE.text, fontWeight: 900, fontSize: isMobile ? 10 : 11 }}>
                    {formatPercent(row.completionPct)}
                  </div>
                </div>

                <div
                  style={{
                    height: barHeight,
                    display: "flex",
                    alignItems: "end",
                    justifyContent: "center",
                    gap: isMobile ? 4 : 6,
                  }}
                >
                  <div
                    title={`Actual ${formatNumber(row.actual)}`}
                    style={{
                      width: isMobile ? 10 : 12,
                      height: `${clamp(productionHeight, 0, 100)}%`,
                      background: PAGE.accent,
                      borderRadius: 999,
                      boxShadow: `0 0 14px ${PAGE.accent}`,
                    }}
                  />
                  <div
                    title={`Downtime ${formatMinutes(row.downtimeMin)}`}
                    style={{
                      width: isMobile ? 10 : 12,
                      height: `${clamp(downtimeHeight, 0, 100)}%`,
                      background: PAGE.warn,
                      borderRadius: 999,
                      boxShadow: `0 0 14px ${PAGE.warn}`,
                    }}
                  />
                </div>

                <div
                  style={{
                    color: PAGE.text,
                    fontWeight: 800,
                    fontSize: isSmall ? 9 : 10,
                    textAlign: "center",
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                    justifySelf: "center",
                    lineHeight: 1,
                    height: isMobile ? 64 : 82,
                    overflow: "hidden",
                  }}
                >
                  {row.cellName}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 99,
                background: PAGE.accent,
                display: "inline-block",
              }}
            />
            <span style={{ color: PAGE.subtext, fontSize: 12 }}>Production</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 99,
                background: PAGE.warn,
                display: "inline-block",
              }}
            />
            <span style={{ color: PAGE.subtext, fontSize: 12 }}>Downtime</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExtremesList({ rows }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {rows.map((row, idx) => (
        <div
          key={`${row.label}-${idx}`}
          style={{
            border: `1px solid ${PAGE.border}`,
            background: "rgba(255,255,255,0.03)",
            borderRadius: 14,
            padding: 12,
            display: "grid",
            gap: 6,
          }}
        >
          <div style={{ color: PAGE.subtext, fontSize: 12 }}>{row.label}</div>
          <div
            style={{
              color: PAGE.text,
              fontWeight: 900,
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            }}
          >
            {row.value}
          </div>
          {row.subvalue ? <div style={{ color: PAGE.subtext, fontSize: 12 }}>{row.subvalue}</div> : null}
        </div>
      ))}
    </div>
  );
}

function BottleneckTable({ rows, selectedId, onSelect }) {
  return (
    <div
      style={{
        border: `1px solid ${PAGE.border}`,
        borderRadius: 16,
        overflow: "hidden",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(150px, 1.1fr) minmax(120px, 0.8fr) minmax(120px, 0.8fr) minmax(120px, 0.7fr) minmax(160px, 1fr) minmax(150px, 1fr)",
          borderBottom: `1px solid ${PAGE.border}`,
          background: "rgba(255,255,255,0.03)",
        }}
      >
        {["Cell", "Top Station", "Downtime", "Share", "Category", "Reason"].map((item) => (
          <div
            key={item}
            style={{
              padding: "12px 14px",
              color: PAGE.subtext,
              fontSize: 12,
              fontWeight: 900,
              overflowWrap: "anywhere",
            }}
          >
            {item}
          </div>
        ))}
      </div>

      <div style={{ display: "grid" }}>
        {rows.map((row, idx) => {
          const selected = selectedId === row.id;

          return (
            <button
              key={row.id}
              onClick={() => onSelect(row)}
              style={{
                textAlign: "left",
                border: "none",
                borderBottom: idx === rows.length - 1 ? "none" : `1px solid ${PAGE.border}`,
                background: selected ? "rgba(56,189,248,0.08)" : "transparent",
                color: PAGE.text,
                cursor: "pointer",
                display: "grid",
                gridTemplateColumns:
                  "minmax(150px, 1.1fr) minmax(120px, 0.8fr) minmax(120px, 0.8fr) minmax(120px, 0.7fr) minmax(160px, 1fr) minmax(150px, 1fr)",
              }}
            >
              <div style={{ padding: "12px 14px", fontWeight: 900, overflowWrap: "anywhere" }}>{row.cellName}</div>
              <div style={{ padding: "12px 14px", fontWeight: 800, overflowWrap: "anywhere" }}>
                {row.topDowntimeStation.stationName}
              </div>
              <div style={{ padding: "12px 14px", fontWeight: 800 }}>{formatMinutes(row.topDowntimeStation.downtimeMin)}</div>
              <div style={{ padding: "12px 14px", fontWeight: 800 }}>{formatMaybePercent(row.topDowntimeStation.sharePct)}</div>
              <div style={{ padding: "12px 14px", fontWeight: 800, overflowWrap: "anywhere" }}>
                {row.topDowntimeStation.category}
              </div>
              <div style={{ padding: "12px 14px", fontWeight: 800, overflowWrap: "anywhere" }}>
                {row.topDowntimeStation.reason}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BottleneckCardList({ rows, selectedId, onSelect }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {rows.map((row) => {
        const selected = selectedId === row.id;

        return (
          <button
            key={row.id}
            onClick={() => onSelect(row)}
            style={{
              textAlign: "left",
              border: `1px solid ${selected ? "rgba(56,189,248,0.34)" : PAGE.border}`,
              background: selected ? "rgba(56,189,248,0.08)" : "rgba(255,255,255,0.03)",
              borderRadius: 16,
              padding: 12,
              display: "grid",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ color: PAGE.text, fontWeight: 900 }}>{row.cellName}</div>
              <TinyBadge label={formatMinutes(row.topDowntimeStation.downtimeMin)} tone="warn" />
            </div>

            <InfoLine label="Top Station" value={row.topDowntimeStation.stationName} />
            <InfoLine label="Share" value={formatMaybePercent(row.topDowntimeStation.sharePct)} />
            <InfoLine label="Category" value={row.topDowntimeStation.category} />
            <InfoLine label="Reason" value={row.topDowntimeStation.reason} />
          </button>
        );
      })}
    </div>
  );
}

export default function ProductionPage() {
  const { isMobile, isTablet, isCompact, isSmall } = useViewport();
  const baseCells = useMemo(() => buildProductionCellsFromUnits(), []);
  const [sortKey, setSortKey] = useState("completion");
  const [selectedId, setSelectedId] = useState(baseCells[0]?.id || null);

  const sortedCells = useMemo(() => {
    const rows = [...baseCells];

    if (sortKey === "production") {
      rows.sort((a, b) => b.actual - a.actual);
    } else if (sortKey === "downtime") {
      rows.sort((a, b) => b.downtimeMin - a.downtimeMin);
    } else if (sortKey === "target") {
      rows.sort((a, b) => b.target - a.target);
    } else {
      rows.sort((a, b) => b.completionPct - a.completionPct);
    }

    return rows.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }, [baseCells, sortKey]);

  const selectedCell = useMemo(() => {
    return sortedCells.find((item) => item.id === selectedId) || sortedCells[0] || null;
  }, [sortedCells, selectedId]);

  const summary = useMemo(() => {
    const totalTarget = baseCells.reduce((sum, item) => sum + item.target, 0);
    const totalActual = baseCells.reduce((sum, item) => sum + item.actual, 0);
    const totalDowntime = baseCells.reduce((sum, item) => sum + item.downtimeMin, 0);
    const totalGood = baseCells.reduce((sum, item) => sum + item.good, 0);
    const totalDefect = baseCells.reduce((sum, item) => sum + item.defect, 0);
    const totalSuspect = baseCells.reduce((sum, item) => sum + item.suspect, 0);

    const avgCompletion = baseCells.length
      ? baseCells.reduce((sum, item) => sum + item.completionPct, 0) / baseCells.length
      : 0;

    const avgQuality = baseCells.length
      ? baseCells.reduce((sum, item) => sum + item.qualityPct, 0) / baseCells.length
      : 0;

    const bestCompletionCell = [...baseCells].sort((a, b) => b.completionPct - a.completionPct)[0] || null;
    const worstCompletionCell = [...baseCells].sort((a, b) => a.completionPct - b.completionPct)[0] || null;
    const maxProductionCell = [...baseCells].sort((a, b) => b.actual - a.actual)[0] || null;
    const minProductionCell = [...baseCells].sort((a, b) => a.actual - b.actual)[0] || null;
    const maxDowntimeCell = [...baseCells].sort((a, b) => b.downtimeMin - a.downtimeMin)[0] || null;
    const minDowntimeCell = [...baseCells].sort((a, b) => a.downtimeMin - b.downtimeMin)[0] || null;
    const bestQualityCell = [...baseCells].sort((a, b) => b.qualityPct - a.qualityPct)[0] || null;
    const worstQualityCell = [...baseCells].sort((a, b) => a.qualityPct - b.qualityPct)[0] || null;
    const maxSingleStopCell =
      [...baseCells].sort((a, b) => b.topDowntimeStation.downtimeMin - a.topDowntimeStation.downtimeMin)[0] || null;

    const categoriesMap = {};
    baseCells.forEach((cell) => {
      cell.stations.forEach((station) => {
        categoriesMap[station.category] = (categoriesMap[station.category] || 0) + station.downtimeMin;
      });
    });

    const downtimeCategories = Object.entries(categoriesMap)
      .map(([label, value]) => ({ label, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return {
      totalTarget,
      totalActual,
      totalDowntime,
      totalGood,
      totalDefect,
      totalSuspect,
      avgCompletion,
      avgQuality,
      bestCompletionCell,
      worstCompletionCell,
      maxProductionCell,
      minProductionCell,
      maxDowntimeCell,
      minDowntimeCell,
      bestQualityCell,
      worstQualityCell,
      maxSingleStopCell,
      downtimeCategories,
    };
  }, [baseCells]);

  const completionDonutItems = useMemo(() => {
    const remaining = Math.max(0, summary.totalTarget - summary.totalActual);
    return [
      { label: "Produced", value: summary.totalActual },
      { label: "Remaining", value: remaining },
    ];
  }, [summary.totalActual, summary.totalTarget]);

  const qualityDonutItems = useMemo(() => {
    return [
      { label: "Good", value: summary.totalGood },
      { label: "Fail", value: summary.totalDefect },
      { label: "Suspect", value: summary.totalSuspect },
    ];
  }, [summary.totalGood, summary.totalDefect, summary.totalSuspect]);

  const selectedStationDonutItems = useMemo(() => {
    if (!selectedCell) return [];
    return selectedCell.stations
      .filter((item) => Number(item.downtimeMin || 0) > 0)
      .slice(0, 6)
      .map((item) => ({
        label: item.stationName,
        value: item.downtimeMin,
      }));
  }, [selectedCell]);

  const selectedTopVsRestItems = useMemo(() => {
    if (!selectedCell) return [];
    const top = selectedCell.topDowntimeStation.downtimeMin || 0;
    const rest = Math.max(0, selectedCell.downtimeMin - top);
    return [
      { label: "Top Station", value: top },
      { label: "Other Stations", value: rest },
    ];
  }, [selectedCell]);

  const donutSize = isSmall ? 156 : isMobile ? 170 : 190;

  return (
    <div
      style={{
        background: PAGE.bg,
        minHeight: "100%",
        color: PAGE.text,
        padding: isMobile ? 12 : 16,
      }}
    >
      <div
        style={{
          maxWidth: 1520,
          margin: "0 auto",
          display: "grid",
          gap: 12,
          minWidth: 0,
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ color: PAGE.text, fontWeight: 900, fontSize: isMobile ? 22 : 24 }}>Production</div>
          <div style={{ color: PAGE.subtext }}>
            Daily cell-level production intelligence with target completion, downtime comparison, bottleneck station visibility, and report-ready summaries.
          </div>
        </div>

        <SectionGrid min={180} gap={10}>
          <KpiCard
            label="Total Daily Production"
            value={formatNumber(summary.totalActual)}
            subvalue={`Target ${formatNumber(summary.totalTarget)}`}
            tone="accent"
          />
          <KpiCard
            label="Total Daily Downtime"
            value={formatMinutes(summary.totalDowntime)}
            subvalue={`Across ${formatNumber(baseCells.length)} cells`}
            tone="warn"
          />
          <KpiCard
            label="Average Completion"
            value={formatPercent(summary.avgCompletion)}
            subvalue={summary.bestCompletionCell ? `Best ${summary.bestCompletionCell.cellName}` : "—"}
            tone={pickToneByCompletion(summary.avgCompletion)}
          />
          <KpiCard
            label="Average Quality"
            value={formatPercent(summary.avgQuality)}
            subvalue={summary.bestQualityCell ? `Best ${summary.bestQualityCell.cellName}` : "—"}
            tone="success"
          />
          <KpiCard
            label="Highest Production Cell"
            value={summary.maxProductionCell ? summary.maxProductionCell.cellName : "—"}
            subvalue={summary.maxProductionCell ? formatNumber(summary.maxProductionCell.actual) : "—"}
            tone="purple"
          />
          <KpiCard
            label="Highest Downtime Cell"
            value={summary.maxDowntimeCell ? summary.maxDowntimeCell.cellName : "—"}
            subvalue={summary.maxDowntimeCell ? formatMinutes(summary.maxDowntimeCell.downtimeMin) : "—"}
            tone="danger"
          />
        </SectionGrid>

        <SectionGrid min={380}>
          <Card
            title="Daily Cell Comparison"
            subtitle="Vertical production and downtime comparison across all cells"
            tone="accent"
            right={
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <SortButton active={sortKey === "completion"} onClick={() => setSortKey("completion")}>
                  Completion
                </SortButton>
                <SortButton active={sortKey === "production"} onClick={() => setSortKey("production")}>
                  Production
                </SortButton>
                <SortButton active={sortKey === "downtime"} onClick={() => setSortKey("downtime")}>
                  Downtime
                </SortButton>
                <SortButton active={sortKey === "target"} onClick={() => setSortKey("target")}>
                  Target
                </SortButton>
              </div>
            }
          >
            <VerticalComparisonChart
              rows={sortedCells}
              selectedId={selectedCell?.id}
              onSelect={(row) => setSelectedId(row.id)}
              isMobile={isMobile}
              isTablet={isTablet}
              isSmall={isSmall}
            />
          </Card>

          <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
            <Card title="Completion Mix" subtitle="Produced vs remaining to target" tone="success">
              <ChartLegendStack
                isMobile={isMobile}
                chart={
                  <DonutChart
                    items={completionDonutItems}
                    size={donutSize}
                    centerLabel="Completion"
                    centerValue={formatPercent(summary.totalTarget > 0 ? (summary.totalActual / summary.totalTarget) * 100 : 0)}
                  />
                }
                legend={<LegendList items={completionDonutItems} />}
              />
            </Card>

            <Card title="Quality Mix" subtitle="Daily good, fail and suspect distribution" tone="default">
              <ChartLegendStack
                isMobile={isMobile}
                chart={
                  <DonutChart
                    items={qualityDonutItems}
                    size={donutSize}
                    centerLabel="Quality"
                    centerValue={formatPercent(summary.avgQuality)}
                  />
                }
                legend={<LegendList items={qualityDonutItems} />}
              />
            </Card>

            <Card title="Downtime Categories" subtitle="Top downtime composition across all cells" tone="warn">
              <ChartLegendStack
                isMobile={isMobile}
                chart={
                  <DonutChart
                    items={summary.downtimeCategories}
                    size={donutSize}
                    centerLabel="Downtime"
                    centerValue={formatMinutes(summary.totalDowntime)}
                  />
                }
                legend={<LegendList items={summary.downtimeCategories} suffix=" min" />}
              />
            </Card>
          </div>
        </SectionGrid>

        <SectionGrid min={360}>
          <Card
            title="Selected Cell Detail"
            subtitle="Daily production, downtime and bottleneck breakdown"
            tone="default"
            right={
              selectedCell ? (
                <TinyBadge
                  label={`${selectedCell.cellName} • ${formatPercent(selectedCell.completionPct)}`}
                  tone={pickToneByCompletion(selectedCell.completionPct)}
                />
              ) : null
            }
          >
            {!selectedCell ? (
              <div style={{ color: PAGE.subtext }}>No cell selected.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                <SectionGrid min={145} gap={10}>
                  <KpiCard label="Target" value={formatNumber(selectedCell.target)} />
                  <KpiCard label="Actual" value={formatNumber(selectedCell.actual)} tone="accent" />
                  <KpiCard
                    label="Completion"
                    value={formatPercent(selectedCell.completionPct)}
                    tone={pickToneByCompletion(selectedCell.completionPct)}
                  />
                  <KpiCard
                    label="Downtime"
                    value={formatMinutes(selectedCell.downtimeMin)}
                    tone={pickToneByDowntime(selectedCell.downtimeMin)}
                  />
                  <KpiCard label="Good" value={formatNumber(selectedCell.good)} tone="success" />
                  <KpiCard label="Fail" value={formatNumber(selectedCell.defect)} tone="danger" />
                </SectionGrid>

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
                  <InfoLine label="Live Part Code" value={selectedCell.livePartCode} />
                  <InfoLine label="Live Part Name" value={selectedCell.livePartName} />
                  <InfoLine label="Completed Jobs Today" value={formatNumber(selectedCell.completedJobsCount)} />
                  <InfoLine label="Part Mix Count" value={formatNumber(selectedCell.partMixCount)} />
                  <InfoLine label="Top Downtime Station" value={selectedCell.topDowntimeStation.stationName} />
                  <InfoLine label="Downtime Share" value={formatMaybePercent(selectedCell.topDowntimeStation.sharePct)} />
                  <InfoLine label="Category" value={selectedCell.topDowntimeStation.category} />
                  <InfoLine label="Reason" value={selectedCell.topDowntimeStation.reason} />
                  <InfoLine label="Max Shift Production" value={formatNumber(selectedCell.maxProduction)} />
                  <InfoLine label="Min Shift Production" value={formatNumber(selectedCell.minProduction)} />
                  <InfoLine label="Max Station Stop" value={formatMinutes(selectedCell.maxDowntime)} />
                  <InfoLine label="Min Station Stop" value={formatMinutes(selectedCell.minDowntime)} />
                  <InfoLine label="Quality" value={formatPercent(selectedCell.qualityPct)} />
                </div>
              </div>
            )}
          </Card>

          <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
            <Card title="Selected Cell Station Mix" subtitle="Station contribution to selected cell downtime" tone="accent">
              {!selectedCell ? (
                <div style={{ color: PAGE.subtext }}>No cell selected.</div>
              ) : (
                <ChartLegendStack
                  isMobile={isMobile}
                  chart={
                    <DonutChart
                      items={selectedStationDonutItems}
                      size={donutSize}
                      centerLabel="Stations"
                      centerValue={selectedCell.cellName}
                    />
                  }
                  legend={<LegendList items={selectedStationDonutItems} suffix=" min" />}
                />
              )}
            </Card>

            <Card title="Top Station vs Rest" subtitle="Quick bottleneck dominance view" tone="warn">
              {!selectedCell ? (
                <div style={{ color: PAGE.subtext }}>No cell selected.</div>
              ) : (
                <ChartLegendStack
                  isMobile={isMobile}
                  chart={
                    <DonutChart
                      items={selectedTopVsRestItems}
                      size={donutSize}
                      centerLabel="Top Share"
                      centerValue={formatMaybePercent(selectedCell.topDowntimeStation.sharePct)}
                    />
                  }
                  legend={<LegendList items={selectedTopVsRestItems} suffix=" min" />}
                />
              )}
            </Card>
          </div>
        </SectionGrid>

        <SectionGrid min={360}>
          <Card title="Production Extremes" subtitle="Daily max / min production and completion insights" tone="success">
            <ExtremesList
              rows={[
                {
                  label: "Max Production",
                  value: summary.maxProductionCell
                    ? `${summary.maxProductionCell.cellName} • ${formatNumber(summary.maxProductionCell.actual)}`
                    : "—",
                  subvalue: summary.maxProductionCell
                    ? `Target ${formatNumber(summary.maxProductionCell.target)} • Completion ${formatPercent(
                        summary.maxProductionCell.completionPct
                      )}`
                    : "—",
                },
                {
                  label: "Min Production",
                  value: summary.minProductionCell
                    ? `${summary.minProductionCell.cellName} • ${formatNumber(summary.minProductionCell.actual)}`
                    : "—",
                  subvalue: summary.minProductionCell
                    ? `Target ${formatNumber(summary.minProductionCell.target)} • Completion ${formatPercent(
                        summary.minProductionCell.completionPct
                      )}`
                    : "—",
                },
                {
                  label: "Max Completion",
                  value: summary.bestCompletionCell
                    ? `${summary.bestCompletionCell.cellName} • ${formatPercent(summary.bestCompletionCell.completionPct)}`
                    : "—",
                  subvalue: summary.bestCompletionCell
                    ? `Actual ${formatNumber(summary.bestCompletionCell.actual)} of ${formatNumber(
                        summary.bestCompletionCell.target
                      )}`
                    : "—",
                },
                {
                  label: "Min Completion",
                  value: summary.worstCompletionCell
                    ? `${summary.worstCompletionCell.cellName} • ${formatPercent(summary.worstCompletionCell.completionPct)}`
                    : "—",
                  subvalue: summary.worstCompletionCell
                    ? `Actual ${formatNumber(summary.worstCompletionCell.actual)} of ${formatNumber(
                        summary.worstCompletionCell.target
                      )}`
                    : "—",
                },
              ]}
            />
          </Card>

          <Card title="Downtime Extremes" subtitle="Daily max / min downtime and biggest single stop" tone="warn">
            <ExtremesList
              rows={[
                {
                  label: "Max Downtime",
                  value: summary.maxDowntimeCell
                    ? `${summary.maxDowntimeCell.cellName} • ${formatMinutes(summary.maxDowntimeCell.downtimeMin)}`
                    : "—",
                  subvalue: summary.maxDowntimeCell
                    ? `Top station ${summary.maxDowntimeCell.topDowntimeStation.stationName}`
                    : "—",
                },
                {
                  label: "Min Downtime",
                  value: summary.minDowntimeCell
                    ? `${summary.minDowntimeCell.cellName} • ${formatMinutes(summary.minDowntimeCell.downtimeMin)}`
                    : "—",
                  subvalue: summary.minDowntimeCell
                    ? `Top station ${summary.minDowntimeCell.topDowntimeStation.stationName}`
                    : "—",
                },
                {
                  label: "Largest Single Station Stop",
                  value: summary.maxSingleStopCell
                    ? `${summary.maxSingleStopCell.cellName} • ${summary.maxSingleStopCell.topDowntimeStation.stationName}`
                    : "—",
                  subvalue: summary.maxSingleStopCell
                    ? `${formatMinutes(summary.maxSingleStopCell.topDowntimeStation.downtimeMin)} • ${
                        summary.maxSingleStopCell.topDowntimeStation.reason
                      }`
                    : "—",
                },
                {
                  label: "Worst Quality Cell",
                  value: summary.worstQualityCell
                    ? `${summary.worstQualityCell.cellName} • ${formatPercent(summary.worstQualityCell.qualityPct)}`
                    : "—",
                  subvalue: summary.worstQualityCell
                    ? `Fail ${formatNumber(summary.worstQualityCell.defect)} • Suspect ${formatNumber(
                        summary.worstQualityCell.suspect
                      )}`
                    : "—",
                },
              ]}
            />
          </Card>
        </SectionGrid>

        <Card
          title="Bottleneck Station Analysis"
          subtitle="Top downtime station per cell for maintenance and report readiness"
          tone="default"
        >
          {isCompact ? (
            <BottleneckCardList
              rows={sortedCells}
              selectedId={selectedCell?.id}
              onSelect={(row) => setSelectedId(row.id)}
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <BottleneckTable
                rows={sortedCells}
                selectedId={selectedCell?.id}
                onSelect={(row) => setSelectedId(row.id)}
              />
            </div>
          )}
        </Card>

        <Card
          title="Daily Quality Summary"
          subtitle="Daily production quality totals prepared for future reports aggregation"
          tone="success"
        >
          <SectionGrid min={180} gap={10}>
            <KpiCard label="Total Good" value={formatNumber(summary.totalGood)} tone="success" />
            <KpiCard label="Total Fail" value={formatNumber(summary.totalDefect)} tone="danger" />
            <KpiCard label="Total Suspect" value={formatNumber(summary.totalSuspect)} tone="warn" />
            <KpiCard
              label="Best Quality Cell"
              value={summary.bestQualityCell ? summary.bestQualityCell.cellName : "—"}
              subvalue={summary.bestQualityCell ? formatPercent(summary.bestQualityCell.qualityPct) : "—"}
              tone="accent"
            />
            <KpiCard
              label="Worst Quality Cell"
              value={summary.worstQualityCell ? summary.worstQualityCell.cellName : "—"}
              subvalue={summary.worstQualityCell ? formatPercent(summary.worstQualityCell.qualityPct) : "—"}
              tone="danger"
            />
          </SectionGrid>
        </Card>
      </div>
    </div>
  );
}