const SHIFT_KEYS = ["A", "B", "C"];

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

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function padNumber(n, len = 2) {
  return String(n).padStart(len, "0");
}

function getCurrentPlantShiftKey(date = new Date()) {
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  if (totalMinutes >= 22 * 60 || totalMinutes < 6 * 60) return "A";
  if (totalMinutes >= 6 * 60 && totalMinutes < 14 * 60) return "B";
  return "C";
}

function getShiftLabel(shiftKey) {
  if (shiftKey === "A") return "Shift 1 — Midnight";
  if (shiftKey === "B") return "Shift 2 — Morning";
  return "Shift 3 — Afternoon";
}

function getShiftKeyForMockDate(date) {
  return getCurrentPlantShiftKey(date);
}

function pickStatus(r) {
  const x = r();
  if (x < 0.72) return "RUNNING";
  if (x < 0.9) return "ATTN";
  return "DOWN";
}

function compactToken(v) {
  return normalizeName(v).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "CELL";
}

function groupFromStationName(name) {
  const n = normalizeName(name).toUpperCase();
  if (n.startsWith("DT ")) return "DT";
  if (n.startsWith("WS ")) return "WS";
  if (n.startsWith("BT1XX")) return "BT1XX";
  if (n.startsWith("C1YX")) return "C1YX";
  if (n.startsWith("CIUL")) return "CIUL";
  if (n.startsWith("GRILL")) return "GRILL";
  if (n.startsWith("TLX")) return "TLX";
  if (n.startsWith("MDX")) return "MDX";
  if (n.startsWith("ACCORD")) return "ACCORD";
  if (n.startsWith("WINDSHIELD")) return "WINDSHIELD";
  return "GENERAL";
}

function splitIntegerAcrossShifts(total, weights) {
  const safeTotal = Math.max(0, Math.floor(Number(total || 0)));
  const baseWeights = Array.isArray(weights) && weights.length === 3 ? weights : [1, 1, 1];
  const sum = baseWeights.reduce((acc, w) => acc + Number(w || 0), 0) || 1;

  const raw = baseWeights.map((w) => (safeTotal * Number(w || 0)) / sum);
  const base = raw.map((v) => Math.floor(v));
  let remainder = safeTotal - base.reduce((acc, v) => acc + v, 0);

  const ranked = raw
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac);

  let i = 0;
  while (remainder > 0 && ranked.length) {
    base[ranked[i % ranked.length].index] += 1;
    remainder -= 1;
    i += 1;
  }

  return { A: base[0] || 0, B: base[1] || 0, C: base[2] || 0 };
}

function buildShiftWeights(activeShift, r) {
  const w = {
    A: 0.24 + r() * 0.08,
    B: 0.24 + r() * 0.08,
    C: 0.24 + r() * 0.08,
  };
  w[activeShift] = 0.42 + r() * 0.18;
  return [w.A, w.B, w.C];
}

function makeInternalPartCode(cellName, r, seq = 1) {
  return `${compactToken(cellName)}${padNumber(seq, 2)}${padNumber(Math.floor(r() * 9000) + 1000, 4)}`.slice(0, 16);
}

function makeCustomerPartNumber(r) {
  return String(Math.floor(r() * 90000000) + 10000000);
}

function makeCustomerReference(cellName, r, seq = 1) {
  return `${compactToken(cellName).slice(0, 5)}-${padNumber(seq, 2)}-${padNumber(Math.floor(r() * 90) + 10, 2)}`;
}

function makeArNumber(r) {
  return `AR${padNumber(Math.floor(r() * 900000) + 100000, 6)}`;
}

