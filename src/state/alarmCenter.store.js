// src/state/alarmCenter.store.js

import { useMemo, useSyncExternalStore } from "react";
import { getPlant3Units } from "../data/mock/plant3.units.mock";
import { buildAlarmSystemSeed } from "../data/mock/alarmSystem.seed";
import {
  DOWNTIME_CATALOG,
  EVENT_TYPE,
  PRINTABLE_TYPES,
  REQUEST_STATUS,
  DOWNTIME_STATUS,
  SEVERITY,
  SOURCE_TYPE,
} from "./alarmSystem.types";
import {
  buildActiveMaps,
  computeBadgeCount,
  makeId,
  normalizeDowntime,
  normalizeEvent,
  normalizeRequest,
  resolveUnitStation,
  safeISO,
  severityFromCategoryCode,
  toLegacyLog,
} from "./alarmSystem.helpers";
import {
  buildShiftSummaries,
  buildDailySummaries,
} from "./alarmSystem.rollups";

// Demo controls:
// - window.__FS_DEMO_ALARMS__ = false -> disable demo engine
// - window.__FS_DEMO_ALARMS__ = true  -> enable demo engine
const DEFAULT_DEMO_ENABLED = true;
const DEMO_INTERVAL_MS = 40_000;

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function createStore() {
  const seed = buildAlarmSystemSeed();

  let state = {
    unread: computeBadgeCount(seed.events),
    log: toLegacyLog(seed.events),

    requests: seed.requests,
    downtimes: seed.downtimes,
    events: seed.events,

    summaries: {
      shift: buildShiftSummaries({
        requests: seed.requests,
        downtimes: seed.downtimes,
      }),
      daily: buildDailySummaries(
        buildShiftSummaries({
          requests: seed.requests,
          downtimes: seed.downtimes,
        })
      ),
      weekly: [],
      monthly: [],
      yearly: [],
    },
  };

  const listeners = new Set();

  let engineStarted = false;
  let demoTimer = null;

  function emit() {
    listeners.forEach((l) => l());
  }

  function recompute(nextState) {
    const events = Array.isArray(nextState.events) ? nextState.events : [];
    const requests = Array.isArray(nextState.requests) ? nextState.requests : [];
    const downtimes = Array.isArray(nextState.downtimes) ? nextState.downtimes : [];

    const shift = buildShiftSummaries({ requests, downtimes });
    const daily = buildDailySummaries(shift);

    return {
      ...nextState,
      unread: computeBadgeCount(events),
      log: toLegacyLog(events),
      summaries: {
        shift,
        daily,
        weekly: nextState?.summaries?.weekly || [],
        monthly: nextState?.summaries?.monthly || [],
        yearly: nextState?.summaries?.yearly || [],
      },
    };
  }

  function setState(partialUpdater) {
    const draft =
      typeof partialUpdater === "function"
        ? partialUpdater(state)
        : { ...state, ...partialUpdater };

    state = recompute(draft);
    emit();
  }

  function getSnapshot() {
    return state;
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function getActiveMaps() {
    return buildActiveMaps({
      events: state.events,
      requests: state.requests,
      downtimes: state.downtimes,
    });
  }

  function pushEvent(eventInput) {
    const event = normalizeEvent(eventInput);
    setState((prev) => ({
      ...prev,
      events: [event, ...prev.events].slice(0, 1000),
    }));
    return event;
  }

  // Backward-compatible API used by current pages
  function pushAlarm(row) {
    const legacyType = row?.eventType || "";

    if (legacyType === EVENT_TYPE.DT_START || legacyType === EVENT_TYPE.DT_STARTED) {
      const dt = startDowntime({
        unitId: row?.unitId,
        unitName: row?.unitName,
        stationId: row?.stationId || null,
        stationName: row?.stationName || null,
        categoryCode: row?.categoryCode || "PROCESS",
        categoryLabel: row?.category || "Process",
        reasonCode: row?.reasonCode || "UNKNOWN",
        reasonLabel: row?.reason || "Unknown",
        sourceType: row?.sourceType || SOURCE_TYPE.OPERATOR,
        startedAt: row?.tsISO || safeISO(Date.now()),
      });
      return dt;
    }

    if (legacyType === EVENT_TYPE.DT_END || legacyType === EVENT_TYPE.DT_ENDED) {
      return endDowntimeByUnit(row?.unitId, row?.tsISO || safeISO(Date.now()));
    }

    if (legacyType === EVENT_TYPE.ALARM_RAISE) {
      return pushEvent({
        id: row?.id || makeId("EVT"),
        eventType: EVENT_TYPE.ALARM_RAISE,
        unitId: row?.unitId || null,
        unitName: row?.unitName || row?.unitId || "Unknown Unit",
        stationId: row?.stationId || null,
        stationName: row?.stationName || null,
        severity: row?.severity || SEVERITY.LOW,
        categoryLabel: row?.category || "",
        reasonLabel: row?.reason || "",
        sourceType: row?.sourceType || SOURCE_TYPE.SYSTEM,
        tsISO: row?.tsISO || safeISO(Date.now()),
        text: row?.text || "",
      });
    }

    if (legacyType === EVENT_TYPE.ALARM_CLEAR) {
      return pushEvent({
        id: row?.id || makeId("EVT"),
        eventType: EVENT_TYPE.ALARM_CLEAR,
        unitId: row?.unitId || null,
        unitName: row?.unitName || row?.unitId || "Unknown Unit",
        stationId: row?.stationId || null,
        stationName: row?.stationName || null,
        severity: row?.severity || SEVERITY.LOW,
        categoryLabel: row?.category || "",
        reasonLabel: row?.reason || "",
        sourceType: row?.sourceType || SOURCE_TYPE.OPERATOR,
        tsISO: row?.tsISO || safeISO(Date.now()),
        text: row?.text || "",
      });
    }

    return pushEvent({
      id: row?.id || makeId("EVT"),
      eventType: legacyType || EVENT_TYPE.ALARM_RAISE,
      unitId: row?.unitId || null,
      unitName: row?.unitName || row?.unitId || "Unknown Unit",
      stationId: row?.stationId || null,
      stationName: row?.stationName || null,
      severity: row?.severity || SEVERITY.LOW,
      categoryLabel: row?.category || "",
      reasonLabel: row?.reason || "",
      sourceType: row?.sourceType || SOURCE_TYPE.SYSTEM,
      tsISO: row?.tsISO || safeISO(Date.now()),
      text: row?.text || "",
    });
  }

  function createRequest(payload = {}) {
    const request = normalizeRequest(payload);

    setState((prev) => ({
      ...prev,
      requests: [request, ...prev.requests],
      events: [
        normalizeEvent({
          eventType: EVENT_TYPE.REQUEST_CREATED,
          requestId: request.id,
          unitId: request.unitId,
          unitName: request.unitName,
          cellId: request.cellId,
          stationId: request.stationId,
          stationName: request.stationName,
          subject: request.subject,
          description: request.description,
          actor: request.requestedBy,
          sourceType: request.sourceType,
          severity: SEVERITY.MED,
          tsISO: request.requestedAt,
          text: `Request created — ${request.subject || "No Subject"}`,
        }),
        ...prev.events,
      ].slice(0, 1000),
    }));

    return request;
  }

  function acknowledgeRequest(requestId, actor = "teamlead") {
    const nowISO = safeISO(Date.now());
    let updatedRequest = null;

    setState((prev) => {
      const nextRequests = prev.requests.map((req) => {
        if (req.id !== requestId) return req;
        updatedRequest = {
          ...req,
          status: REQUEST_STATUS.ACKNOWLEDGED,
          acknowledgedAt: nowISO,
          acknowledgedBy: actor,
        };
        return updatedRequest;
      });

      if (!updatedRequest) return prev;

      return {
        ...prev,
        requests: nextRequests,
        events: [
          normalizeEvent({
            eventType: EVENT_TYPE.REQUEST_ACKNOWLEDGED,
            requestId: updatedRequest.id,
            unitId: updatedRequest.unitId,
            unitName: updatedRequest.unitName,
            cellId: updatedRequest.cellId,
            stationId: updatedRequest.stationId,
            stationName: updatedRequest.stationName,
            subject: updatedRequest.subject,
            description: updatedRequest.description,
            actor,
            sourceType: SOURCE_TYPE.TEAM_LEAD,
            severity: SEVERITY.MED,
            tsISO: nowISO,
            text: `Request acknowledged — ${updatedRequest.subject || "No Subject"}`,
          }),
          ...prev.events,
        ].slice(0, 1000),
      };
    });

    return updatedRequest;
  }

  function closeRequest(requestId, actor = "maintenance") {
    const nowISO = safeISO(Date.now());
    let updatedRequest = null;

    setState((prev) => {
      const nextRequests = prev.requests.map((req) => {
        if (req.id !== requestId) return req;
        updatedRequest = {
          ...req,
          status: REQUEST_STATUS.CLOSED,
          closedAt: nowISO,
          closedBy: actor,
        };
        return updatedRequest;
      });

      if (!updatedRequest) return prev;

      return {
        ...prev,
        requests: nextRequests,
        events: [
          normalizeEvent({
            eventType: EVENT_TYPE.REQUEST_CLOSED,
            requestId: updatedRequest.id,
            unitId: updatedRequest.unitId,
            unitName: updatedRequest.unitName,
            cellId: updatedRequest.cellId,
            stationId: updatedRequest.stationId,
            stationName: updatedRequest.stationName,
            subject: updatedRequest.subject,
            description: updatedRequest.description,
            actor,
            sourceType: SOURCE_TYPE.MAINTENANCE,
            severity: SEVERITY.LOW,
            tsISO: nowISO,
            text: `Request closed — ${updatedRequest.subject || "No Subject"}`,
          }),
          ...prev.events,
        ].slice(0, 1000),
      };
    });

    return updatedRequest;
  }

  function startDowntime(payload = {}) {
    const downtime = normalizeDowntime(payload);

    setState((prev) => {
      const nextRequests = prev.requests.map((req) => {
        if (req.id !== downtime.sourceRequestId) return req;
        return {
          ...req,
          status: REQUEST_STATUS.LINKED,
          linkedDowntimeId: downtime.id,
        };
      });

      const linkEvent = downtime.sourceRequestId
        ? normalizeEvent({
            eventType: EVENT_TYPE.REQUEST_LINKED_TO_DOWNTIME,
            requestId: downtime.sourceRequestId,
            downtimeId: downtime.id,
            unitId: downtime.unitId,
            unitName: downtime.unitName,
            cellId: downtime.cellId,
            stationId: downtime.stationId,
            stationName: downtime.stationName,
            actor: "system",
            sourceType: SOURCE_TYPE.SYSTEM,
            severity: severityFromCategoryCode(downtime.categoryCode),
            categoryCode: downtime.categoryCode,
            categoryLabel: downtime.categoryLabel,
            reasonCode: downtime.reasonCode,
            reasonLabel: downtime.reasonLabel,
            tsISO: downtime.startedAt,
            text: `Request linked to downtime — ${downtime.categoryLabel}: ${downtime.reasonLabel}`,
          })
        : null;

      return {
        ...prev,
        requests: nextRequests,
        downtimes: [downtime, ...prev.downtimes],
        events: [
          normalizeEvent({
            eventType: EVENT_TYPE.DT_STARTED,
            downtimeId: downtime.id,
            requestId: downtime.sourceRequestId,
            unitId: downtime.unitId,
            unitName: downtime.unitName,
            cellId: downtime.cellId,
            stationId: downtime.stationId,
            stationName: downtime.stationName,
            actor: payload?.actor || "operator",
            sourceType: downtime.sourceType,
            severity: severityFromCategoryCode(downtime.categoryCode),
            categoryCode: downtime.categoryCode,
            categoryLabel: downtime.categoryLabel,
            reasonCode: downtime.reasonCode,
            reasonLabel: downtime.reasonLabel,
            tsISO: downtime.startedAt,
            text: `Downtime started — ${downtime.categoryLabel}: ${downtime.reasonLabel}`,
          }),
          ...(linkEvent ? [linkEvent] : []),
          ...prev.events,
        ].slice(0, 1000),
      };
    });

    return downtime;
  }

  function endDowntime(downtimeId, endedAt = safeISO(Date.now())) {
    let closedDowntime = null;

    setState((prev) => {
      const nextDowntimes = prev.downtimes.map((dt) => {
        if (dt.id !== downtimeId) return dt;
        closedDowntime = {
          ...dt,
          status: DOWNTIME_STATUS.CLOSED,
          endedAt,
          durationMin: Math.max(
            0,
            Math.round((Date.parse(endedAt) - Date.parse(dt.startedAt || endedAt)) / 60000)
          ),
        };
        return closedDowntime;
      });

      if (!closedDowntime) return prev;

      return {
        ...prev,
        downtimes: nextDowntimes,
        events: [
          normalizeEvent({
            eventType: EVENT_TYPE.DT_ENDED,
            downtimeId: closedDowntime.id,
            requestId: closedDowntime.sourceRequestId,
            unitId: closedDowntime.unitId,
            unitName: closedDowntime.unitName,
            cellId: closedDowntime.cellId,
            stationId: closedDowntime.stationId,
            stationName: closedDowntime.stationName,
            actor: "operator",
            sourceType: closedDowntime.sourceType,
            severity: severityFromCategoryCode(closedDowntime.categoryCode),
            categoryCode: closedDowntime.categoryCode,
            categoryLabel: closedDowntime.categoryLabel,
            reasonCode: closedDowntime.reasonCode,
            reasonLabel: closedDowntime.reasonLabel,
            tsISO: endedAt,
            text: `Downtime ended — ${closedDowntime.categoryLabel}: ${closedDowntime.reasonLabel}`,
          }),
          ...prev.events,
        ].slice(0, 1000),
      };
    });

    return closedDowntime;
  }

  function endDowntimeByUnit(unitId, endedAt = safeISO(Date.now())) {
    const active = [...state.downtimes].find(
      (dt) => dt.unitId === unitId && dt.status === DOWNTIME_STATUS.ACTIVE
    );
    if (!active) return null;
    return endDowntime(active.id, endedAt);
  }

  function clearAll() {
    setState((prev) => ({
      ...prev,
      requests: [],
      downtimes: [],
      events: [],
    }));
  }

  function markAllRead() {
    emit();
  }

  function stopDemoEngine() {
    if (demoTimer && typeof window !== "undefined") {
      window.clearInterval(demoTimer);
    }
    demoTimer = null;
  }

  function startDemoEngine() {
    if (demoTimer || typeof window === "undefined") return;

    const units = getPlant3Units();
    if (!units?.length) return;

    demoTimer = window.setInterval(() => {
      const enabled = window.__FS_DEMO_ALARMS__ ?? DEFAULT_DEMO_ENABLED;
      if (!enabled) return;

      const unit = pickRandom(units);
      const cat = pickRandom(DOWNTIME_CATALOG);
      const reason = pickRandom(cat.reasons);
      const activeMaps = getActiveMaps();

      const shouldCreateRequest = Math.random() < 0.6;
      const shouldCreateDowntime = Math.random() < 0.42;

      const meta = resolveUnitStation(unit);

      if (shouldCreateRequest) {
        createRequest({
          unitId: meta.unitId,
          unitName: meta.unitName,
          cellId: meta.cellId,
          stationId: meta.stationId,
          stationName: meta.stationName,
          subject: reason.label,
          description: `${reason.label} submitted by operator`,
          sourceType: SOURCE_TYPE.OPERATOR,
          requestedBy: "demo-operator",
          priority: cat.code === "MAINTENANCE" ? "HIGH" : "MED",
        });
      }

      if (shouldCreateDowntime && !activeMaps.activeDowntimeMap[unit.id]) {
        const openReq = state.requests.find(
          (req) =>
            req.unitId === unit.id &&
            [REQUEST_STATUS.OPEN, REQUEST_STATUS.ACKNOWLEDGED].includes(req.status)
        );

        startDowntime({
          unitId: meta.unitId,
          unitName: meta.unitName,
          cellId: meta.cellId,
          stationId: meta.stationId,
          stationName: meta.stationName,
          sourceRequestId: openReq?.id || null,
          sourceType: SOURCE_TYPE.OPERATOR,
          categoryCode: cat.code,
          categoryLabel: cat.group,
          reasonCode: reason.code,
          reasonLabel: reason.label,
          startedAt: safeISO(Date.now()),
        });
        return;
      }

      if (!activeMaps.activeAlarmMap[unit.id]) {
        pushEvent({
          eventType: EVENT_TYPE.ALARM_RAISE,
          unitId: unit.id,
          unitName: unit.name,
          stationId: meta.stationId,
          stationName: meta.stationName,
          severity: severityFromCategoryCode(cat.code),
          categoryCode: cat.code,
          categoryLabel: cat.group,
          reasonCode: reason.code,
          reasonLabel: reason.label,
          sourceType: SOURCE_TYPE.SYSTEM,
          tsISO: safeISO(Date.now()),
          text: `Live alarm — ${cat.group}: ${reason.label}`,
        });
      }
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
    pushEvent,

    createRequest,
    acknowledgeRequest,
    closeRequest,

    startDowntime,
    endDowntime,
    endDowntimeByUnit,

    markAllRead,
    clearAll,

    getActiveMaps,
    startEngine,
    stopDemoEngine,
  };
}

export const alarmCenterStore = createStore();

// Backward-compatible exports
export { EVENT_TYPE, PRINTABLE_TYPES, SEVERITY, SOURCE_TYPE };

export function useAlarmCenter() {
  const snap = useSyncExternalStore(
    alarmCenterStore.subscribe,
    alarmCenterStore.getSnapshot
  );

  return useMemo(
    () => ({
      unread: snap.unread,
      log: snap.log,

      requests: snap.requests,
      downtimes: snap.downtimes,
      events: snap.events,
      summaries: snap.summaries,

      pushAlarm: alarmCenterStore.pushAlarm,
      pushEvent: alarmCenterStore.pushEvent,

      createRequest: alarmCenterStore.createRequest,
      acknowledgeRequest: alarmCenterStore.acknowledgeRequest,
      closeRequest: alarmCenterStore.closeRequest,

      startDowntime: alarmCenterStore.startDowntime,
      endDowntime: alarmCenterStore.endDowntime,
      endDowntimeByUnit: alarmCenterStore.endDowntimeByUnit,

      markAllRead: alarmCenterStore.markAllRead,
      clearAll: alarmCenterStore.clearAll,

      getActiveMaps: alarmCenterStore.getActiveMaps,
      startEngine: alarmCenterStore.startEngine,
      stopDemoEngine: alarmCenterStore.stopDemoEngine,
    }),
    [snap]
  );
}