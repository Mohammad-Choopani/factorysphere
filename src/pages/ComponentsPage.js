import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Billboard, Text } from "@react-three/drei";
import { useMediaQuery } from "@mui/material";
import {
  RISK_META,
  getComponentCells,
  getComponentItemsByCellName,
  getComponentRequests,
  getInventorySummary,
} from "../data/mock/components.inventory.mock";

const LAYOUT_SPREAD = 1.34;

const PAGE = {
  padding: 16,
  gap: 12,
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
  info: "#38bdf8",
  purple: "#a855f7",
};

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function formatNumber(n) {
  const value = Number(n || 0);
  return Number.isFinite(value) ? value.toLocaleString() : "0";
}

function formatPercent(n) {
  const value = Number(n || 0);
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

function riskToneFromKey(key) {
  if (key === "safe") return "success";
  if (key === "watch") return "warn";
  if (key === "critical") return "danger";
  if (key === "empty") return "danger";
  return "default";
}

function riskColorFromKey(key) {
  return RISK_META[key]?.color || PAGE.info;
}

function formatTimeStamp(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function Panel({ title, children, right }) {
  return (
    <div
      style={{
        minWidth: 0,
        width: "100%",
        border: `1px solid ${PAGE.border}`,
        background: PAGE.panel,
        borderRadius: 18,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          borderBottom: `1px solid ${PAGE.border}`,
          background: "rgba(255,255,255,0.02)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ color: PAGE.text, fontWeight: 900, minWidth: 0, overflowWrap: "anywhere" }}>{title}</div>
        <div style={{ minWidth: 0, maxWidth: "100%" }}>{right}</div>
      </div>
      <div style={{ padding: 14, minWidth: 0 }}>{children}</div>
    </div>
  );
}

function KpiCard({ label, value, accent = false, tone = "default" }) {
  const toneMap = {
    default: {
      border: accent ? "1px solid rgba(56,189,248,0.32)" : `1px solid ${PAGE.border}`,
      bg: accent ? "rgba(56,189,248,0.08)" : "rgba(255,255,255,0.03)",
    },
    success: {
      border: "1px solid rgba(34,197,94,0.28)",
      bg: "rgba(34,197,94,0.08)",
    },
    warn: {
      border: "1px solid rgba(245,158,11,0.28)",
      bg: "rgba(245,158,11,0.08)",
    },
    danger: {
      border: "1px solid rgba(239,68,68,0.28)",
      bg: "rgba(239,68,68,0.08)",
    },
    purple: {
      border: "1px solid rgba(168,85,247,0.28)",
      bg: "rgba(168,85,247,0.08)",
    },
    info: {
      border: "1px solid rgba(56,189,248,0.28)",
      bg: "rgba(56,189,248,0.08)",
    },
  };

  const skin = toneMap[tone] || toneMap.default;

  return (
    <div
      style={{
        minWidth: 0,
        border: skin.border,
        background: skin.bg,
        borderRadius: 16,
        padding: "12px 14px",
      }}
    >
      <div style={{ color: PAGE.subtext, fontSize: 12, marginBottom: 8 }}>{label}</div>
      <div
        style={{
          color: PAGE.text,
          fontWeight: 900,
          fontSize: 18,
          lineHeight: 1.3,
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function InfoLine({ label, value }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(100px, 140px) minmax(0, 1fr)",
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
          minWidth: 0,
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function MiniBar({ value, color = "linear-gradient(90deg, rgba(56,189,248,0.92), rgba(34,197,94,0.9))" }) {
  return (
    <div
      style={{
        height: 10,
        borderRadius: 999,
        overflow: "hidden",
        background: "rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          width: `${clamp(Number(value || 0), 0, 100)}%`,
          height: "100%",
          background: color,
        }}
      />
    </div>
  );
}

function SourceBadge({ label, value, tone = "default" }) {
  const map = {
    default: {
      bg: "rgba(255,255,255,0.05)",
      bd: PAGE.border,
    },
    info: {
      bg: "rgba(56,189,248,0.12)",
      bd: "rgba(56,189,248,0.28)",
    },
    purple: {
      bg: "rgba(168,85,247,0.12)",
      bd: "rgba(168,85,247,0.28)",
    },
    warn: {
      bg: "rgba(245,158,11,0.12)",
      bd: "rgba(245,158,11,0.28)",
    },
    success: {
      bg: "rgba(34,197,94,0.12)",
      bd: "rgba(34,197,94,0.28)",
    },
    danger: {
      bg: "rgba(239,68,68,0.12)",
      bd: "rgba(239,68,68,0.28)",
    },
  };
  const skin = map[tone] || map.default;

  return (
    <div
      style={{
        border: `1px solid ${skin.bd}`,
        background: skin.bg,
        borderRadius: 999,
        padding: "8px 12px",
        color: PAGE.text,
        fontWeight: 800,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {label}: {value}
    </div>
  );
}

function SegmentedScroll({ value, onChange }) {
  const itemStyle = (active) => ({
    height: 40,
    padding: "0 12px",
    borderRadius: 12,
    border: `1px solid ${active ? "rgba(56,189,248,0.35)" : PAGE.border}`,
    background: active ? "rgba(56,189,248,0.14)" : "rgba(255,255,255,0.04)",
    color: PAGE.text,
    fontWeight: 900,
    cursor: "pointer",
    flex: 1,
    minWidth: 0,
  });

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: 10,
        borderRadius: 16,
        border: `1px solid ${PAGE.border}`,
        background: "rgba(255,255,255,0.03)",
        minWidth: 0,
      }}
    >
      <button style={itemStyle(value === "cad")} onClick={() => onChange("cad")}>
        CAD View
      </button>
      <button style={itemStyle(value === "details")} onClick={() => onChange("details")}>
        Details
      </button>
    </div>
  );
}

function LabelTag3D({ text, dotColor, active, unitSize, zoomDist }) {
  const groupRef = useRef(null);

  const name = String(text || "CELL");
  const mode = active ? "full" : "tiny";
  const shown = mode === "tiny" ? name.slice(0, 12) : name;

  const baseFont = mode === "tiny" ? 0.22 : 0.28;
  const charW = mode === "tiny" ? 0.14 : 0.16;
  const padX = mode === "tiny" ? 0.3 : 0.4;
  const padY = mode === "tiny" ? 0.18 : 0.22;

  const textW = clamp(shown.length * charW, 1.05, mode === "tiny" ? 2.6 : 5.2);
  const tagW = textW + padX;
  const tagH = baseFont + padY;

  const dist = zoomDist || 18;
  const sizeFactor = clamp(unitSize / 3.0, 0.95, 1.7);
  const zoomFactor = clamp(dist / 18, 0.75, 2.6);

  useFrame(() => {
    if (!groupRef.current) return;
    const base = active ? 1.12 : 0.95;
    const s = clamp((base / zoomFactor) * sizeFactor, 0.42, 1.35);
    groupRef.current.scale.setScalar(s);
  });

  const z = zoomDist || 18;
  const near = active ? 34 : 22;
  const far = active ? 64 : 42;
  const t = clamp((far - z) / (far - near), 0, 1);
  const opacity = clamp(0.2 + t * (active ? 0.8 : 0.72), 0.2, 1);

  return (
    <Billboard follow>
      <group ref={groupRef}>
        <mesh renderOrder={20}>
          <planeGeometry args={[tagW, tagH]} />
          <meshStandardMaterial color="#000000" transparent opacity={opacity * 0.34} depthTest={false} />
        </mesh>

        <mesh position={[0, 0, 0.001]} renderOrder={21}>
          <planeGeometry args={[tagW * 1.02, tagH * 1.1]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={opacity * 0.1} depthTest={false} />
        </mesh>

        <mesh position={[-tagW / 2 + 0.18, 0, 0.002]} renderOrder={22}>
          <circleGeometry args={[0.085, 18]} />
          <meshStandardMaterial color={dotColor} transparent opacity={opacity} depthTest={false} />
        </mesh>

        <Text
          position={[-tagW / 2 + 0.34, 0, 0.003]}
          anchorX="left"
          anchorY="middle"
          fontSize={baseFont}
          color="#ffffff"
          fillOpacity={opacity}
          outlineWidth={active ? 0.028 : 0.02}
          outlineOpacity={opacity * (active ? 0.45 : 0.3)}
          outlineColor="#000000"
          renderOrder={23}
          depthTest={false}
        >
          {shown}
        </Text>
      </group>
    </Billboard>
  );
}

function InventoryCell3D({ cell, isSelected, isHovered, onSelect, onHoverChange, zoomDist }) {
  const { x, y, w, h } = cell.layout;
  const height = 0.12;
  const borderUp = isSelected ? 0.03 : 0;
  const color = riskColorFromKey(cell.riskKey);

  const unitSize = Math.max(w, h);
  const active = isSelected || isHovered;
  const lift = clamp(0.38 + unitSize * 0.07, 0.48, 0.95);

  return (
    <group position={[x + w / 2, 0, y + h / 2]}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(cell);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHoverChange(cell.id);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHoverChange(null);
        }}
      >
        <boxGeometry args={[w, height + borderUp, h]} />
        <meshStandardMaterial
          color={isSelected ? "#1f2937" : "#111827"}
          transparent
          opacity={0.96}
          emissive={isHovered ? "#0ea5e9" : "#000000"}
          emissiveIntensity={isHovered ? 0.18 : 0}
        />
      </mesh>

      <mesh position={[0, (height + borderUp) / 2 + 0.01, 0]}>
        <boxGeometry args={[w * 0.96, 0.02, h * 0.96]} />
        <meshStandardMaterial color={color} transparent opacity={0.92} />
      </mesh>

      <group position={[0, lift, 0]}>
        <LabelTag3D text={cell.name} dotColor={color} active={active} unitSize={unitSize} zoomDist={zoomDist} />
      </group>
    </group>
  );
}

function StableControls({ target, isMobile }) {
  const controlsRef = useRef(null);

  useEffect(() => {
    if (!controlsRef.current) return;
    controlsRef.current.target.set(target[0], target[1], target[2]);
    controlsRef.current.update();
  }, [target]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.55}
      zoomSpeed={isMobile ? 0.95 : 1.05}
      panSpeed={isMobile ? 0.85 : 0.95}
      enablePan
      screenSpacePanning
      maxPolarAngle={Math.PI / 2.05}
      minPolarAngle={0.4}
      maxDistance={isMobile ? 32 : 38}
      minDistance={isMobile ? 8.5 : 10}
    />
  );
}

function CadScene({ cells, selectedId, hoveredId, onHoverChange, onSelect, bounds, isMobile, onZoomUpdate }) {
  const target = useMemo(() => [bounds.cx, 0, bounds.cy], [bounds.cx, bounds.cy]);
  const { camera } = useThree();

  const lastSentRef = useRef(0);
  const zoomDistRef = useRef(18);

  useFrame(() => {
    const dx = camera.position.x - target[0];
    const dy = camera.position.y - target[1];
    const dz = camera.position.z - target[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    zoomDistRef.current = dist;

    const now = performance.now();
    if (now - lastSentRef.current > 120) {
      lastSentRef.current = now;
      onZoomUpdate(dist);
    }
  });

  const zoomDist = zoomDistRef.current;

  return (
    <>
      <ambientLight intensity={0.72} />
      <directionalLight position={[10, 12, 6]} intensity={0.85} />

      <Grid
        position={[bounds.cx, 0, bounds.cy]}
        args={[bounds.w + 16, bounds.h + 16]}
        cellSize={0.5}
        cellThickness={0.85}
        sectionSize={2}
        sectionThickness={1.25}
        fadeDistance={70}
        fadeStrength={1}
        infiniteGrid={false}
      />

      {cells.map((cell) => (
        <InventoryCell3D
          key={cell.id}
          cell={cell}
          isSelected={cell.id === selectedId}
          isHovered={cell.id === hoveredId}
          onSelect={onSelect}
          onHoverChange={onHoverChange}
          zoomDist={zoomDist}
        />
      ))}

      <StableControls target={target} isMobile={isMobile} />
    </>
  );
}

function CadView({ cells, selectedId, hoveredId, onHoverChange, onSelect, heightPx, isMobile, onZoomUpdate, expanded = false }) {
  const bounds = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    cells.forEach((u) => {
      const { x, y, w, h } = u.layout;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });

    const width = clamp(maxX - minX, 6, 160);
    const height = clamp(maxY - minY, 6, 160);
    return { minX, minY, maxX, maxY, w: width, h: height, cx: minX + width / 2, cy: minY + height / 2 };
  }, [cells]);

  return (
    <div
      style={{
        border: expanded ? "1px solid rgba(56,189,248,0.2)" : `1px solid ${PAGE.border}`,
        background: PAGE.panel2,
        borderRadius: 18,
        overflow: "hidden",
        height: heightPx,
        minWidth: 0,
        boxShadow: expanded ? "0 0 0 1px rgba(56,189,248,0.05) inset, 0 18px 50px rgba(0,0,0,0.28)" : "none",
        transition: "all 260ms ease",
      }}
    >
      <div
        style={{
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          borderBottom: `1px solid ${PAGE.border}`,
          background: "rgba(255,255,255,0.02)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ color: PAGE.text, fontWeight: 900 }}>
          Plant 3 — Component CAD View {expanded ? "• Focus Mode" : ""}
        </div>
        <div style={{ color: PAGE.subtext, fontSize: 12, whiteSpace: "normal", overflowWrap: "anywhere" }}>
          Color map by inventory risk • Hover to identify • Click a cell
        </div>
      </div>

      <div style={{ height: "calc(100% - 44px)" }}>
        <Canvas
          camera={{ position: [bounds.cx, 7.4, bounds.cy + 14], fov: 45 }}
          onPointerMissed={() => onSelect(null)}
          dpr={[1, 1.6]}
        >
          <CadScene
            cells={cells}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onHoverChange={onHoverChange}
            onSelect={onSelect}
            bounds={bounds}
            isMobile={isMobile}
            onZoomUpdate={onZoomUpdate}
          />
        </Canvas>
      </div>
    </div>
  );
}

function TopStatusStrip({ summary, selectedCell, zoomDist, isMobile }) {
  const pill = {
    border: `1px solid ${PAGE.border}`,
    background: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    padding: "10px 12px",
    minWidth: isMobile ? 180 : 220,
    flex: "0 0 auto",
    overflow: "hidden",
  };

  const row = isMobile
    ? { display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6, WebkitOverflowScrolling: "touch" }
    : { display: "flex", gap: 10, flexWrap: "wrap" };

  return (
    <div style={row}>
      <div style={pill}>
        <div style={{ color: PAGE.subtext, fontSize: 12 }}>Cells</div>
        <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 18 }}>{summary.totalCells}</div>
      </div>

      <div style={pill}>
        <div style={{ color: PAGE.subtext, fontSize: 12 }}>Tracked Parts</div>
        <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 18 }}>{summary.totalParts}</div>
      </div>

      <div style={pill}>
        <div style={{ color: PAGE.subtext, fontSize: 12 }}>Safe Parts</div>
        <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 18 }}>{summary.safeCount}</div>
      </div>

      <div style={pill}>
        <div style={{ color: PAGE.subtext, fontSize: 12 }}>Watch Parts</div>
        <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 18 }}>{summary.watchCount}</div>
      </div>

      <div style={pill}>
        <div style={{ color: PAGE.subtext, fontSize: 12 }}>Critical + Out</div>
        <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 18 }}>
          {summary.criticalCount + summary.emptyCount}
        </div>
      </div>

      <div style={pill}>
        <div style={{ color: PAGE.subtext, fontSize: 12 }}>Open Requests</div>
        <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 18 }}>{summary.pendingRequestCount}</div>
      </div>

      <div style={pill}>
        <div style={{ color: PAGE.subtext, fontSize: 12 }}>Selected Cell</div>
        <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 16, overflowWrap: "anywhere", wordBreak: "break-word" }}>
          {selectedCell?.name || "—"}
        </div>
      </div>

      <div style={pill}>
        <div style={{ color: PAGE.subtext, fontSize: 12 }}>CAD Zoom</div>
        <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 18 }}>{zoomDist ? Math.round(zoomDist) : "—"}</div>
      </div>
    </div>
  );
}