function makePartName(cellName, r) {
  const grp = groupFromStationName(cellName);
  const suffixMap = {
    DT: ["FRT ASM", "RR ASM", "TRX ASM", "FRT W/CLIP"],
    WS: ["WINDSHIELD MOD", "QUARTER GLASS", "FRONT SET"],
    BT1XX: ["RH WF", "LH WF", "COVER", "RH ASSY"],
    C1YX: ["SPOILER", "DP", "RKR LH", "RKR RH", "BSM", "LDM"],
    CIUL: ["SPOILER", "DP", "WF", "SKID", "LOWER"],
    GRILL: ["REG", "PHEV", "UPPER", "LOWER"],
    TLX: ["BUMPER", "GARNISH", "OUTER"],
    MDX: ["SKID", "GARNISH", "LOWER"],
    ACCORD: ["FRONT PART", "LOWER PART", "ASSY"],
    WINDSHIELD: ["WINDSHIELD ASSY", "FRONT GLASS", "MODULE"],
    GENERAL: ["PART ASSY", "MODULE", "SUB ASSY"],
  };
  const variants = ["BAE-GE", "PTD-BK", "PRM-SL", "MAT-BK", "W/CAM", "W/O CAM"];
  const list = suffixMap[grp] || suffixMap.GENERAL;
  return `${grp}-${list[Math.floor(r() * list.length)]} ${variants[Math.floor(r() * variants.length)]}`;
}

function makeScheduledQty(r, seq) {
  const options = [24, 30, 40, 50, 60, 80, 100, 120, 150, 200];
  const base = options[Math.floor(r() * options.length)];
  return clamp(base + seq * (Math.floor(r() * 6) - 2), 20, 240);
}

function makeJobDefinition(cellName, baseSeed, seq = 1) {
  const r = seededRandom(hashStringToInt(`${baseSeed}::job::${seq}`));

  const scheduledQty = makeScheduledQty(r, seq);
  const goodQty = clamp(Math.floor(scheduledQty * (0.62 + r() * 0.33)), 0, scheduledQty);
  const failQty = clamp(Math.floor((scheduledQty - goodQty) * r() * 0.3), 0, scheduledQty);
  const suspectQty = clamp(Math.floor((scheduledQty - goodQty - failQty) * r() * 0.2), 0, scheduledQty);
  const producedQty = clamp(goodQty + failQty + suspectQty, 0, scheduledQty);
  const packedQty = clamp(goodQty - Math.floor(r() * 6), 0, goodQty);
  const remainingQty = clamp(scheduledQty - producedQty, 0, scheduledQty);
  const completionPct = scheduledQty > 0 ? Math.round((producedQty / scheduledQty) * 100) : 0;

  const packSize = clamp(Math.floor(r() * 18) + 6, 6, 24);
  const packedCount = clamp(packedQty % packSize, 0, packSize);
  const containerNo = Math.floor(packedQty / packSize) + 1;
  const containersCompleted = Math.floor(packedQty / packSize);

  return {
    jobId: `${slugifyId(cellName)}::JOB-${padNumber(seq, 2)}`,
    sequence: seq,
    internalPartCode: makeInternalPartCode(cellName, r, seq),
    partName: makePartName(cellName, r),
    customerPartNumber: makeCustomerPartNumber(r),
    customerReference: makeCustomerReference(cellName, r, seq),
    arNumber: makeArNumber(r),
    position: String((Math.floor(r() * 9) + 1) * 10),
    colour: String(Math.floor(r() * 9) + 1),
    fixtureId: `${compactToken(cellName).slice(0, 4)}-${padNumber(Math.floor(r() * 900) + 100, 3)}`,
    scheduledQty,
    producedQty,
    goodQty,
    failQty,
    suspectQty,
    packedQty,
    remainingQty,
    completionPct,
    status: completionPct >= 100 ? "COMPLETED" : completionPct > 0 ? "IN_PROGRESS" : "QUEUED",
    container: {
      containerNo,
      packedCount,
      packSize,
      containersCompleted,
    },
  };
}

function makeCompletedJobSnapshot(job) {
  return {
    ...job,
    status: "COMPLETED",
    producedQty: job.scheduledQty,
    goodQty: clamp(job.scheduledQty - job.failQty - job.suspectQty, 0, job.scheduledQty),
    remainingQty: 0,
    completionPct: 100,
    container: {
      ...job.container,
      packedCount: 0,
      containerNo: job.container.containersCompleted + 1,
    },
  };
}

