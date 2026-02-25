// src/data/mock/plant3.units.mock.js
// Phase A Hardening: POD-based registry + backward-compatible units API.
// Single Source of Truth: PODs -> Stations
// Compatibility: getPlant3Units() still exists for current UI pages.

const SHIFT_KEYS = ["A", "B", "C"];

/**
 * Deterministic pseudo-random so mock values stay stable across reloads.
 */
function seededRandom(seed) {
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
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function normalizeName(name) {
  return String(name || "").trim().replace(/\s+/g, " ");
}

function slugifyId(name) {
  return normalizeName(name).toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function pickStatus(r) {
  const x = r();
  if (x < 0.72) return "RUNNING";
  if (x < 0.9) return "ATTN";
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

function groupFromStationName(name) {
  const n = normalizeName(name).toUpperCase();
  if (n.startsWith("DT ")) return "DT";
  if (n.startsWith("WS ")) return "WS";
  if (n.startsWith("BT1XX")) return "BT1XX";
  if (n.startsWith("C1YX")) return "C1YX";
  if (n.startsWith("CIUL")) return "CIUL";
  if (n.startsWith("GRILL")) return "GRILL";
  return "GENERAL";
}

/**
 * -----------------------------
 * POD-based Source of Truth
 * -----------------------------
 * IMPORTANT:
 * Replace PODS with your real list from the screenshot.
 *
 * Each station must have unique `id` across ALL pods.
 * If you don't have an id, you can use the station name and we will slugify it,
 * but it is strongly recommended to provide a stable id.
 *
 * Example station:
 * { id: "DT-FRT-01", name: "DT FRT 01", kind: "station", area: "DT", line: "FRT" }
 */
const PODS = [
  // ====== PASTE YOUR REAL POD LIST HERE ======
  // {
  //   podKey: "POD-01",
  //   podName: "POD 01",
  //   stations: [
  //     { id: "DT-FRT-01", name: "DT FRT 01", kind: "station", area: "DT", line: "FRT" },
  //     { id: "DT-FRT-02", name: "DT FRT 02", kind: "station", area: "DT", line: "FRT" },
  //   ],
  // },
];

/**
 * Build indexes + validate uniqueness (to prevent accidental deletions/duplicates).
 */
function buildIndexes(pods) {
  const podByKey = new Map();
  const stationById = new Map();
  const stationToPodKey = new Map();

  const seenPodKeys = new Set();
  const seenStationIds = new Set();

  for (const pod of pods) {
    const podKey = normalizeName(pod?.podKey);
    const podName = normalizeName(pod?.podName || podKey);

    if (!podKey) continue;

    if (seenPodKeys.has(podKey)) {
      // eslint-disable-next-line no-console
      console.warn(`[Plant3 Registry] Duplicate podKey detected: "${podKey}"`);
    }
    seenPodKeys.add(podKey);

    const normalizedPod = {
      podKey,
      podName,
      stations: Array.isArray(pod?.stations) ? pod.stations : [],
    };

    podByKey.set(podKey, normalizedPod);

    for (const rawStation of normalizedPod.stations) {
      const stName = normalizeName(rawStation?.name || rawStation?.id);
      const stId = normalizeName(rawStation?.id) || slugifyId(stName);
      if (!stId) continue;

      if (seenStationIds.has(stId)) {
        // eslint-disable-next-line no-console
        console.warn(`[Plant3 Registry] Duplicate station id detected: "${stId}"`);
      }
      seenStationIds.add(stId);

      const station = {
        id: stId,
        name: stName || stId,
        kind: rawStation?.kind || "station",
        area: rawStation?.area || groupFromStationName(stName || stId),
        line: rawStation?.line || "",
        podKey,
        podName,
        meta: rawStation?.meta || {},
      };

      stationById.set(stId, station);
      stationToPodKey.set(stId, podKey);
    }
  }

  // Guardrails
  if (pods.length > 0 && stationById.size === 0) {
    // eslint-disable-next-line no-console
    console.warn(
      "[Plant3 Registry] POD list is present but no stations were indexed. Did you paste stations correctly?"
    );
  }

  return { podByKey, stationById, stationToPodKey };
}

const INDEX = buildIndexes(PODS);

/**
 * -----------------------------
 * Public POD API (NEW)
 * -----------------------------
 */
export function getPlant3Pods() {
  return Array.from(INDEX.podByKey.values()).map((p) => ({
    podKey: p.podKey,
    podName: p.podName,
    stationCount: p.stations.length,
  }));
}

export function getPodStations(podKey) {
  const pod = INDEX.podByKey.get(normalizeName(podKey));
  if (!pod) return [];
  return pod.stations
    .map((s) => {
      const sid = normalizeName(s?.id) || slugifyId(s?.name);
      return INDEX.stationById.get(sid) || null;
    })
    .filter(Boolean);
}

export function getAllStations() {
  return Array.from(INDEX.stationById.values());
}

export function findStationById(stationId) {
  return INDEX.stationById.get(normalizeName(stationId)) || null;
}

export function getPodKeyForStation(stationId) {
  return INDEX.stationToPodKey.get(normalizeName(stationId)) || null;
}

export function getShiftKeys() {
  return [...SHIFT_KEYS];
}

/**
 * Deterministic mock KPI for a station (stable by stationId + shiftKey).
 */
export function mockKpisForStation(stationId, shiftKey) {
  const st = findStationById(stationId);
  const safeShift = SHIFT_KEYS.includes(shiftKey) ? shiftKey : "A";

  const seedBase = hashStringToInt(`${normalizeName(stationId)}::${safeShift}`);
  const r = seededRandom(seedBase);

  const status = pickStatus(r);
  const partModel = `${groupFromStationName(st?.name || stationId)}-${String(
    Math.floor(r() * 900) + 100
  )}`;
  const counters = makeCounters(r);
  const messages = makeMessages(status, r);
  const shiftTotals = makeShiftTotals(r);

  return {
    stationId: normalizeName(stationId),
    status,
    partModel,
    counters,
    messages,
    shiftTotals,
  };
}

/**
 * -----------------------------
 * Backward Compatibility (EXISTING UI)
 * -----------------------------
 * Some pages might still expect "units" (WINDSHIELD/DT FRT etc).
 * We keep getPlant3Units() but now it builds a "unit-like" view from pods.
 *
 * - Each pod becomes a "unit tile" (stable)
 * - Stations are attached under unit.stations (so you can render them later)
 */
function computeGridLayout(items) {
  const cols = 8;
  const cellW = 1;
  const cellH = 1;

  return items.map((u, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
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

function makePodUnitObject(pod) {
  const nm = normalizeName(pod?.podName || pod?.podKey);
  const id = slugifyId(pod?.podKey || nm);

  // stable seed per pod
  const r = seededRandom(hashStringToInt(nm));
  const status = pickStatus(r);
  const counters = makeCounters(r);
  const messages = makeMessages(status, r);
  const shiftTotals = makeShiftTotals(r);

  const stations = (pod?.stations || [])
    .map((s) => {
      const sid = normalizeName(s?.id) || slugifyId(s?.name);
      return INDEX.stationById.get(sid) || null;
    })
    .filter(Boolean);

  return {
    id,
    name: nm,
    group: "POD",
    // now stations are real (POD-based). previously placeholder.
    stations,
    status,
    mock: {
      partModel: `POD-${String(Math.floor(r() * 900) + 100)}`,
      counters,
      messages,
    },
    shiftTotals,
  };
}

export function getPlant3Units() {
  const pods = Array.from(INDEX.podByKey.values());

  // If user hasn't pasted POD list yet, keep the old experience (safe fallback).
  if (!pods.length) {
    // Old fallback (units list) — minimal, so UI doesn't crash.
    const fallbackUnitNames = [
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

    const base = fallbackUnitNames.map((name) => {
      const nm = normalizeName(name);
      const r = seededRandom(hashStringToInt(nm));
      const status = pickStatus(r);
      const counters = makeCounters(r);
      const messages = makeMessages(status, r);
      const shiftTotals = makeShiftTotals(r);

      return {
        id: slugifyId(nm),
        name: nm,
        group: groupFromStationName(nm),
        stations: [],
        status,
        mock: {
          partModel: `${groupFromStationName(nm)}-${String(Math.floor(r() * 900) + 100)}`,
          counters,
          messages,
        },
        shiftTotals,
      };
    });

    return computeGridLayout(base);
  }

  const podUnits = pods.map(makePodUnitObject);
  return computeGridLayout(podUnits);
}