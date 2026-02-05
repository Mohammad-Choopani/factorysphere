// src/pages/DevicesPage.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Billboard, Text } from "@react-three/drei";
import { useMediaQuery } from "@mui/material";
import { getPlant3Units } from "../data/mock/plant3.units.mock";

const LAYOUT_SPREAD = 1.34; // 1.20..1.45 (more spacing = less label overlap)

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
};

function statusColor(status) {
  if (status === "RUNNING") return "#22c55e";
  if (status === "ATTN") return "#f59e0b";
  return "#ef4444";
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function formatUnitStatus(u) {
  return u?.status || "—";
}

function Button({ label, onClick, kind = "primary" }) {
  const bg = kind === "primary" ? "rgba(56,189,248,0.14)" : "rgba(255,255,255,0.06)";
  const bd = kind === "primary" ? "rgba(56,189,248,0.28)" : "rgba(255,255,255,0.10)";

  return (
    <button
      onClick={onClick}
      style={{
        height: 38,
        padding: "0 12px",
        borderRadius: 12,
        border: `1px solid ${bd}`,
        background: bg,
        color: PAGE.text,
        cursor: "pointer",
        fontWeight: 800,
        letterSpacing: 0.2,
        transition: "transform 140ms ease, filter 140ms ease, box-shadow 140ms ease",
        userSelect: "none",
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = "scale(0.98)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "none";
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.filter = "brightness(1.06)";
        e.currentTarget.style.boxShadow = "0 14px 40px rgba(0,0,0,0.35)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.filter = "none";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {label}
    </button>
  );
}

function StatPill({ label, value, compact = false }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 14,
        border: `1px solid ${PAGE.border}`,
        background: "rgba(255,255,255,0.04)",
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        minWidth: compact ? 0 : 160,
        flex: compact ? "1 1 48%" : "0 0 auto",
      }}
    >
      <div style={{ color: PAGE.subtext, fontSize: 12 }}>{label}</div>
      <div style={{ color: PAGE.text, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function Panel({ title, children, right }) {
  return (
    <div
      style={{
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
        }}
      >
        <div style={{ color: PAGE.text, fontWeight: 900 }}>{title}</div>
        <div style={{ flexShrink: 0 }}>{right}</div>
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

/**
 * One label per unit (always visible).
 * - Never duplicates (no Tiny+Full simultaneously).
 * - Scales with zoom + unit size.
 * - Uses Billboard + depthTest={false} so it won't "disappear" on rotate.
 */
function LabelTag3D({ text, dotColor, active, unitSize, zoomDist }) {
  const groupRef = useRef(null);

  const name = String(text || "UNIT");
  const mode = active ? "full" : "tiny";
  const shown = mode === "tiny" ? name.slice(0, 12) : name;

  // Base geometry sizing in world units (then we scale the whole group)
  const baseFont = mode === "tiny" ? 0.22 : 0.28;
  const charW = mode === "tiny" ? 0.14 : 0.16;
  const padX = mode === "tiny" ? 0.30 : 0.40;
  const padY = mode === "tiny" ? 0.18 : 0.22;

  const textW = clamp(shown.length * charW, 1.05, mode === "tiny" ? 2.6 : 5.2);
  const tagW = textW + padX;
  const tagH = baseFont + padY;

  // Scaling behavior
  const dist = zoomDist || 18;
  const sizeFactor = clamp(unitSize / 3.0, 0.95, 1.70); // bigger units -> bigger label
  const zoomFactor = clamp(dist / 18, 0.75, 2.60); // zoom out -> smaller label

  useFrame(() => {
    if (!groupRef.current) return;
    const base = active ? 1.12 : 0.95;
    const s = clamp((base / zoomFactor) * sizeFactor, 0.42, 1.35);
    groupRef.current.scale.setScalar(s);
  });

  // Soft fade when super far (still visible, just calmer)
  const z = zoomDist || 18;
  const near = active ? 34 : 22;
  const far = active ? 64 : 42;
  const t = clamp((far - z) / (far - near), 0, 1);
  const opacity = clamp(0.20 + t * (active ? 0.80 : 0.72), 0.20, 1.0);

  return (
    <Billboard follow={true}>
      <group ref={groupRef}>
        {/* Shadow plane */}
        <mesh renderOrder={20}>
          <planeGeometry args={[tagW, tagH]} />
          <meshStandardMaterial color="#000000" transparent opacity={opacity * 0.34} depthTest={false} />
        </mesh>

        {/* Glass plane */}
        <mesh position={[0, 0, 0.001]} renderOrder={21}>
          <planeGeometry args={[tagW * 1.02, tagH * 1.10]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={opacity * 0.10} depthTest={false} />
        </mesh>

        {/* Dot */}
        <mesh position={[-tagW / 2 + 0.18, 0, 0.002]} renderOrder={22}>
          <circleGeometry args={[0.085, 18]} />
          <meshStandardMaterial color={dotColor} transparent opacity={opacity} depthTest={false} />
        </mesh>

        {/* Text */}
        <Text
          position={[-tagW / 2 + 0.34, 0, 0.003]}
          anchorX="left"
          anchorY="middle"
          fontSize={baseFont}
          color="#ffffff"
          fillOpacity={opacity}
          outlineWidth={active ? 0.028 : 0.02}
          outlineOpacity={opacity * (active ? 0.45 : 0.30)}
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

function UnitBox3D({ unit, isSelected, isHovered, onSelect, onHoverChange, zoomDist }) {
  const { x, y, w, h } = unit.layout;

  const height = 0.12;
  const borderUp = isSelected ? 0.03 : 0;
  const color = statusColor(unit.status);

  const unitSize = Math.max(w, h);
  const active = isSelected || isHovered;

  // Lift label based on unit size (keeps label above the box)
  const lift = clamp(0.38 + unitSize * 0.07, 0.48, 0.95);

  return (
    <group position={[x + w / 2, 0, y + h / 2]}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(unit);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHoverChange(unit.id);
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
        <meshStandardMaterial color={color} transparent opacity={0.9} />
      </mesh>

      {/* Exactly ONE label always */}
      <group position={[0, lift, 0]}>
        <LabelTag3D text={unit.name} dotColor={color} active={active} unitSize={unitSize} zoomDist={zoomDist} />
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
      minPolarAngle={0.40}
      maxDistance={isMobile ? 32 : 38}
      minDistance={isMobile ? 8.5 : 10}
    />
  );
}

function CadScene({ units, selectedId, hoveredId, onHoverChange, onSelect, bounds, isMobile, onZoomUpdate }) {
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

      {units.map((u) => (
        <UnitBox3D
          key={u.id}
          unit={u}
          isSelected={u.id === selectedId}
          isHovered={u.id === hoveredId}
          onSelect={onSelect}
          onHoverChange={onHoverChange}
          zoomDist={zoomDist}
        />
      ))}

      <StableControls target={target} isMobile={isMobile} />
    </>
  );
}

function CadView({ units, selectedId, hoveredId, onHoverChange, onSelect, heightPx, isMobile, onZoomUpdate }) {
  const bounds = useMemo(() => {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    units.forEach((u) => {
      const { x, y, w, h } = u.layout;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });

    const w = clamp(maxX - minX, 6, 160);
    const h = clamp(maxY - minY, 6, 160);
    return { minX, minY, maxX, maxY, w, h, cx: minX + w / 2, cy: minY + h / 2 };
  }, [units]);

  return (
    <div
      style={{
        border: `1px solid ${PAGE.border}`,
        background: PAGE.panel2,
        borderRadius: 18,
        overflow: "hidden",
        height: heightPx,
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
        }}
      >
        <div style={{ color: PAGE.text, fontWeight: 900 }}>Plant 3 — CAD View</div>
        <div style={{ color: PAGE.subtext, fontSize: 12, whiteSpace: "nowrap" }}>
          Pan + Zoom + Rotate • Hover to identify • Click a unit
        </div>
      </div>

      <div style={{ height: "calc(100% - 44px)" }}>
        <Canvas
          camera={{ position: [bounds.cx, 7.4, bounds.cy + 14], fov: 45 }}
          onPointerMissed={() => onSelect(null)}
          dpr={[1, 1.6]}
        >
          <CadScene
            units={units}
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

/** ---------- Panels ---------- */

function HmiPanel({ unit, lastAction, onAction, compact }) {
  const status = unit?.status || "—";
  const color = statusColor(unit?.status);
  const counters = unit?.mock?.counters || {};
  const messages = unit?.mock?.messages || [];
  const partModel = unit?.mock?.partModel || "—";

  return (
    <Panel
      title="Main Output — HMI"
      right={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ color: PAGE.subtext, fontSize: 12 }}>Status</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 99, background: color, display: "inline-block" }} />
            <span style={{ color: PAGE.text, fontWeight: 900 }}>{status}</span>
          </div>
        </div>
      }
    >
      {!unit ? (
        <div style={{ color: PAGE.subtext }}>Select a unit to view output.</div>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <StatPill label="Unit" value={unit.name} compact={compact} />
            <StatPill label="Current Part/Model" value={partModel} compact={compact} />
            <StatPill label="OK" value={counters.ok ?? "—"} compact={compact} />
            <StatPill label="NG" value={counters.ng ?? "—"} compact={compact} />
            <StatPill label="Suspect" value={counters.suspect ?? "—"} compact={compact} />
            <StatPill label="Containers" value={counters.containers ?? "—"} compact={compact} />
            <StatPill label="Pack" value={counters.pack ?? "—"} compact={compact} />
          </div>

          <div
            style={{
              border: `1px solid ${PAGE.border}`,
              background: "rgba(0,0,0,0.35)",
              borderRadius: 16,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <div style={{ color: PAGE.subtext, fontSize: 12, marginBottom: 8 }}>System Messages</div>
            <div style={{ display: "grid", gap: 6 }}>
              {messages.length === 0 ? (
                <div style={{ color: PAGE.subtext }}>No messages.</div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} style={{ color: PAGE.text, fontWeight: 800 }}>
                    {m}
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Button label="Print Partial" onClick={() => onAction("PRINT_PARTIAL")} />
            <Button label="Shift Change" onClick={() => onAction("SHIFT_CHANGE")} />
            <Button label="Down Time" onClick={() => onAction("DOWN_TIME")} />
            <Button label="Suspect / Defect" onClick={() => onAction("SUSPECT_DEFECT")} />
            <Button label="Change Part" onClick={() => onAction("CHANGE_PART")} />
            <Button label="Options" kind="secondary" onClick={() => onAction("OPTIONS")} />
          </div>

          <div style={{ marginTop: 12, color: PAGE.subtext, fontSize: 12 }}>
            Last action:{" "}
            <span style={{ color: PAGE.text, fontWeight: 900 }}>
              {lastAction ? `${lastAction.type} @ ${lastAction.at}` : "—"}
            </span>
          </div>
        </>
      )}
    </Panel>
  );
}

function ShiftTotalsPanel({ unit }) {
  const totals = unit?.shiftTotals;

  return (
    <Panel title="Shift Totals / Reports">
      {!unit ? (
        <div style={{ color: PAGE.subtext }}>Select a unit to view shift totals.</div>
      ) : (
        <>
          <div style={{ color: PAGE.subtext, fontSize: 12, marginBottom: 10 }}>
            Aggregated totals (mock, future-ready for DB persistence)
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {["A", "B", "C"].map((k) => {
              const t = totals?.[k] || {};
              return (
                <div
                  key={k}
                  style={{
                    border: `1px solid ${PAGE.border}`,
                    borderRadius: 16,
                    padding: 12,
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                    <div style={{ color: PAGE.text, fontWeight: 900 }}>Shift {k}</div>
                    <div style={{ color: PAGE.subtext, fontSize: 12, whiteSpace: "nowrap" }}>
                      OK/NG/Suspect + Downtime (min)
                    </div>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    <StatPill label="OK" value={t.ok ?? "—"} compact />
                    <StatPill label="NG" value={t.ng ?? "—"} compact />
                    <StatPill label="Suspect" value={t.suspect ?? "—"} compact />
                    <StatPill label="Downtime (min)" value={t.downtimeMin ?? "—"} compact />
                    <StatPill label="Top Alarms" value="Placeholder" compact />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Panel>
  );
}

/** ---------- Mobile segmented scroll ---------- */

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
      }}
    >
      <button style={itemStyle(value === "cad")} onClick={() => onChange("cad")}>
        CAD View
      </button>
      <button style={itemStyle(value === "hmi")} onClick={() => onChange("hmi")}>
        HMI / Totals
      </button>
    </div>
  );
}

function TopStatusStrip({ units, selectedUnit, zoomDist, isMobile }) {
  const online = units.filter((u) => u.status !== "DOWN").length;
  const attn = units.filter((u) => u.status === "ATTN").length;
  const down = units.filter((u) => u.status === "DOWN").length;

  const pill = {
    border: `1px solid ${PAGE.border}`,
    background: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    padding: "10px 12px",
    minWidth: isMobile ? 180 : 220,
    flex: "0 0 auto",
  };

  const row = isMobile
    ? { display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6, WebkitOverflowScrolling: "touch" }
    : { display: "flex", gap: 10, flexWrap: "wrap" };

  return (
    <div style={row}>
      <div style={pill}>
        <div style={{ color: PAGE.subtext, fontSize: 12 }}>Units Online</div>
        <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 18 }}>
          {online}/{units.length}
        </div>
      </div>

      <div style={pill}>
        <div style={{ color: PAGE.subtext, fontSize: 12 }}>Attention</div>
        <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 18 }}>{attn}</div>
      </div>

      <div style={pill}>
        <div style={{ color: PAGE.subtext, fontSize: 12 }}>Down</div>
        <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 18 }}>{down}</div>
      </div>

      <div style={pill}>
        <div style={{ color: PAGE.subtext, fontSize: 12 }}>Selected</div>
        <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 16 }}>{selectedUnit ? selectedUnit.name : "—"}</div>
        <div style={{ color: PAGE.subtext, fontSize: 12, marginTop: 4 }}>
          Status: <span style={{ color: PAGE.text, fontWeight: 900 }}>{formatUnitStatus(selectedUnit)}</span>
        </div>
      </div>

      <div style={pill}>
        <div style={{ color: PAGE.subtext, fontSize: 12 }}>CAD Zoom</div>
        <div style={{ color: PAGE.text, fontWeight: 900, fontSize: 18 }}>{zoomDist ? Math.round(zoomDist) : "—"}</div>
      </div>
    </div>
  );
}

export default function DevicesPage() {
  const rawUnits = useMemo(() => getPlant3Units(), []);

  // Spread units AROUND CENTER (keeps plant centered, reduces overlaps)
  const units = useMemo(() => {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    rawUnits.forEach((u) => {
      const { x, y, w, h } = u.layout;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const s = LAYOUT_SPREAD;

    return rawUnits.map((u) => {
      const { x, y, w, h } = u.layout;
      const nx = cx + (x - cx) * s;
      const ny = cy + (y - cy) * s;

      return {
        ...u,
        layout: {
          ...u.layout,
          x: nx,
          y: ny,
          w,
          h,
        },
      };
    });
  }, [rawUnits]);

  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [lastAction, setLastAction] = useState(null);
  const [zoomDist, setZoomDist] = useState(null);

  const isMobile = useMediaQuery("(max-width: 900px)");
  const isSmall = useMediaQuery("(max-width: 520px)");

  const selectedUnit = useMemo(() => units.find((u) => u.id === selectedId) || null, [units, selectedId]);

  const cadRef = useRef(null);
  const hmiRef = useRef(null);
  const [mobileSection, setMobileSection] = useState("cad");

  const scrollToSection = useCallback((key) => {
    const el = key === "cad" ? cadRef.current : hmiRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    if (!isMobile) return;

    const handler = () => {
      const cadTop = cadRef.current?.getBoundingClientRect?.().top ?? 9999;
      const hmiTop = hmiRef.current?.getBoundingClientRect?.().top ?? 9999;
      const active = Math.abs(cadTop) < Math.abs(hmiTop) ? "cad" : "hmi";
      setMobileSection(active);
    };

    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, [isMobile]);

  function onSelect(unit) {
    setSelectedId(unit ? unit.id : null);
    setLastAction(null);

    if (isMobile && unit) {
      setTimeout(() => scrollToSection("hmi"), 80);
    }
  }

  function onAction(type) {
    if (!selectedUnit) return;
    const now = new Date();
    const at = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setLastAction({ type, at, unitId: selectedUnit.id });
  }

  const cadHeight = isMobile ? (isSmall ? 420 : 520) : 560;

  const pageOuter = {
    background: PAGE.bg,
    minHeight: "100%",
    color: PAGE.text,
    padding: isMobile ? 12 : PAGE.padding,
    paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
    overflowX: "hidden",
  };

  const pageInner = {
    maxWidth: 1400,
    margin: "0 auto",
    width: "100%",
    display: "grid",
    gap: 12,
  };

  return (
    <div style={pageOuter}>
      <div style={pageInner}>
        <TopStatusStrip units={units} selectedUnit={selectedUnit} zoomDist={zoomDist} isMobile={isMobile} />

        {isMobile ? (
          <div
            style={{
              position: "sticky",
              top: 10,
              zIndex: 20,
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.15fr 0.85fr",
              gap: PAGE.gap,
              alignItems: "stretch",
            }}
          >
            <CadView
              units={units}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onHoverChange={(id) => setHoveredId(id)}
              onSelect={onSelect}
              heightPx={cadHeight}
              isMobile={isMobile}
              onZoomUpdate={setZoomDist}
            />

            <div style={{ display: "grid", gap: PAGE.gap, alignContent: "start" }}>
              <HmiPanel unit={selectedUnit} lastAction={lastAction} onAction={onAction} compact={false} />
              <ShiftTotalsPanel unit={selectedUnit} />
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: PAGE.gap }}>
            <div ref={cadRef} style={{ scrollMarginTop: 90 }}>
              <CadView
                units={units}
                selectedId={selectedId}
                hoveredId={hoveredId}
                onHoverChange={(id) => setHoveredId(id)}
                onSelect={onSelect}
                heightPx={cadHeight}
                isMobile={isMobile}
                onZoomUpdate={setZoomDist}
              />
            </div>

            <div ref={hmiRef} style={{ scrollMarginTop: 90 }}>
              <div style={{ display: "grid", gap: PAGE.gap }}>
                <HmiPanel unit={selectedUnit} lastAction={lastAction} onAction={onAction} compact />
                <ShiftTotalsPanel unit={selectedUnit} />
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
          }}
        >
          <div>
            Selected: <span style={{ color: PAGE.text, fontWeight: 900 }}>{selectedUnit ? selectedUnit.name : "—"}</span>{" "}
            • Status: <span style={{ color: PAGE.text, fontWeight: 900 }}>{formatUnitStatus(selectedUnit)}</span>
          </div>
          <div>Mode: UI Prototype + Mock Data • No real-time required yet</div>
        </div>
      </div>
    </div>
  );
}