function buildJobFlow(cellName) {
  const seedBase = `${normalizeName(cellName)}::job-flow`;
  const r = seededRandom(hashStringToInt(seedBase));

  const totalJobs = clamp(Math.floor(r() * 4) + 3, 3, 6);
  const jobs = Array.from({ length: totalJobs }, (_, i) => makeJobDefinition(cellName, seedBase, i + 1));
  const activeJobIndex = clamp(Math.floor(r() * totalJobs), 0, totalJobs - 1);

  const completedJobsToday = jobs.slice(0, activeJobIndex).map(makeCompletedJobSnapshot);

  const activeJobBase = jobs[activeJobIndex];
  const activeSeed = seededRandom(hashStringToInt(`${seedBase}::active::${activeJobIndex + 1}`));
  const activeProgressRatio = clamp(0.12 + activeSeed() * 0.78, 0.08, 0.95);
  const activeProducedQty = clamp(Math.floor(activeJobBase.scheduledQty * activeProgressRatio), 0, activeJobBase.scheduledQty);

  const activeFailQty = clamp(Math.floor(activeProducedQty * activeSeed() * 0.08), 0, activeProducedQty);
  const activeSuspectQty = clamp(Math.floor(activeProducedQty * activeSeed() * 0.05), 0, activeProducedQty);
  const activeGoodQty = clamp(activeProducedQty - activeFailQty - activeSuspectQty, 0, activeProducedQty);
  const activePackedQty = clamp(activeGoodQty - Math.floor(activeSeed() * 4), 0, activeGoodQty);
  const activeRemainingQty = clamp(activeJobBase.scheduledQty - activeProducedQty, 0, activeJobBase.scheduledQty);
  const activeCompletionPct =
    activeJobBase.scheduledQty > 0 ? Math.round((activeProducedQty / activeJobBase.scheduledQty) * 100) : 0;

  const packSize = activeJobBase.container.packSize;
  const packedCount = clamp(activePackedQty % packSize, 0, packSize);
  const containerNo = Math.floor(activePackedQty / packSize) + 1;
  const containersCompleted = Math.floor(activePackedQty / packSize);

  const activeJob = {
    ...activeJobBase,
    producedQty: activeProducedQty,
    goodQty: activeGoodQty,
    failQty: activeFailQty,
    suspectQty: activeSuspectQty,
    packedQty: activePackedQty,
    remainingQty: activeRemainingQty,
    completionPct: activeCompletionPct,
    status: activeCompletionPct >= 100 ? "COMPLETED" : "IN_PROGRESS",
    container: {
      containerNo,
      packedCount,
      packSize,
      containersCompleted,
    },
  };

  const scheduledJobs = jobs.map((job, idx) => {
    if (idx < activeJobIndex) return makeCompletedJobSnapshot(job);
    if (idx === activeJobIndex) return activeJob;
    return {
      ...job,
      producedQty: 0,
      goodQty: 0,
      failQty: 0,
      suspectQty: 0,
      packedQty: 0,
      remainingQty: job.scheduledQty,
      completionPct: 0,
      status: "QUEUED",
      container: {
        ...job.container,
        containerNo: 1,
        packedCount: 0,
        containersCompleted: 0,
      },
    };
  });

  return {
    activeJob,
    activeJobIndex,
    scheduledJobs,
    completedJobsToday,
  };
}

const DOWNTIME_CATEGORIES = [
  "MATERIAL",
  "MAINTENANCE",
  "QUALITY",
  "CHANGEOVER",
  "OPERATOR",
  "SAFETY",
  "MEETING",
  "BREAK",
];

const ASSET_TYPES = ["CAMERA", "LIGHT", "SCREW", "WELDER", "SENSOR", "ROBOT", "CONVEYOR"];