function RiskLegendPanel() {
  const items = ["safe", "watch", "critical", "empty"];

  return (
    <Panel title="Risk Legend">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
        }}
      >
        {items.map((key) => (
          <div
            key={key}
            style={{
              border: `1px solid ${PAGE.border}`,
              background: "rgba(255,255,255,0.03)",
              borderRadius: 14,
              padding: 12,
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 99,
                  background: RISK_META[key].color,
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              <div style={{ color: PAGE.text, fontWeight: 900 }}>{RISK_META[key].label}</div>
            </div>
            <div style={{ color: PAGE.subtext, fontSize: 12 }}>{RISK_META[key].text}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function SelectedCellOverviewPanel({ cell, items }) {
  if (!cell) {
    return (
      <Panel title="Selected Cell Overview">
        <div style={{ color: PAGE.subtext }}>Select a cell from the 3D view to inspect component status.</div>
      </Panel>
    );
  }

  const totalCurrent = items.reduce((sum, item) => sum + Number(item.currentStock || 0), 0);
  const totalMin = items.reduce((sum, item) => sum + Number(item.minStock || 0), 0);
  const totalPending = items.reduce((sum, item) => sum + Number(item.pendingQty || 0), 0);
  const totalReserved = items.reduce((sum, item) => sum + Number(item.reservedQty || 0), 0);
  const totalAvailable = items.reduce((sum, item) => sum + Number(item.availableQty || 0), 0);

  return (
    <Panel
      title="Selected Cell Overview"
      right={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <SourceBadge label="Risk" value={cell.risk?.label || "—"} tone={riskToneFromKey(cell.riskKey)} />
        </div>
      }
    >
      <div style={{ display: "grid", gap: 12 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10,
          }}
        >
          <KpiCard label="Cell" value={cell.name} accent />
          <KpiCard label="Tracked Parts" value={formatNumber(items.length)} tone="info" />
          <KpiCard label="Current Stock" value={formatNumber(totalCurrent)} tone="success" />
          <KpiCard label="Min Stock" value={formatNumber(totalMin)} tone="warn" />
          <KpiCard label="Pending Qty" value={formatNumber(totalPending)} tone="purple" />
          <KpiCard
            label="Available Qty"
            value={formatNumber(totalAvailable)}
            tone={totalAvailable <= totalMin ? "danger" : "success"}
          />
        </div>

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
          <InfoLine label="Risk Status" value={cell.risk?.label || "—"} />
          <InfoLine label="Risk Detail" value={cell.risk?.text || "—"} />
          <InfoLine label="Pending Requests" value={formatNumber(cell.pendingQty)} />
          <InfoLine label="Critical Parts" value={formatNumber(cell.criticalCount)} />
          <InfoLine label="Watch Parts" value={formatNumber(cell.watchCount)} />
          <InfoLine label="Reserved Qty" value={formatNumber(totalReserved)} />
        </div>
      </div>
    </Panel>
  );
}

function CellPartsPanel({ cell, items }) {
  return (
    <Panel
      title="Cell Components"
      right={
        cell ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <SourceBadge label="Cell" value={cell.name} tone="info" />
            <SourceBadge label="Parts" value={formatNumber(items.length)} tone="default" />
          </div>
        ) : null
      }
    >
      {!cell ? (
        <div style={{ color: PAGE.subtext }}>Select a cell to review its components.</div>
      ) : items.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                border: `1px solid ${PAGE.border}`,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 16,
                padding: 14,
                display: "grid",
                gap: 10,
                minWidth: 0,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: PAGE.text, fontWeight: 900, overflowWrap: "anywhere" }}>{item.partName}</div>
                  <div style={{ color: PAGE.subtext, fontSize: 12, overflowWrap: "anywhere" }}>{item.partNumber}</div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <SourceBadge label="Risk" value={item.risk?.label || "—"} tone={riskToneFromKey(item.riskKey)} />
                  <SourceBadge label="Loc" value={item.location || "—"} tone="default" />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: 10,
                }}
              >
                <KpiCard label="Current" value={formatNumber(item.currentStock)} tone={riskToneFromKey(item.riskKey)} />
                <KpiCard
                  label="Available"
                  value={formatNumber(item.availableQty)}
                  tone={item.availableQty <= item.minStock ? "danger" : "success"}
                />
                <KpiCard label="Min" value={formatNumber(item.minStock)} tone="warn" />
                <KpiCard label="Max" value={formatNumber(item.maxStock)} tone="info" />
                <KpiCard label="Pending" value={formatNumber(item.pendingQty)} tone="purple" />
                <KpiCard label="Reserved" value={formatNumber(item.reservedQty)} tone="default" />
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ color: PAGE.subtext, fontSize: 12 }}>Stock fill level</div>
                  <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 12 }}>{formatPercent(item.fillPct)}</div>
                </div>
                <MiniBar
                  value={item.fillPct}
                  color={
                    item.fillPct <= 20
                      ? "linear-gradient(90deg, rgba(239,68,68,0.95), rgba(245,158,11,0.9))"
                      : item.fillPct <= 45
                      ? "linear-gradient(90deg, rgba(245,158,11,0.95), rgba(56,189,248,0.9))"
                      : "linear-gradient(90deg, rgba(34,197,94,0.95), rgba(56,189,248,0.9))"
                  }
                />
              </div>

              <div
                style={{
                  border: `1px solid ${PAGE.border}`,
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: 12,
                  padding: 10,
                  display: "grid",
                  gap: 8,
                }}
              >
                <InfoLine label="Requested Today" value={formatNumber(item.requestedToday)} />
                <InfoLine label="Fulfilled Today" value={formatNumber(item.fulfilledToday)} />
                <InfoLine label="Updated At" value={formatTimeStamp(item.updatedAt)} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: PAGE.subtext }}>No component records for this cell.</div>
      )}
    </Panel>
  );
}

