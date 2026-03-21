// src/state/alarmSystem.rollups.js

import {
  REQUEST_STATUS,
  DOWNTIME_STATUS,
  SHIFT_ORDER,
} from "./alarmSystem.types";
import { diffMinutes } from "./alarmSystem.helpers";

function avg(list) {
  const arr = (Array.isArray(list) ? list : []).filter((n) => Number.isFinite(Number(n)));
  if (!arr.length) return 0;
  return Number((arr.reduce((a, b) => a + Number(b), 0) / arr.length).toFixed(1));
}

function topKeyCount(list = []) {
  const map = {};
  list.forEach((key) => {
    const safe = key || "—";
    map[safe] = (map[safe] || 0) + 1;
  });

  return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function topKeyMinutes(rows = []) {
  const map = {};
  rows.forEach((row) => {
    const key = row?.key || "—";
    const value = Number(row?.value || 0);
    map[key] = (map[key] || 0) + value;
  });

  return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function getRequestDelayMin(req, downtimeById) {
  if (!req?.linkedDowntimeId) return null;
  const dt = downtimeById[req.linkedDowntimeId];
  if (!dt) return null;
  return diffMinutes(req.requestedAt, dt.startedAt);
}

function buildMttr(downtimes = []) {
  const closed = (Array.isArray(downtimes) ? downtimes : []).filter(
    (dt) => dt.status === DOWNTIME_STATUS.CLOSED && dt.startedAt && dt.endedAt
  );
  return avg(closed.map((dt) => diffMinutes(dt.startedAt, dt.endedAt)));
}

function buildMtbf(downtimes = []) {
  const closed = (Array.isArray(downtimes) ? downtimes : [])
    .filter((dt) => dt.status === DOWNTIME_STATUS.CLOSED && dt.startedAt && dt.endedAt)
    .sort((a, b) => Date.parse(a.startedAt || 0) - Date.parse(b.startedAt || 0));

  const gaps = [];
  for (let i = 1; i < closed.length; i += 1) {
    const prev = closed[i - 1];
    const next = closed[i];
    const gap = diffMinutes(prev.endedAt, next.startedAt);
    if (gap >= 0) gaps.push(gap);
  }

  return avg(gaps);
}

export function buildShiftSummaries({ requests = [], downtimes = [] }) {
  const downtimeById = {};
  downtimes.forEach((dt) => {
    downtimeById[dt.id] = dt;
  });

  const summaryMap = {};

  function keyFor(unitId, businessDate, shiftKey) {
    return `${businessDate}|||${shiftKey}|||${unitId}`;
  }

  function ensureSummary(unitId, unitName, businessDate, shiftKey) {
    const key = keyFor(unitId, businessDate, shiftKey);

    if (!summaryMap[key]) {
      summaryMap[key] = {
        businessDate,
        shiftKey,
        unitId,
        unitName,

        requestCount: 0,
        openRequestCount: 0,
        acknowledgedRequestCount: 0,
        linkedRequestCount: 0,
        closedRequestCount: 0,

        downtimeCount: 0,
        activeDowntimeCount: 0,
        downtimeTotalMin: 0,

        avgAckMin: 0,
        avgRequestToDowntimeMin: 0,
        mttrMin: 0,
        mtbfMin: 0,

        topRequestStation: null,
        topRequestSubject: null,
        topDowntimeStation: null,
        topCategory: null,
        topReason: null,

        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    return summaryMap[key];
  }

  const groupedRequests = {};
  requests.forEach((req) => {
    const key = keyFor(req.unitId, req.businessDate, req.shiftKey);
    if (!groupedRequests[key]) groupedRequests[key] = [];
    groupedRequests[key].push(req);

    ensureSummary(req.unitId, req.unitName, req.businessDate, req.shiftKey);
  });

  const groupedDowntimes = {};
  downtimes.forEach((dt) => {
    const key = keyFor(dt.unitId, dt.businessDate, dt.shiftKey);
    if (!groupedDowntimes[key]) groupedDowntimes[key] = [];
    groupedDowntimes[key].push(dt);

    ensureSummary(dt.unitId, dt.unitName, dt.businessDate, dt.shiftKey);
  });

  Object.keys(summaryMap).forEach((summaryKey) => {
    const summary = summaryMap[summaryKey];
    const reqs = groupedRequests[summaryKey] || [];
    const dts = groupedDowntimes[summaryKey] || [];

    summary.requestCount = reqs.length;
    summary.openRequestCount = reqs.filter((r) => r.status === REQUEST_STATUS.OPEN).length;
    summary.acknowledgedRequestCount = reqs.filter((r) => r.status === REQUEST_STATUS.ACKNOWLEDGED).length;
    summary.linkedRequestCount = reqs.filter((r) => r.status === REQUEST_STATUS.LINKED || r.linkedDowntimeId).length;
    summary.closedRequestCount = reqs.filter((r) => r.status === REQUEST_STATUS.CLOSED).length;

    summary.downtimeCount = dts.length;
    summary.activeDowntimeCount = dts.filter((dt) => dt.status === DOWNTIME_STATUS.ACTIVE).length;
    summary.downtimeTotalMin = dts.reduce((acc, dt) => {
      if (dt.status === DOWNTIME_STATUS.CLOSED) return acc + Number(dt.durationMin || 0);
      return acc;
    }, 0);

    summary.avgAckMin = avg(
      reqs
        .filter((r) => r.acknowledgedAt)
        .map((r) => diffMinutes(r.requestedAt, r.acknowledgedAt))
    );

    summary.avgRequestToDowntimeMin = avg(
      reqs
        .map((r) => getRequestDelayMin(r, downtimeById))
        .filter((n) => Number.isFinite(Number(n)))
    );

    summary.mttrMin = buildMttr(dts);
    summary.mtbfMin = buildMtbf(dts);

    summary.topRequestStation = topKeyCount(reqs.map((r) => r.stationName || r.stationId || "Unit Level"));
    summary.topRequestSubject = topKeyCount(reqs.map((r) => r.subject || "No Subject"));
    summary.topDowntimeStation = topKeyMinutes(
      dts.map((dt) => ({
        key: dt.stationName || dt.stationId || "Unit Level",
        value: Number(dt.durationMin || 0),
      }))
    );
    summary.topCategory = topKeyMinutes(
      dts.map((dt) => ({
        key: dt.categoryLabel || "Unknown",
        value: Number(dt.durationMin || 0),
      }))
    );
    summary.topReason = topKeyMinutes(
      dts.map((dt) => ({
        key: dt.reasonLabel || "Unknown",
        value: Number(dt.durationMin || 0),
      }))
    );

    summary.updatedAt = new Date().toISOString();
  });

  return Object.values(summaryMap).sort((a, b) => {
    if (a.businessDate !== b.businessDate) return a.businessDate < b.businessDate ? 1 : -1;
    if (a.shiftKey !== b.shiftKey) return SHIFT_ORDER.indexOf(a.shiftKey) - SHIFT_ORDER.indexOf(b.shiftKey);
    return String(a.unitName || "").localeCompare(String(b.unitName || ""));
  });
}

export function buildDailySummaries(shiftSummaries = []) {
  const map = {};

  function ensure(unitId, unitName, businessDate) {
    const key = `${businessDate}|||${unitId}`;
    if (!map[key]) {
      map[key] = {
        businessDate,
        unitId,
        unitName,

        shiftARequestCount: 0,
        shiftBRequestCount: 0,
        shiftCRequestCount: 0,
        dailyRequestCount: 0,

        shiftADowntimeMin: 0,
        shiftBDowntimeMin: 0,
        shiftCDowntimeMin: 0,
        dailyDowntimeMin: 0,

        dailyLinkedRequestCount: 0,
        dailyAvgAckMin: 0,
        dailyAvgRequestToDowntimeMin: 0,
        dailyMttrMin: 0,
        dailyMtbfMin: 0,

        topRequestStation: null,
        topDowntimeStation: null,
        topCategory: null,
        topReason: null,
      };
    }
    return map[key];
  }

  const byDailyKey = {};

  (Array.isArray(shiftSummaries) ? shiftSummaries : []).forEach((row) => {
    const daily = ensure(row.unitId, row.unitName, row.businessDate);
    const key = `${row.businessDate}|||${row.unitId}`;
    if (!byDailyKey[key]) byDailyKey[key] = [];
    byDailyKey[key].push(row);

    if (row.shiftKey === "A") {
      daily.shiftARequestCount = row.requestCount;
      daily.shiftADowntimeMin = row.downtimeTotalMin;
    }
    if (row.shiftKey === "B") {
      daily.shiftBRequestCount = row.requestCount;
      daily.shiftBDowntimeMin = row.downtimeTotalMin;
    }
    if (row.shiftKey === "C") {
      daily.shiftCRequestCount = row.requestCount;
      daily.shiftCDowntimeMin = row.downtimeTotalMin;
    }

    daily.dailyRequestCount += Number(row.requestCount || 0);
    daily.dailyDowntimeMin += Number(row.downtimeTotalMin || 0);
    daily.dailyLinkedRequestCount += Number(row.linkedRequestCount || 0);
  });

  Object.keys(byDailyKey).forEach((key) => {
    const rows = byDailyKey[key] || [];
    const daily = map[key];

    daily.dailyAvgAckMin = avg(rows.map((r) => r.avgAckMin));
    daily.dailyAvgRequestToDowntimeMin = avg(rows.map((r) => r.avgRequestToDowntimeMin));
    daily.dailyMttrMin = avg(rows.map((r) => r.mttrMin));
    daily.dailyMtbfMin = avg(rows.map((r) => r.mtbfMin));

    daily.topRequestStation = topKeyCount(rows.map((r) => r.topRequestStation).filter(Boolean));
    daily.topDowntimeStation = topKeyCount(rows.map((r) => r.topDowntimeStation).filter(Boolean));
    daily.topCategory = topKeyCount(rows.map((r) => r.topCategory).filter(Boolean));
    daily.topReason = topKeyCount(rows.map((r) => r.topReason).filter(Boolean));
  });

  return Object.values(map).sort((a, b) => {
    if (a.businessDate !== b.businessDate) return a.businessDate < b.businessDate ? 1 : -1;
    return String(a.unitName || "").localeCompare(String(b.unitName || ""));
  });
}