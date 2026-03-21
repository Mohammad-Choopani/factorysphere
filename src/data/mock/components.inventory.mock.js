import { getPlant3Units } from "./plant3.units.mock";

const RISK_META = {
  safe: {
    key: "safe",
    label: "Safe",
    color: "#22c55e",
    text: "Healthy stock level",
  },
  watch: {
    key: "watch",
    label: "Watch",
    color: "#f59e0b",
    text: "Monitor closely",
  },
  critical: {
    key: "critical",
    label: "Critical",
    color: "#ef4444",
    text: "Urgent action required",
  },
  empty: {
    key: "empty",
    label: "Out",
    color: "#7f1d1d",
    text: "Stock unavailable",
  },
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function getRiskKey(currentStock, minStock) {
  const current = Number(currentStock || 0);
  const min = Math.max(1, Number(minStock || 0));

  if (current <= 0) return "empty";
  if (current <= min) return "critical";
  if (current <= min * 1.5) return "watch";
  return "safe";
}

function buildComponentItem({
  id,
  cellName,
  partName,
  partNumber,
  currentStock,
  minStock,
  maxStock,
  pendingQty = 0,
  reservedQty = 0,
  fulfilledToday = 0,
  requestedToday = 0,
  location = "WH-A1",
  uom = "pcs",
}) {
  const riskKey = getRiskKey(currentStock, minStock);
  const fillPct = maxStock > 0 ? clamp((currentStock / maxStock) * 100, 0, 100) : 0;

  return {
    id,
    cellName,
    partName,
    partNumber,
    currentStock,
    minStock,
    maxStock,
    pendingQty,
    reservedQty,
    fulfilledToday,
    requestedToday,
    availableQty: Math.max(0, currentStock - reservedQty),
    location,
    uom,
    fillPct: Number(fillPct.toFixed(1)),
    riskKey,
    risk: RISK_META[riskKey],
    updatedAt: "2026-03-18T08:00:00.000Z",
  };
}

const COMPONENTS_BY_CELL = {
  "C1YX Spoiler": [
    buildComponentItem({
      id: "C1YX-001",
      cellName: "C1YX Spoiler",
      partName: "YC RH EOL SEALS",
      partNumber: "380068B/26541021",
      currentStock: 148,
      minStock: 60,
      maxStock: 220,
      pendingQty: 8,
      reservedQty: 20,
      fulfilledToday: 16,
      requestedToday: 24,
      location: "A-01",
    }),
    buildComponentItem({
      id: "C1YX-002",
      cellName: "C1YX Spoiler",
      partName: "YC LH EOL SEALS",
      partNumber: "380069B/26541020",
      currentStock: 72,
      minStock: 55,
      maxStock: 220,
      pendingQty: 12,
      reservedQty: 18,
      fulfilledToday: 10,
      requestedToday: 22,
      location: "A-01",
    }),
    buildComponentItem({
      id: "C1YX-003",
      cellName: "C1YX Spoiler",
      partName: "CHMSL LIGHT",
      partNumber: "380070A",
      currentStock: 34,
      minStock: 30,
      maxStock: 90,
      pendingQty: 6,
      reservedQty: 12,
      fulfilledToday: 8,
      requestedToday: 14,
      location: "A-02",
    }),
    buildComponentItem({
      id: "C1YX-004",
      cellName: "C1YX Spoiler",
      partName: "LIGHT CONNECTOR WIRE HARNESS",
      partNumber: "380071A",
      currentStock: 21,
      minStock: 24,
      maxStock: 120,
      pendingQty: 14,
      reservedQty: 15,
      fulfilledToday: 5,
      requestedToday: 19,
      location: "A-03",
    }),
    buildComponentItem({
      id: "C1YX-005",
      cellName: "C1YX Spoiler",
      partName: "REAR CAMERA NOZZLE",
      partNumber: "380073B",
      currentStock: 0,
      minStock: 18,
      maxStock: 80,
      pendingQty: 20,
      reservedQty: 0,
      fulfilledToday: 0,
      requestedToday: 20,
      location: "A-04",
    }),
  ],
  "C1XX Spoiler": [
    buildComponentItem({
      id: "C1XX-001",
      cellName: "C1XX Spoiler",
      partName: "XC RH EOL SEALS",
      partNumber: "480068B/36541021",
      currentStock: 96,
      minStock: 48,
      maxStock: 180,
      pendingQty: 0,
      reservedQty: 10,
      fulfilledToday: 12,
      requestedToday: 12,
      location: "B-01",
    }),
    buildComponentItem({
      id: "C1XX-002",
      cellName: "C1XX Spoiler",
      partName: "XC LH EOL SEALS",
      partNumber: "480069B/36541020",
      currentStock: 49,
      minStock: 42,
      maxStock: 180,
      pendingQty: 4,
      reservedQty: 11,
      fulfilledToday: 9,
      requestedToday: 13,
      location: "B-01",
    }),
    buildComponentItem({
      id: "C1XX-003",
      cellName: "C1XX Spoiler",
      partName: "REAR CAMERA",
      partNumber: "480077A",
      currentStock: 16,
      minStock: 20,
      maxStock: 75,
      pendingQty: 10,
      reservedQty: 8,
      fulfilledToday: 4,
      requestedToday: 14,
      location: "B-02",
    }),
    buildComponentItem({
      id: "C1XX-004",
      cellName: "C1XX Spoiler",
      partName: "WIRE HARNESS",
      partNumber: "480071A",
      currentStock: 62,
      minStock: 28,
      maxStock: 120,
      pendingQty: 5,
      reservedQty: 12,
      fulfilledToday: 8,
      requestedToday: 13,
      location: "B-03",
    }),
  ],
  "DT-FRT": [
    buildComponentItem({
      id: "DTFRT-001",
      cellName: "DT-FRT",
      partName: "Front Bracket",
      partNumber: "DTF-110020",
      currentStock: 88,
      minStock: 30,
      maxStock: 140,
      pendingQty: 2,
      reservedQty: 16,
      fulfilledToday: 18,
      requestedToday: 20,
      location: "C-01",
    }),
    buildComponentItem({
      id: "DTFRT-002",
      cellName: "DT-FRT",
      partName: "Camera Locator",
      partNumber: "DTF-110021",
      currentStock: 14,
      minStock: 16,
      maxStock: 70,
      pendingQty: 12,
      reservedQty: 10,
      fulfilledToday: 6,
      requestedToday: 18,
      location: "C-02",
    }),
    buildComponentItem({
      id: "DTFRT-003",
      cellName: "DT-FRT",
      partName: "Mounting Clip",
      partNumber: "DTF-110022",
      currentStock: 51,
      minStock: 22,
      maxStock: 120,
      pendingQty: 0,
      reservedQty: 7,
      fulfilledToday: 10,
      requestedToday: 10,
      location: "C-03",
    }),
  ],
  Windshield: [
    buildComponentItem({
      id: "WS-001",
      cellName: "Windshield",
      partName: "Glass Locator Pin",
      partNumber: "WS-220100",
      currentStock: 120,
      minStock: 40,
      maxStock: 180,
      pendingQty: 0,
      reservedQty: 14,
      fulfilledToday: 20,
      requestedToday: 20,
      location: "D-01",
    }),
    buildComponentItem({
      id: "WS-002",
      cellName: "Windshield",
      partName: "Seal Strip",
      partNumber: "WS-220101",
      currentStock: 32,
      minStock: 26,
      maxStock: 95,
      pendingQty: 6,
      reservedQty: 9,
      fulfilledToday: 7,
      requestedToday: 13,
      location: "D-02",
    }),
    buildComponentItem({
      id: "WS-003",
      cellName: "Windshield",
      partName: "Adhesive Cartridge",
      partNumber: "WS-220102",
      currentStock: 9,
      minStock: 14,
      maxStock: 48,
      pendingQty: 15,
      reservedQty: 5,
      fulfilledToday: 2,
      requestedToday: 17,
      location: "D-03",
    }),
  ],
};

const COMPONENT_REQUESTS = [
  {
    id: "REQ-001",
    cellName: "C1YX Spoiler",
    subject: "Component Request",
    requestStatus: "requested",
    partName: "REAR CAMERA NOZZLE",
    partNumber: "380073B",
    quantityRequested: 20,
    requestedByName: "Operator",
    requestedAt: "2026-03-18T06:22:00.000Z",
    note: "Line waiting on replenish",
  },
  {
    id: "REQ-002",
    cellName: "C1XX Spoiler",
    subject: "Urgent Supply",
    requestStatus: "in_progress",
    partName: "REAR CAMERA",
    partNumber: "480077A",
    quantityRequested: 10,
    requestedByName: "Team Lead",
    requestedAt: "2026-03-18T07:05:00.000Z",
    note: "Critical shortage",
  },
  {
    id: "REQ-003",
    cellName: "Windshield",
    subject: "Mid Shift Refill",
    requestStatus: "fulfilled",
    partName: "Seal Strip",
    partNumber: "WS-220101",
    quantityRequested: 8,
    requestedByName: "Operator",
    requestedAt: "2026-03-18T05:45:00.000Z",
    fulfilledAt: "2026-03-18T06:05:00.000Z",
    note: "",
  },
];

function getAllComponentItems() {
  return Object.values(COMPONENTS_BY_CELL).flat();
}

function getComponentCells() {
  const all = getAllComponentItems();
  const units = getPlant3Units();

  return units.map((unit) => {
    const items = all.filter((item) => normalizeKey(item.cellName) === normalizeKey(unit.name));
    const currentStock = items.reduce((sum, item) => sum + Number(item.currentStock || 0), 0);
    const minStock = items.reduce((sum, item) => sum + Number(item.minStock || 0), 0);
    const pendingQty = items.reduce((sum, item) => sum + Number(item.pendingQty || 0), 0);
    const criticalCount = items.filter((item) => item.riskKey === "critical" || item.riskKey === "empty").length;
    const watchCount = items.filter((item) => item.riskKey === "watch").length;

    let riskKey = "safe";
    if (!items.length) riskKey = "safe";
    else if (items.some((item) => item.riskKey === "empty")) riskKey = "empty";
    else if (criticalCount > 0) riskKey = "critical";
    else if (watchCount > 0) riskKey = "watch";

    return {
      id: `comp-${unit.id}`,
      name: unit.name,
      x: unit.layout?.x || 0,
      y: unit.layout?.y || 0,
      w: unit.layout?.w || 2,
      h: unit.layout?.h || 2,
      itemCount: items.length,
      currentStock,
      minStock,
      pendingQty,
      criticalCount,
      watchCount,
      riskKey,
      risk: RISK_META[riskKey],
    };
  });
}

function getComponentItemsByCellName(cellName) {
  return COMPONENTS_BY_CELL[cellName] || [];
}

function getComponentRequests() {
  return COMPONENT_REQUESTS;
}

function getInventorySummary() {
  const all = getAllComponentItems();

  return {
    totalCells: getComponentCells().length,
    totalParts: all.length,
    safeCount: all.filter((item) => item.riskKey === "safe").length,
    watchCount: all.filter((item) => item.riskKey === "watch").length,
    criticalCount: all.filter((item) => item.riskKey === "critical").length,
    emptyCount: all.filter((item) => item.riskKey === "empty").length,
    pendingRequestCount: COMPONENT_REQUESTS.filter((item) =>
      ["requested", "acknowledged", "in_progress", "partially_fulfilled"].includes(item.requestStatus)
    ).length,
  };
}

export {
  RISK_META,
  normalizeKey,
  getRiskKey,
  getAllComponentItems,
  getComponentCells,
  getComponentItemsByCellName,
  getComponentRequests,
  getInventorySummary,
};