const DOWNTIME_REASONS = {
  MATERIAL: ["Waiting parts", "Shortage", "Wrong material", "Material handling"],
  MAINTENANCE: ["Welder issue", "Camera issue", "Light issue", "Sensor issue", "Robot fault", "Conveyor fault"],
  QUALITY: ["Quality hold", "Inspection required", "Suspect review", "Recheck"],
  CHANGEOVER: ["Tool change", "Part change", "Program change", "Setup verification"],
  OPERATOR: ["Operator unavailable", "Training", "Manual adjustment", "Housekeeping"],
  SAFETY: ["Safety check", "Lockout", "Incident review", "Area clear"],
  MEETING: ["Shift meeting", "Team lead meeting", "Communication stop", "Production review"],
  BREAK: ["Break", "Lunch", "Scheduled break", "Relief gap"],
};

function pickOne(arr, r) {
  return arr[Math.floor(r() * arr.length)];
}

function makeIsoMockTime(baseDate, minutesOffset) {
  const d = new Date(baseDate.getTime() + minutesOffset * 60000);
  return d.toISOString();
}

function buildCellStations(cellName, stationCount = 4) {
  const baseId = slugifyId(cellName);
  const presets = ["CAMERA", "LIGHT", "SCREW", "WELDER", "SENSOR", "ROBOT", "CONVEYOR"];

  return Array.from({ length: stationCount }, (_, i) => {
    const assetType = presets[i % presets.length];
    return {
      id: `${baseId}-${assetType.toLowerCase()}-${padNumber(i + 1, 2)}`,
      name: `${normalizeName(cellName)} ${assetType} ${padNumber(i + 1, 2)}`,
      assetType,
      stationType: assetType,
      kind: "station",
      area: groupFromStationName(cellName),
      line: "",
      meta: {},
    };
  });
}