function RequestFlowPanel({ cellName, requests }) {
  const filtered = cellName ? requests.filter((req) => req.cellName === cellName) : requests;
  const open = filtered.filter((req) =>
    ["requested", "acknowledged", "in_progress", "partially_fulfilled"].includes(req.requestStatus)
  );
  const done = filtered.filter((req) => ["fulfilled", "cancelled", "rejected"].includes(req.requestStatus));

  return (
    <Panel
      title="Warehouse Request Flow"
      right={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <SourceBadge label="Open" value={formatNumber(open.length)} tone={open.length ? "warn" : "default"} />
          <SourceBadge label="Closed" value={formatNumber(done.length)} tone="success" />
        </div>
      }
    >
      {filtered.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((req) => (
            <div
              key={req.id}
              style={{
                border: `1px solid ${PAGE.border}`,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 14,
                padding: 12,
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: PAGE.text, fontWeight: 900 }}>{req.subject || "Component Request"}</div>
                  <div style={{ color: PAGE.subtext, fontSize: 12, overflowWrap: "anywhere" }}>
                    {req.cellName} • {req.partName}
                  </div>
                </div>

                <SourceBadge
                  label="Status"
                  value={req.requestStatus || "—"}
                  tone={
                    req.requestStatus === "fulfilled"
                      ? "success"
                      : req.requestStatus === "in_progress"
                      ? "info"
                      : req.requestStatus === "requested"
                      ? "warn"
                      : "default"
                  }
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: 10,
                }}
              >
                <KpiCard label="Qty" value={formatNumber(req.quantityRequested)} tone="warn" />
                <KpiCard label="Part #" value={req.partNumber || "—"} tone="info" />
                <KpiCard label="Requested By" value={req.requestedByName || "—"} tone="default" />
              </div>

              <div
                style={{
                  border: `1px solid ${PAGE.border}`,
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: 12,
                  padding: 10,
                  display: "grid",
                  gap: 8,
                }}
              >
                <InfoLine label="Requested At" value={formatTimeStamp(req.requestedAt)} />
                <InfoLine label="Fulfilled At" value={formatTimeStamp(req.fulfilledAt)} />
                <InfoLine label="Note" value={req.note || "—"} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: PAGE.subtext }}>No request records for the current scope.</div>
      )}
    </Panel>
  );
}

