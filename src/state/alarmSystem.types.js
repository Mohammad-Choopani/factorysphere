// src/state/alarmSystem.types.js

export const SEVERITY = Object.freeze({
  LOW: "LOW",
  MED: "MED",
  HIGH: "HIGH",
});

export const SOURCE_TYPE = Object.freeze({
  SYSTEM: "SYSTEM",
  OPERATOR: "OPERATOR",
  TEAM_LEAD: "TEAM_LEAD",
  MAINTENANCE: "MAINTENANCE",
});

export const REQUEST_STATUS = Object.freeze({
  OPEN: "OPEN",
  ACKNOWLEDGED: "ACKNOWLEDGED",
  LINKED: "LINKED",
  CLOSED: "CLOSED",
  CANCELLED: "CANCELLED",
});

export const DOWNTIME_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  CLOSED: "CLOSED",
});

export const EVENT_TYPE = Object.freeze({
  REQUEST_CREATED: "REQUEST_CREATED",
  REQUEST_ACKNOWLEDGED: "REQUEST_ACKNOWLEDGED",
  REQUEST_LINKED_TO_DOWNTIME: "REQUEST_LINKED_TO_DOWNTIME",
  REQUEST_CLOSED: "REQUEST_CLOSED",
  REQUEST_CANCELLED: "REQUEST_CANCELLED",

  DT_STARTED: "DT_STARTED",
  DT_ENDED: "DT_ENDED",

  MANUAL_DT_STARTED: "MANUAL_DT_STARTED",
  MANUAL_DT_ENDED: "MANUAL_DT_ENDED",

  ALARM_RAISE: "ALARM_RAISE",
  ALARM_CLEAR: "ALARM_CLEAR",

  // Backward compatibility with old pages
  DT_START: "DT_START",
  DT_END: "DT_END",
});

export const PRINTABLE_TYPES = new Set([
  EVENT_TYPE.REQUEST_CREATED,
  EVENT_TYPE.DT_STARTED,
  EVENT_TYPE.MANUAL_DT_STARTED,
  EVENT_TYPE.ALARM_RAISE,

  // Backward compatibility
  EVENT_TYPE.DT_START,
]);

export const SHIFT_ORDER = ["A", "B", "C"];

export const SHIFT_WINDOWS = Object.freeze({
  A: { startHour: 6, endHour: 14 },
  B: { startHour: 14, endHour: 22 },
  C: { startHour: 22, endHour: 6 },
});

export const DOWNTIME_CATALOG = [
  {
    group: "Maintenance",
    code: "MAINTENANCE",
    reasons: [
      { label: "Robot Issue", code: "ROBOT_ISSUE" },
      { label: "Sensor Issue", code: "SENSOR_ISSUE" },
      { label: "Vision System Issue", code: "VISION_ISSUE" },
      { label: "Conveyor Issue", code: "CONVEYOR_ISSUE" },
      { label: "Torque Gun Issue", code: "TORQUE_GUN_ISSUE" },
      { label: "Welder Issue", code: "WELDER_ISSUE" },
    ],
  },
  {
    group: "Meeting",
    code: "MEETING",
    reasons: [
      { label: "Meeting", code: "MEETING" },
      { label: "Training", code: "TRAINING" },
      { label: "Safety Issue", code: "SAFETY_ISSUE" },
      { label: "Break / Lunch", code: "BREAK_LUNCH" },
    ],
  },
  {
    group: "Quality",
    code: "QUALITY",
    reasons: [
      { label: "Quality Issue", code: "QUALITY_ISSUE" },
      { label: "Good Part Validation - No Pass", code: "GOOD_PART_VALIDATION_NO_PASS" },
      { label: "Part Quality Issue", code: "PART_QUALITY_ISSUE" },
      { label: "Waiting For Quality", code: "WAITING_FOR_QUALITY" },
    ],
  },
  {
    group: "Process",
    code: "PROCESS",
    reasons: [
      { label: "Running Slow - Sub Pack", code: "RUNNING_SLOW_SUB_PACK" },
      { label: "Waiting Components", code: "WAITING_COMPONENTS" },
      { label: "Waiting Parts WIP", code: "WAITING_PARTS_WIP" },
      { label: "Part Changeover", code: "PART_CHANGEOVER" },
      { label: "Parts Not In Schedule", code: "PARTS_NOT_IN_SCHEDULE" },
      { label: "Label Sys Problems", code: "LABEL_SYS_PROBLEMS" },
    ],
  },
];