function buildDowntimeEntries(cell, stations, activeShift) {
  const baseSeed = `${normalizeName(cell.id)}::downtime`;
  const r = seededRandom(hashStringToInt(baseSeed));
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const systemCount = clamp(Math.floor(r() * 4) + 2, 2, 5);
  const manualCount = clamp(Math.floor(r() * 2) + 1, 1, 2);

  const systemEntries = Array.from({ length: systemCount }, (_, idx) => {
    const station = stations[Math.floor(r() * stations.length)] || stations[0];
    const category = pickOne(DOWNTIME_CATEGORIES.filter((c) => c !== "BREAK"), r);
    const reason = category === "MAINTENANCE" ? `${station.assetType} issue` : pickOne(DOWNTIME_REASONS[category], r);
    const durationMin = clamp(Math.floor(r() * 18) + 2, 2, 24);
    const startOffset = clamp(Math.floor(r() * 900) + idx * 40, 20, 1100);
    const startedAt = makeIsoMockTime(midnight, startOffset);
    const endedAt = makeIsoMockTime(midnight, startOffset + durationMin);

    const startedAtDate = new Date(startedAt);
    const entryShiftKey = getShiftKeyForMockDate(startedAtDate);

    return {
      id: `${cell.id}::SYS-DT-${padNumber(idx + 1, 2)}`,
      cellId: cell.id,
      stationId: station.id,
      stationName: station.name,
      assetType: station.assetType,
      shiftKey: entryShiftKey,
      source: "system",
      entryMode: "auto",
      category,
      reason,
      customCategory: "",
      customReason: "",
      note: "",
      startedAt,
      endedAt,
      durationMin,
      affectsDowntime: true,
      isPlanned: false,
      enteredByRole: "system",
      enteredByName: "Auto Capture",
      approvalStatus: "approved",
    };
  });

  const manualEntries = Array.from({ length: manualCount }, (_, idx) => {
    const station = stations[Math.floor(r() * stations.length)] || stations[0];
    const category = pickOne(["MATERIAL", "QUALITY", "OPERATOR", "MEETING", "MAINTENANCE"], r);
    const reason = category === "MAINTENANCE" ? `${station.assetType} issue` : pickOne(DOWNTIME_REASONS[category], r);
    const durationMin = clamp(Math.floor(r() * 12) + 3, 3, 18);
    const startOffset = clamp(Math.floor(r() * 900) + idx * 55, 30, 1100);
    const startedAt = makeIsoMockTime(midnight, startOffset);
    const endedAt = makeIsoMockTime(midnight, startOffset + durationMin);

    const startedAtDate = new Date(startedAt);
    const entryShiftKey = getShiftKeyForMockDate(startedAtDate);

    return {
      id: `${cell.id}::MAN-DT-${padNumber(idx + 1, 2)}`,
      cellId: cell.id,
      stationId: station.id,
      stationName: station.name,
      assetType: station.assetType,
      shiftKey: entryShiftKey,
      source: "team_lead_manual",
      entryMode: "manual",
      category,
      reason,
      customCategory: "",
      customReason: "",
      note: "Operator maintenance request",
      startedAt,
      endedAt,
      durationMin,
      affectsDowntime: true,
      isPlanned: false,
      enteredByRole: "team_lead",
      enteredByName: "Team Lead",
      approvalStatus: "approved",
    };
  });

  const systemDowntimeMin = systemEntries.reduce((sum, item) => sum + Number(item.durationMin || 0), 0);
  const manualDowntimeMin = manualEntries.reduce((sum, item) => sum + Number(item.durationMin || 0), 0);
  const mergedDowntimeMin = systemDowntimeMin + manualDowntimeMin;

  const byCategory = {};
  [...systemEntries, ...manualEntries].forEach((item) => {
    byCategory[item.category] = (byCategory[item.category] || 0) + Number(item.durationMin || 0);
  });

  const categoryBreakdown = Object.entries(byCategory).map(([category, totalMin]) => ({ category, totalMin }));

  return {
    categoryOptions: [...DOWNTIME_CATEGORIES],
    reasonOptions: { ...DOWNTIME_REASONS },
    assetTypes: [...ASSET_TYPES],
    systemEntries,
    manualEntries,
    reconciliation: {
      cellId: cell.id,
      shiftKey: activeShift,
      systemDowntimeMin,
      manualDowntimeMin,
      mergedDowntimeMin,
      varianceMin: manualDowntimeMin,
      hasManualAdjustment: manualEntries.length > 0,
      reconciliationStatus: manualEntries.length > 0 ? "reviewed" : "system_only",
      categoryBreakdown,
      lastSystemEntry: systemEntries[systemEntries.length - 1] || null,
      lastManualEntry: manualEntries[manualEntries.length - 1] || null,
    },
  };
}

function makeMessages(cellName, runtime, r) {
  const shiftLabel = getShiftLabel(runtime.activeShift);
  const part = runtime.activeJob?.partName || "Part";
  const code = runtime.activeJob?.internalPartCode || "—";
  const remaining = runtime.activeJob?.remainingQty ?? "—";

  const base = [
    `${shiftLabel} active.`,
    `Current job loaded: ${part}.`,
    `Internal code: ${code}.`,
    `Remaining for active part: ${remaining}.`,
    "Operator panel ready.",
    "Lineup sequence available.",
  ];

  const running = [
    "Cycle running normally.",
    "Packed count updated successfully.",
    "Order tracking synchronized.",
    "Awaiting next scan confirmation.",
  ];

  const attention = [
    "Attention: verify fixture alignment.",
    "Attention: check label position.",
    "Attention: part confirmation required.",
    "Attention: review suspect count.",
  ];

  const down = [
    "DOWN: reset acknowledgement required.",
    "DOWN: machine stop active.",
    "DOWN: maintenance confirmation required.",
    "DOWN: station waiting for operator.",
  ];

  const msgs = [base[Math.floor(r() * base.length)]];
  if (runtime.status === "RUNNING") msgs.push(running[Math.floor(r() * running.length)]);
  else if (runtime.status === "ATTN") msgs.push(attention[Math.floor(r() * attention.length)]);
  else msgs.push(down[Math.floor(r() * down.length)]);
  return msgs.slice(0, 2);
}

