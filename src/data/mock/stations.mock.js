// src/data/mock/stations.mock.js

export const STATIONS = [
  {
    id: "ST-101",
    name: "Robot Weld 1",
    line: "Line A",
    area: "Body Shop",
    deviceIds: ["RB-101", "HMI-101", "CAM-101"],
  },
  {
    id: "ST-102",
    name: "Robot Weld 2",
    line: "Line A",
    area: "Body Shop",
    deviceIds: ["RB-102", "HMI-102", "CAM-102"],
  },
  {
    id: "ST-201",
    name: "Assembly 1",
    line: "Line B",
    area: "Assembly",
    deviceIds: ["PLC-201", "HMI-201", "CAM-201"],
  },
];

export const TELEMETRY_BY_STATION_ID = {
  "ST-101": {
    stationId: "ST-101",
    ts: "2026-01-29T18:10:12-05:00",
    state: "RUN", // RUN | STOP | DOWN | IDLE
    part: { code: "C1UL-SPOILER", model: "SPOILER", rev: "A" },
    counts: { good: 1240, defect: 12, suspect: 3 },
    cycle: { currentSec: 42.1, avgSec: 45.6, targetSec: 44.0 },
    downtime: { active: false, startedAt: null, category: null, reasonCode: null, reasonText: null },
    alarms: {
      activeCount: 1,
      latest: [
        { id: "AL-9001", code: "E231", text: "Air pressure low", severity: "HIGH", ts: "2026-01-29T18:09:00-05:00" },
      ],
      topRecurring: [
        { code: "E231", text: "Air pressure low", count24h: 18, severity: "HIGH" },
      ],
    },
    hmi: { mode: "SNAPSHOT", lastSnapshotTs: "2026-01-29T18:09:30-05:00" },
    camera: { available: true, mode: "RTSP" },
  },

  "ST-102": {
    stationId: "ST-102",
    ts: "2026-01-29T18:10:05-05:00",
    state: "DOWN",
    part: { code: "DT-FRT-01", model: "FRONT", rev: "B" },
    counts: { good: 980, defect: 22, suspect: 1 },
    cycle: { currentSec: 0, avgSec: 47.2, targetSec: 46.0 },
    downtime: {
      active: true,
      startedAt: "2026-01-29T18:02:00-05:00",
      category: "Maintenance",
      reasonCode: "ROBOT_FAULT",
      reasonText: "Servo alarm",
    },
    alarms: {
      activeCount: 2,
      latest: [
        { id: "AL-9002", code: "S100", text: "Servo overload", severity: "HIGH", ts: "2026-01-29T18:02:10-05:00" },
        { id: "AL-9003", code: "N045", text: "Network jitter", severity: "MED", ts: "2026-01-29T18:03:40-05:00" },
      ],
      topRecurring: [
        { code: "S100", text: "Servo overload", count24h: 7, severity: "HIGH" },
        { code: "N045", text: "Network jitter", count24h: 25, severity: "MED" },
      ],
    },
    hmi: { mode: "SNAPSHOT", lastSnapshotTs: "2026-01-29T18:09:15-05:00" },
    camera: { available: true, mode: "RTSP" },
  },

  "ST-201": {
    stationId: "ST-201",
    ts: "2026-01-29T18:10:00-05:00",
    state: "IDLE",
    part: { code: "ASSY-77", model: "ASSEMBLY", rev: "C" },
    counts: { good: 430, defect: 4, suspect: 0 },
    cycle: { currentSec: 0, avgSec: 60.1, targetSec: 58.0 },
    downtime: { active: false, startedAt: null, category: null, reasonCode: null, reasonText: null },
    alarms: {
      activeCount: 0,
      latest: [],
      topRecurring: [
        { code: "Q010", text: "Quality check delay", count24h: 9, severity: "LOW" },
      ],
    },
    hmi: { mode: "SNAPSHOT", lastSnapshotTs: "2026-01-29T18:08:50-05:00" },
    camera: { available: false, mode: null },
  },
};
