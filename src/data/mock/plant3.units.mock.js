// src/data/mock/plant3.units.mock.js
// Single source of truth for Plant 3 units (UI prototype + mock data)

const SHIFT_KEYS = ["A", "B", "C"];

function seededRandom(seed) {
  // Deterministic pseudo-random so mock values stay stable across reloads
  let t = seed + 0x6d2b79f5;
  return function () {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStringToInt(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickStatus(r) {
  const x = r();
  if (x < 0.72) return "RUNNING";
  if (x < 0.90) return "ATTN";
  return "DOWN";
}

function makeCounters(r) {
  const ok = Math.floor(r() * 180) + 20;
  const ng = Math.floor(r() * 14);
  const suspect = Math.floor(r() * 9);
  const containers = Math.floor(r() * 7) + 1;
  const pack = Math.floor(r() * 24) + 1;
  return { ok, ng, suspect, containers, pack };
}

function makeMessages(status, r) {
  const base = [
    "System nominal.",
    "Safety interlocks OK.",
    "Network heartbeat stable.",
    "Operator panel ready.",
    "Recipe loaded.",
  ];
  const warn = [
    "Attention: check fixture alignment.",
    "Reminder: verify label position.",
    "Sensor threshold near limit.",
    "Material low warning.",
  ];
  const down = [
    "DOWN: awaiting reset acknowledgement.",
    "DOWN: fault active — verify station.",
    "DOWN: maintenance required.",
  ];

  const msgs = [];
  msgs.push(base[Math.floor(r() * base.length)]);
  if (status === "ATTN") msgs.push(warn[Math.floor(r() * warn.length)]);
  if (status === "DOWN") msgs.push(down[Math.floor(r() * down.length)]);
  return msgs.slice(0, 2);
}

function makeShiftTotals(r) {
  const totals = {};
  SHIFT_KEYS.forEach((k) => {
    const ok = Math.floor(r() * 900) + 50;
    const ng = Math.floor(r() * 50);
    const suspect = Math.floor(r() * 35);
    const downtimeMin = Math.floor(r() * 120);
    totals[k] = { ok, ng, suspect, downtimeMin };
  });
  return totals;
}

function normalizeUnitName(name) {
  return name.trim().replace(/\s+/g, " ");
}

const PLANT3_UNIT_NAMES = [
  "WINDSHIELD",
  "DT FRT",
  "DT RR",
  "DT TRX",
  "CIUL SPOILER",
  "CIUL DP",
  "CIUL WF",
  "CIVIC LPG",
  "COWL",
  "BT1XX RH WF",
  "BT1XX 2 RH",
  "BT1XX 2 LH",
  "BT1XX COVER",
  "C1YX DP",
  "C1YX SPOILER",
  "C1YX RKR LH",
  "C1YX RH RKRS",
  "C1YX MIC",
  "C1YX PAINTED",
  "C1YX PTD WOM",
  "C1YX BSM",
  "C1YX LDM",
  "A2LL RKRS",
  "END CAPS 1",
  "END CAPS 2",
  "END CAP LH",
  "WS FRT",
  "WS QUARTERS",
  "WL75",
  "ACCORD",
  "CANARD",
  "ABRACKETS",
  "GRILL PHEV",
  "GRILL REG",
  "TLX BUMPER",
  "HEAD LAMP",
  "EMBLEM",
  "MDX SKID G",
  "CIUG",
  "FLOADER",
  "23 SPOILER 1",
];

function computeGridLayout(items) {
  // Simple deterministic CAD-like layout: grid cells
  // You can replace x/y later with real coordinates without touching DevicesPage.
  const cols = 8; // plan feel
  const cellW = 1;
  const cellH = 1;

  return items.map((u, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);

    // Add light "aisle" gaps every 2 rows for a plant-floor feel
    const aisleGap = Math.floor(row / 2) * 0.25;

    return {
      ...u,
      layout: {
        x: col * (cellW + 0.25),
        y: row * (cellH + 0.25) + aisleGap,
        w: cellW,
        h: cellH,
      },
    };
  });
}

function groupFromName(name) {
  const n = name.toUpperCase();
  if (n.startsWith("DT ")) return "DT";
  if (n.startsWith("WS ")) return "WS";
  if (n.startsWith("BT1XX")) return "BT1XX";
  if (n.startsWith("C1YX")) return "C1YX";
  if (n.startsWith("CIUL")) return "CIUL";
  if (n.startsWith("GRILL")) return "GRILL";
  return "GENERAL";
}

function makeUnitObject(name) {
  const nm = normalizeUnitName(name);
  const seed = hashStringToInt(nm);
  const r = seededRandom(seed);

  const status = pickStatus(r);
  const partModel = `${groupFromName(nm)}-${String(Math.floor(r() * 900) + 100)}`;
  const counters = makeCounters(r);
  const messages = makeMessages(status, r);
  const shiftTotals = makeShiftTotals(r);

  return {
    id: nm.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: nm,
    group: groupFromName(nm),
    stations: [], // placeholder only (out-of-scope)
    status,
    mock: {
      partModel,
      counters,
      messages,
    },
    shiftTotals,
  };
}

export function getPlant3Units() {
  const base = PLANT3_UNIT_NAMES.map(makeUnitObject);
  return computeGridLayout(base);
}