function makeShiftTotals(activeShift, activeJob, completedJobsToday, r) {
  const totalGood =
    completedJobsToday.reduce((sum, job) => sum + Number(job.goodQty || 0), 0) +
    Number(activeJob?.goodQty || 0);

  const totalFail =
    completedJobsToday.reduce((sum, job) => sum + Number(job.failQty || 0), 0) +
    Number(activeJob?.failQty || 0);

  const totalSuspect =
    completedJobsToday.reduce((sum, job) => sum + Number(job.suspectQty || 0), 0) +
    Number(activeJob?.suspectQty || 0);

  const goodSplit = splitIntegerAcrossShifts(totalGood, buildShiftWeights(activeShift, r));
  const failSplit = splitIntegerAcrossShifts(totalFail, buildShiftWeights(activeShift, r));
  const suspectSplit = splitIntegerAcrossShifts(totalSuspect, buildShiftWeights(activeShift, r));

  return {
    A: {
      ok: goodSplit.A,
      ng: failSplit.A,
      suspect: suspectSplit.A,
      downtimeMin: clamp(Math.floor(r() * (activeShift === "A" ? 45 : 95)), 0, 240),
    },
    B: {
      ok: goodSplit.B,
      ng: failSplit.B,
      suspect: suspectSplit.B,
      downtimeMin: clamp(Math.floor(r() * (activeShift === "B" ? 45 : 95)), 0, 240),
    },
    C: {
      ok: goodSplit.C,
      ng: failSplit.C,
      suspect: suspectSplit.C,
      downtimeMin: clamp(Math.floor(r() * (activeShift === "C" ? 45 : 95)), 0, 240),
    },
  };
}

function makeProductionHistory(activeJob, completedJobsToday, activeShift, r) {
  const allJobsToday = [...completedJobsToday, activeJob].filter(Boolean);

  const totalProduced = allJobsToday.reduce((sum, job) => sum + Number(job.producedQty || 0), 0);
  const totalGood = allJobsToday.reduce((sum, job) => sum + Number(job.goodQty || 0), 0);
  const totalFail = allJobsToday.reduce((sum, job) => sum + Number(job.failQty || 0), 0);
  const totalSuspect = allJobsToday.reduce((sum, job) => sum + Number(job.suspectQty || 0), 0);
  const totalPacked = allJobsToday.reduce((sum, job) => sum + Number(job.packedQty || 0), 0);

  const partsDaily = allJobsToday.map((job) => ({
    internalPartCode: job.internalPartCode,
    partName: job.partName,
    customerPartNumber: job.customerPartNumber,
    producedQty: job.producedQty,
    goodQty: job.goodQty,
    failQty: job.failQty,
    suspectQty: job.suspectQty,
    packedQty: job.packedQty,
    sharePct: totalProduced > 0 ? Math.round((Number(job.producedQty || 0) / totalProduced) * 100) : 0,
  }));

  const scaleUp = (parts, factor) =>
    parts.map((part) => ({
      ...part,
      producedQty: part.producedQty * factor,
      goodQty: part.goodQty * factor,
      failQty: part.failQty * factor,
      suspectQty: part.suspectQty * factor,
      packedQty: part.packedQty * factor,
    }));

  const withShare = (parts) => {
    const total = parts.reduce((sum, part) => sum + Number(part.producedQty || 0), 0);
    return parts.map((part) => ({
      ...part,
      sharePct: total > 0 ? Math.round((part.producedQty / total) * 100) : 0,
    }));
  };

  const weeklyParts = withShare(scaleUp(partsDaily, 4 + Math.floor(r() * 3)));
  const monthlyParts = withShare(scaleUp(weeklyParts, 4));
  const yearlyParts = withShare(scaleUp(monthlyParts, 12));

  const sumTotals = (parts) => ({
    produced: parts.reduce((sum, part) => sum + Number(part.producedQty || 0), 0),
    good: parts.reduce((sum, part) => sum + Number(part.goodQty || 0), 0),
    fail: parts.reduce((sum, part) => sum + Number(part.failQty || 0), 0),
    suspect: parts.reduce((sum, part) => sum + Number(part.suspectQty || 0), 0),
    packed: parts.reduce((sum, part) => sum + Number(part.packedQty || 0), 0),
  });

  const today = new Date();
  const dateKey = today.toISOString().slice(0, 10);
  const monthKey = dateKey.slice(0, 7);
  const yearKey = dateKey.slice(0, 4);

  return {
    liveWindow: {
      scope: "24h-runtime-buffer",
      activeShift,
      shouldResetDaily: true,
      lastResetAt: `${dateKey}T00:00:00`,
    },
    daily: {
      dateKey,
      totals: { produced: totalProduced, good: totalGood, fail: totalFail, suspect: totalSuspect, packed: totalPacked },
      parts: partsDaily,
    },
    weekly: {
      weekKey: `${yearKey}-W${padNumber(Math.floor((today.getDate() - 1) / 7) + 1, 2)}`,
      totals: sumTotals(weeklyParts),
      parts: weeklyParts,
    },
    monthly: {
      monthKey,
      totals: sumTotals(monthlyParts),
      parts: monthlyParts,
    },
    yearly: {
      yearKey,
      totals: sumTotals(yearlyParts),
      parts: yearlyParts,
    },
  };
}