function InventoryHealthPanel({ summary }) {
  return (
    <Panel title="Inventory Health Summary">
      <div style={{ display: "grid", gap: 12 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 10,
          }}
        >
          <KpiCard label="Safe Parts" value={formatNumber(summary.safeCount)} tone="success" />
          <KpiCard label="Watch Parts" value={formatNumber(summary.watchCount)} tone="warn" />
          <KpiCard label="Critical Parts" value={formatNumber(summary.criticalCount)} tone="danger" />
          <KpiCard label="Out of Stock" value={formatNumber(summary.emptyCount)} tone="danger" />
          <KpiCard label="Open Requests" value={formatNumber(summary.pendingRequestCount)} tone="purple" />
        </div>

        <div
          style={{
            border: `1px solid ${PAGE.border}`,
            background: "rgba(255,255,255,0.03)",
            borderRadius: 16,
            padding: 14,
            display: "grid",
            gap: 12,
          }}
        >
          <div style={{ color: PAGE.subtext, fontSize: 12 }}>Risk distribution</div>

          {[
            { label: "Safe", value: summary.safeCount, total: summary.totalParts, tone: "success" },
            { label: "Watch", value: summary.watchCount, total: summary.totalParts, tone: "warn" },
            { label: "Critical", value: summary.criticalCount, total: summary.totalParts, tone: "danger" },
            { label: "Out", value: summary.emptyCount, total: summary.totalParts, tone: "danger" },
          ].map((row) => (
            <div key={row.label} style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ color: PAGE.text, fontWeight: 900 }}>{row.label}</div>
                <div style={{ color: PAGE.subtext, fontSize: 12 }}>
                  {formatNumber(row.value)} / {formatNumber(row.total)} •{" "}
                  <span style={{ color: PAGE.text, fontWeight: 900 }}>
                    {formatPercent(row.total > 0 ? (row.value / row.total) * 100 : 0)}
                  </span>
                </div>
              </div>

              <MiniBar
                value={row.total > 0 ? (row.value / row.total) * 100 : 0}
                color={
                  row.tone === "success"
                    ? "linear-gradient(90deg, rgba(34,197,94,0.95), rgba(56,189,248,0.9))"
                    : row.tone === "warn"
                    ? "linear-gradient(90deg, rgba(245,158,11,0.95), rgba(56,189,248,0.9))"
                    : "linear-gradient(90deg, rgba(239,68,68,0.95), rgba(245,158,11,0.9))"
                }
              />
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

export default function ComponentsPage() {
  const rawCells = useMemo(() => getComponentCells(), []);
  const inventorySummary = useMemo(() => getInventorySummary(), []);
  const requests = useMemo(() => getComponentRequests(), []);

  const cells = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    rawCells.forEach((u) => {
      const { x, y, w, h } = u;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const spread = LAYOUT_SPREAD;

    return rawCells.map((u) => {
      const { x, y, w, h } = u;
      const nx = cx + (x - cx) * spread;
      const ny = cy + (y - cy) * spread;

      return {
        ...u,
        layout: {
          x: nx,
          y: ny,
          w,
          h,
        },
      };
    });
  }, [rawCells]);

  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [zoomDist, setZoomDist] = useState(null);

  const isMobile = useMediaQuery("(max-width: 900px)");
  const isTablet = useMediaQuery("(max-width: 1200px)");
  const isSmall = useMediaQuery("(max-width: 520px)");

  const selectedCell = useMemo(() => cells.find((u) => u.id === selectedId) || null, [cells, selectedId]);
  const selectedItems = useMemo(
    () => (selectedCell ? getComponentItemsByCellName(selectedCell.name) : []),
    [selectedCell]
  );

  const desktopExpanded = !isMobile && !!selectedCell;

  const cadRef = useRef(null);
  const detailsRef = useRef(null);

  const [mobileSection, setMobileSection] = useState("cad");

  const scrollToSection = useCallback((key) => {
    const el = key === "cad" ? cadRef.current : detailsRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    if (!isMobile) return;

    const handler = () => {
      const cadTop = cadRef.current?.getBoundingClientRect?.().top ?? 9999;
      const detailsTop = detailsRef.current?.getBoundingClientRect?.().top ?? 9999;
      const active = Math.abs(cadTop) < Math.abs(detailsTop) ? "cad" : "details";
      setMobileSection(active);
    };

    window.addEventListener("scroll", handler, { passive: true });
    handler();

    return () => window.removeEventListener("scroll", handler);
  }, [isMobile]);

  function onSelect(cell) {
    setSelectedId(cell ? cell.id : null);

    if (!cell) return;

    if (isMobile) {
      setMobileSection("details");
      setTimeout(() => {
        scrollToSection("details");
      }, 80);
    } else {
      setTimeout(() => {
        detailsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      }, 140);
    }
  }

  const cadHeight = isMobile ? (isSmall ? 420 : 520) : desktopExpanded ? 620 : 560;

  return (
    <div
      style={{
        background: PAGE.bg,
        minHeight: "100%",
        color: PAGE.text,
        padding: isMobile ? 12 : PAGE.padding,
        paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: 1480,
          margin: "0 auto",
          width: "100%",
          display: "grid",
          gap: 12,
          minWidth: 0,
        }}
      >
        <TopStatusStrip
          summary={inventorySummary}
          selectedCell={selectedCell}
          zoomDist={zoomDist}
          isMobile={isMobile}
        />

        {isMobile ? (
          <div
            style={{
              position: "sticky",
              top: 10,
              zIndex: 20,
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              minWidth: 0,
            }}
          >
            <SegmentedScroll
              value={mobileSection}
              onChange={(key) => {
                setMobileSection(key);
                scrollToSection(key);
              }}
            />
          </div>
        ) : null}

        {!isMobile ? (
          desktopExpanded ? (
            <div
              style={{
                display: "grid",
                gap: PAGE.gap,
                minWidth: 0,
                alignItems: "start",
                transition: "all 260ms ease",
              }}
            >
              <div ref={cadRef} style={{ minWidth: 0 }}>
                <CadView
                  cells={cells}
                  selectedId={selectedId}
                  hoveredId={hoveredId}
                  onHoverChange={setHoveredId}
                  onSelect={onSelect}
                  heightPx={cadHeight}
                  isMobile={isMobile}
                  onZoomUpdate={setZoomDist}
                  expanded
                />
              </div>

              <div
                ref={detailsRef}
                style={{
                  display: "grid",
                  gap: PAGE.gap,
                  minWidth: 0,
                  alignContent: "start",
                }}
              >
                <RiskLegendPanel />
                <SelectedCellOverviewPanel cell={selectedCell} items={selectedItems} />
                <InventoryHealthPanel summary={inventorySummary} />
                <CellPartsPanel cell={selectedCell} items={selectedItems} />
                <RequestFlowPanel cellName={selectedCell?.name || null} requests={requests} />
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isTablet ? "1fr" : "minmax(0, 1.03fr) minmax(0, 0.97fr)",
                gap: PAGE.gap,
                alignItems: "stretch",
                minWidth: 0,
                transition: "all 260ms ease",
              }}
            >
              <div ref={cadRef} style={{ minWidth: 0 }}>
                <CadView
                  cells={cells}
                  selectedId={selectedId}
                  hoveredId={hoveredId}
                  onHoverChange={setHoveredId}
                  onSelect={onSelect}
                  heightPx={cadHeight}
                  isMobile={isMobile}
                  onZoomUpdate={setZoomDist}
                />
              </div>

              <div ref={detailsRef} style={{ display: "grid", gap: PAGE.gap, alignContent: "start", minWidth: 0 }}>
                <RiskLegendPanel />
                <SelectedCellOverviewPanel cell={selectedCell} items={selectedItems} />
                <InventoryHealthPanel summary={inventorySummary} />
                <CellPartsPanel cell={selectedCell} items={selectedItems} />
                <RequestFlowPanel cellName={selectedCell?.name || null} requests={requests} />
              </div>
            </div>
          )
        ) : (
          <div style={{ display: "grid", gap: PAGE.gap, minWidth: 0 }}>
            <div ref={cadRef} style={{ scrollMarginTop: 90, minWidth: 0 }}>
              <CadView
                cells={cells}
                selectedId={selectedId}
                hoveredId={hoveredId}
                onHoverChange={setHoveredId}
                onSelect={onSelect}
                heightPx={cadHeight}
                isMobile={isMobile}
                onZoomUpdate={setZoomDist}
                expanded={!!selectedCell}
              />
            </div>

            <div ref={detailsRef} style={{ scrollMarginTop: 90, minWidth: 0 }}>
              <div style={{ display: "grid", gap: PAGE.gap, minWidth: 0 }}>
                <RiskLegendPanel />
                <SelectedCellOverviewPanel cell={selectedCell} items={selectedItems} />
                <InventoryHealthPanel summary={inventorySummary} />
                <CellPartsPanel cell={selectedCell} items={selectedItems} />
                <RequestFlowPanel cellName={selectedCell?.name || null} requests={requests} />
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: 2,
            color: PAGE.subtext,
            fontSize: 12,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            minWidth: 0,
          }}
        >
          <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>
            Selected: <span style={{ color: PAGE.text, fontWeight: 900 }}>{selectedCell ? selectedCell.name : "—"}</span> •
            Risk: <span style={{ color: PAGE.text, fontWeight: 900 }}>{selectedCell?.risk?.label || "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}