// src/data/mock/alarmSystem.seed.js

import { getPlant3Units } from "../mock/plant3.units.mock";
import {
  DOWNTIME_CATALOG,
  REQUEST_STATUS,
  DOWNTIME_STATUS,
  SOURCE_TYPE,
} from "../../state/alarmSystem.types";
import {
  makeId,
  normalizeRequest,
  normalizeDowntime,
  normalizeEvent,
  severityFromCategoryCode,
} from "../../state/alarmSystem.helpers";

function minutesAgoIso(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

export function buildAlarmSystemSeed() {
  const units = getPlant3Units().slice(0, 6);

  const requests = [];
  const downtimes = [];
  const events = [];

  units.forEach((unit, idx) => {
    const cat = DOWNTIME_CATALOG[idx % DOWNTIME_CATALOG.length];
    const reason = cat.reasons[idx % cat.reasons.length];

    const req = normalizeRequest({
      id: makeId("REQ"),
      unitId: unit.id,
      unitName: unit.name,
      stationId: unit.activeStationId || null,
      stationName: unit.activeStationName || null,
      subject: reason.label,
      description: `${reason.label} reported by operator`,
      sourceType: SOURCE_TYPE.OPERATOR,
      requestedBy: `operator-${idx + 1}`,
      requestedAt: minutesAgoIso(180 - idx * 12),
      status: idx % 3 === 0 ? REQUEST_STATUS.OPEN : idx % 3 === 1 ? REQUEST_STATUS.ACKNOWLEDGED : REQUEST_STATUS.LINKED,
    });

    requests.push(req);

    events.push(
      normalizeEvent({
        eventType: "REQUEST_CREATED",
        requestId: req.id,
        unitId: req.unitId,
        unitName: req.unitName,
        stationId: req.stationId,
        stationName: req.stationName,
        subject: req.subject,
        description: req.description,
        actor: req.requestedBy,
        sourceType: req.sourceType,
        severity: severityFromCategoryCode(cat.code),
        tsISO: req.requestedAt,
        text: `Request created — ${req.subject}`,
      })
    );

    if (req.status === REQUEST_STATUS.ACKNOWLEDGED || req.status === REQUEST_STATUS.LINKED) {
      const ackAt = minutesAgoIso(160 - idx * 10);
      req.acknowledgedAt = ackAt;
      req.acknowledgedBy = `teamlead-${idx + 1}`;

      events.push(
        normalizeEvent({
          eventType: "REQUEST_ACKNOWLEDGED",
          requestId: req.id,
          unitId: req.unitId,
          unitName: req.unitName,
          stationId: req.stationId,
          stationName: req.stationName,
          subject: req.subject,
          actor: req.acknowledgedBy,
          sourceType: SOURCE_TYPE.TEAM_LEAD,
          severity: severityFromCategoryCode(cat.code),
          tsISO: ackAt,
          text: `Request acknowledged — ${req.subject}`,
        })
      );
    }

    if (req.status === REQUEST_STATUS.LINKED) {
      const dt = normalizeDowntime({
        id: makeId("DT"),
        unitId: unit.id,
        unitName: unit.name,
        stationId: unit.activeStationId || null,
        stationName: unit.activeStationName || null,
        sourceRequestId: req.id,
        sourceType: SOURCE_TYPE.OPERATOR,
        categoryCode: cat.code,
        categoryLabel: cat.group,
        reasonCode: reason.code,
        reasonLabel: reason.label,
        startedAt: minutesAgoIso(145 - idx * 8),
        status: idx % 2 === 0 ? DOWNTIME_STATUS.CLOSED : DOWNTIME_STATUS.ACTIVE,
      });

      if (dt.status === DOWNTIME_STATUS.CLOSED) {
        dt.endedAt = minutesAgoIso(120 - idx * 7);
        dt.durationMin = Math.max(
          0,
          Math.round((Date.parse(dt.endedAt) - Date.parse(dt.startedAt)) / 60000)
        );
      }

      req.linkedDowntimeId = dt.id;
      downtimes.push(dt);

      events.push(
        normalizeEvent({
          eventType: "REQUEST_LINKED_TO_DOWNTIME",
          requestId: req.id,
          downtimeId: dt.id,
          unitId: req.unitId,
          unitName: req.unitName,
          stationId: req.stationId,
          stationName: req.stationName,
          actor: "system",
          sourceType: SOURCE_TYPE.SYSTEM,
          severity: severityFromCategoryCode(cat.code),
          categoryCode: dt.categoryCode,
          categoryLabel: dt.categoryLabel,
          reasonCode: dt.reasonCode,
          reasonLabel: dt.reasonLabel,
          tsISO: dt.startedAt,
          text: `Request linked to downtime — ${dt.categoryLabel}: ${dt.reasonLabel}`,
        })
      );

      events.push(
        normalizeEvent({
          eventType: "DT_STARTED",
          downtimeId: dt.id,
          requestId: req.id,
          unitId: dt.unitId,
          unitName: dt.unitName,
          stationId: dt.stationId,
          stationName: dt.stationName,
          actor: "operator",
          sourceType: dt.sourceType,
          severity: severityFromCategoryCode(dt.categoryCode),
          categoryCode: dt.categoryCode,
          categoryLabel: dt.categoryLabel,
          reasonCode: dt.reasonCode,
          reasonLabel: dt.reasonLabel,
          tsISO: dt.startedAt,
          text: `Downtime started — ${dt.categoryLabel}: ${dt.reasonLabel}`,
        })
      );

      if (dt.status === DOWNTIME_STATUS.CLOSED) {
        events.push(
          normalizeEvent({
            eventType: "DT_ENDED",
            downtimeId: dt.id,
            requestId: req.id,
            unitId: dt.unitId,
            unitName: dt.unitName,
            stationId: dt.stationId,
            stationName: dt.stationName,
            actor: "operator",
            sourceType: dt.sourceType,
            severity: severityFromCategoryCode(dt.categoryCode),
            categoryCode: dt.categoryCode,
            categoryLabel: dt.categoryLabel,
            reasonCode: dt.reasonCode,
            reasonLabel: dt.reasonLabel,
            tsISO: dt.endedAt,
            text: `Downtime ended — ${dt.categoryLabel}: ${dt.reasonLabel}`,
          })
        );
      }
    }
  });

  const sortedEvents = events.sort((a, b) => Date.parse(b.tsISO || 0) - Date.parse(a.tsISO || 0));

  return {
    requests,
    downtimes,
    events: sortedEvents,
  };
}