function makeCellRuntime(cell, stations) {
  const seedBase = `${normalizeName(cell.id)}::runtime`;
  const r = seededRandom(hashStringToInt(seedBase));

  const status = pickStatus(r);
  const activeShift = getCurrentPlantShiftKey();

  const jobFlow = buildJobFlow(cell.name);
  const activeJob = jobFlow.activeJob;
  const container = activeJob?.container || {
    containerNo: 1,
    packedCount: 0,
    packSize: 12,
    containersCompleted: 0,
  };

  const shiftTotals = makeShiftTotals(activeShift, activeJob, jobFlow.completedJobsToday, r);
  const downtime = buildDowntimeEntries(cell, stations, activeShift);
  const productionHistory = makeProductionHistory(activeJob, jobFlow.completedJobsToday, activeShift, r);
  const messages = makeMessages(
    cell.name,
    {
      status,
      activeShift,
      activeJob,
    },
    r
  );

  return {
    stationId: cell.id,
    stationName: cell.name,
    status,
    activeShift,
    currentJob: activeJob,
    activeJob,
    activeJobIndex: jobFlow.activeJobIndex,
    scheduledJobs: jobFlow.scheduledJobs,
    completedJobsToday: jobFlow.completedJobsToday,
    container,
    counters: {
      ok: activeJob?.goodQty ?? 0,
      ng: activeJob?.failQty ?? 0,
      suspect: activeJob?.suspectQty ?? 0,
      containers: container?.containersCompleted ?? 0,
      pack: container?.packSize ?? 0,
    },
    messages,
    shiftTotals,
    downtime,
    productionHistory,
    updatedAt: "mock-static",
  };
}

/**
 * POD-based Source of Truth
 */
const PODS = [];

function buildIndexes(pods) {
  const podByKey = new Map();
  const stationById = new Map();
  const stationToPodKey = new Map();

  for (const pod of pods) {
    const podKey = normalizeName(pod?.podKey);
    const podName = normalizeName(pod?.podName || podKey);
    if (!podKey) continue;

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

  return { podByKey, stationById, stationToPodKey };
}

const INDEX = buildIndexes(PODS);

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

export function getCurrentShiftKey() {
  return getCurrentPlantShiftKey();
}

export function getCurrentShiftLabel() {
  return getShiftLabel(getCurrentPlantShiftKey());
}

export function getStationRuntime(stationId) {
  const station = findStationById(stationId);
  if (!station) return null;
  const cell = { id: station.id, name: station.name };
  return makeCellRuntime(cell, [station]);
}

export function getStationRuntimeMap() {
  const out = {};
  getAllStations().forEach((station) => {
    out[station.id] = makeCellRuntime({ id: station.id, name: station.name }, [station]);
  });
  return out;
}

export function mockKpisForStation(stationId, shiftKey) {
  const st = findStationById(stationId);
  if (!st) return null;

  const runtime = makeCellRuntime({ id: st.id, name: st.name }, [st]);
  const safeShift = SHIFT_KEYS.includes(shiftKey) ? shiftKey : runtime.activeShift;
  const totals = runtime.shiftTotals?.[safeShift] || {};

  return {
    stationId: normalizeName(stationId),
    status: runtime.status,
    partModel: runtime.activeJob?.partName || runtime.currentJob?.partName || "—",
    counters: runtime.counters,
    messages: runtime.messages,
    shiftTotals: runtime.shiftTotals,
    selectedShift: safeShift,
    selectedShiftTotals: totals,
    activeJob: runtime.activeJob,
    scheduledJobs: runtime.scheduledJobs,
    completedJobsToday: runtime.completedJobsToday,
    downtime: runtime.downtime,
  };
}

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

function inferStationCount(cellName) {
  const name = normalizeName(cellName).toUpperCase();
  if (name.startsWith("C1YX")) return 7;
  if (name.startsWith("CIUL")) return 5;
  if (name.startsWith("DT ")) return 4;
  if (name.startsWith("WS ")) return 4;
  if (name.startsWith("BT1XX")) return 4;
  if (name.startsWith("GRILL")) return 4;
  if (name.startsWith("TLX")) return 4;
  if (name.startsWith("MDX")) return 4;
  return 3;
}

function makePodUnitObject(pod) {
  const nm = normalizeName(pod?.podName || pod?.podKey);
  const id = slugifyId(pod?.podKey || nm);

  const stations = (pod?.stations || [])
    .map((s) => {
      const sid = normalizeName(s?.id) || slugifyId(s?.name);
      const station = INDEX.stationById.get(sid) || null;
      if (!station) return null;
      return station;
    })
    .filter(Boolean);

  const runtime = makeCellRuntime({ id, name: nm }, stations.length ? stations : buildCellStations(nm, inferStationCount(nm)));

  return {
    id,
    name: nm,
    group: "POD",
    stations: stations.length ? stations : buildCellStations(nm, inferStationCount(nm)),
    status: runtime.status,
    runtime,
    mock: {
      partModel: runtime.activeJob?.partName || "—",
      counters: runtime.counters,
      messages: runtime.messages,
      currentJob: runtime.currentJob,
      activeJob: runtime.activeJob,
      scheduledJobs: runtime.scheduledJobs,
      completedJobsToday: runtime.completedJobsToday,
      container: runtime.container,
      activeShift: runtime.activeShift,
      productionHistory: runtime.productionHistory,
      downtime: runtime.downtime,
    },
    shiftTotals: runtime.shiftTotals,
  };
}

function buildFallbackUnitFromName(name) {
  const nm = normalizeName(name);
  const id = slugifyId(nm);
  const stations = buildCellStations(nm, inferStationCount(nm));
  const runtime = makeCellRuntime({ id, name: nm }, stations);

  return {
    id,
    name: nm,
    group: groupFromStationName(nm),
    stations,
    status: runtime.status,
    runtime,
    mock: {
      partModel: runtime.activeJob?.partName || nm,
      counters: runtime.counters,
      messages: runtime.messages,
      currentJob: runtime.currentJob,
      activeJob: runtime.activeJob,
      scheduledJobs: runtime.scheduledJobs,
      completedJobsToday: runtime.completedJobsToday,
      container: runtime.container,
      activeShift: runtime.activeShift,
      productionHistory: runtime.productionHistory,
      downtime: runtime.downtime,
    },
    shiftTotals: runtime.shiftTotals,
  };
}

export function getPlant3Units() {
  const pods = Array.from(INDEX.podByKey.values());

  if (!pods.length) {
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

    const base = fallbackUnitNames.map((name) => buildFallbackUnitFromName(name));
    return computeGridLayout(base);
  }

  const podUnits = pods.map(makePodUnitObject);
  return computeGridLayout(podUnits);
}