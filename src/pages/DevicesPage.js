// src/pages/DevicesPage.js
import React, { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Html } from "@react-three/drei";
import { getPlant3Units } from "../data/mock/plant3.units.mock";

const PAGE = {
  padding: 16,
  gap: 12,
  bg: "#0b0f14",
  panel: "#111826",
  panel2: "#0f1623",
  border: "rgba(255,255,255,0.08)",
  text: "rgba(255,255,255,0.92)",
  subtext: "rgba(255,255,255,0.65)",
  accent: "rgba(56,189,248,0.95)", // sky-ish
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
  const bg =
    kind === "primary"
      ? "rgba(56,189,248,0.14)"
      : "rgba(255,255,255,0.06)";
  const bd =
    kind === "primary"
      ? "rgba(56,189,248,0.28)"
      : "rgba(255,255,255,0.10)";
  return (
    <button
      onClick={onClick}
      style={{
        height: 36,
        padding: "0 12px",
        borderRadius: 10,
        border: `1px solid ${bd}`,
        background: bg,
        color: PAGE.text,
        cursor: "pointer",
        fontWeight: 600,
        letterSpacing: 0.2,
      }}
    >
      {label}
    </button>
  );
}

function StatPill({ label, value }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        border: `1px solid ${PAGE.border}`,
        background: "rgba(255,255,255,0.04)",
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        minWidth: 160,
      }}
    >
      <div style={{ color: PAGE.subtext, fontSize: 12 }}>{label}</div>
      <div style={{ color: PAGE.text, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function Panel({ title, children, right }) {
  return (
    <div
      style={{
        border: `1px solid ${PAGE.border}`,
        background: PAGE.panel,
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${PAGE.border}`,
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div style={{ color: PAGE.text, fontWeight: 800 }}>{title}</div>
        <div>{right}</div>
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

function UnitBox3D({ unit, isSelected, onSelect }) {
  const { x, y, w, h } = unit.layout;
  const z = 0;

  const height = 0.12;
  const borderUp = isSelected ? 0.03 : 0;
  const color = statusColor(unit.status);

  return (
    <group position={[x + w / 2, z, y + h / 2]}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(unit);
        }}
      >
        <boxGeometry args={[w, height + borderUp, h]} />
        <meshStandardMaterial
          color={isSelected ? "#1f2937" : "#111827"}
          transparent
          opacity={0.95}
        />
      </mesh>

      <mesh position={[0, (height + borderUp) / 2 + 0.01, 0]}>
        <boxGeometry args={[w * 0.96, 0.02, h * 0.96]} />
        <meshStandardMaterial color={color} transparent opacity={0.9} />
      </mesh>

      <Html
        center
        style={{
          pointerEvents: "none",
          transform: "translateY(-2px)",
          fontSize: 11,
          color: "rgba(255,255,255,0.85)",
          whiteSpace: "nowrap",
          padding: "4px 8px",
          borderRadius: 10,
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
        position={[0, 0.22, 0]}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 99,
              background: color,
              display: "inline-block",
            }}
          />
          <span style={{ fontWeight: 700 }}>{unit.name}</span>
        </div>
      </Html>
    </group>
  );
}

function CadView({ units, selectedId, onSelect }) {
  const bounds = useMemo(() => {
    // compute extents for camera target
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

    const w = clamp(maxX - minX, 6, 80);
    const h = clamp(maxY - minY, 6, 80);
    return { minX, minY, maxX, maxY, w, h, cx: minX + w / 2, cy: minY + h / 2 };
  }, [units]);

  return (
    <div
      style={{
        border: `1px solid ${PAGE.border}`,
        background: PAGE.panel2,
        borderRadius: 16,
        overflow: "hidden",
        height: "100%",
        minHeight: 520,
      }}
    >
      <div
        style={{
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${PAGE.border}`,
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div style={{ color: PAGE.text, fontWeight: 800 }}>Plant 3 — CAD View</div>
        <div style={{ color: PAGE.subtext, fontSize: 12 }}>
          Orbit / Pan / Zoom • Click a unit
        </div>
      </div>

      <div style={{ height: "calc(100% - 44px)" }}>
        <Canvas
          camera={{ position: [bounds.cx, 7.5, bounds.cy + 10], fov: 45 }}
          onPointerMissed={() => onSelect(null)}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 12, 6]} intensity={0.8} />

          <Grid
            position={[bounds.cx, 0, bounds.cy]}
            args={[bounds.w + 10, bounds.h + 10]}
            cellSize={0.5}
            cellThickness={0.7}
            sectionSize={2}
            sectionThickness={1.0}
            fadeDistance={40}
            fadeStrength={1}
            infiniteGrid={false}
          />

          {units.map((u) => (
            <UnitBox3D
              key={u.id}
              unit={u}
              isSelected={u.id === selectedId}
              onSelect={onSelect}
            />
          ))}

          <OrbitControls
            enableDamping
            dampingFactor={0.08}
            maxPolarAngle={Math.PI / 2.15}
            minPolarAngle={0.25}
            target={[bounds.cx, 0, bounds.cy]}
          />
        </Canvas>
      </div>
    </div>
  );
}

function HmiPanel({ unit, lastAction, onAction }) {
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
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 99,
                background: color,
                display: "inline-block",
              }}
            />
            <span style={{ color: PAGE.text, fontWeight: 800 }}>{status}</span>
          </div>
        </div>
      }
    >
      {!unit ? (
        <div style={{ color: PAGE.subtext }}>
          Select a unit on the left to view output.
        </div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <StatPill label="Unit" value={unit.name} />
            <StatPill label="Current Part/Model" value={partModel} />
            <StatPill label="OK" value={counters.ok ?? "—"} />
            <StatPill label="NG" value={counters.ng ?? "—"} />
            <StatPill label="Suspect" value={counters.suspect ?? "—"} />
            <StatPill label="Containers" value={counters.containers ?? "—"} />
            <StatPill label="Pack" value={counters.pack ?? "—"} />
          </div>

          <div
            style={{
              border: `1px solid ${PAGE.border}`,
              background: "rgba(0,0,0,0.35)",
              borderRadius: 14,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <div style={{ color: PAGE.subtext, fontSize: 12, marginBottom: 8 }}>
              System Messages
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {messages.length === 0 ? (
                <div style={{ color: PAGE.subtext }}>No messages.</div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} style={{ color: PAGE.text, fontWeight: 600 }}>
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
            <span style={{ color: PAGE.text, fontWeight: 700 }}>
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
        <div style={{ color: PAGE.subtext }}>
          Select a unit to view shift totals.
        </div>
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
                    borderRadius: 14,
                    padding: 12,
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ color: PAGE.text, fontWeight: 900 }}>
                      Shift {k}
                    </div>
                    <div style={{ color: PAGE.subtext, fontSize: 12 }}>
                      OK/NG/Suspect + Downtime (min)
                    </div>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    <StatPill label="OK" value={t.ok ?? "—"} />
                    <StatPill label="NG" value={t.ng ?? "—"} />
                    <StatPill label="Suspect" value={t.suspect ?? "—"} />
                    <StatPill label="Downtime (min)" value={t.downtimeMin ?? "—"} />
                    <StatPill label="Top Alarms" value="Placeholder" />
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

export default function DevicesPage() {
  const units = useMemo(() => getPlant3Units(), []);
  const [selectedId, setSelectedId] = useState(units[0]?.id || null);
  const [lastAction, setLastAction] = useState(null);

  const selectedUnit = useMemo(
    () => units.find((u) => u.id === selectedId) || null,
    [units, selectedId]
  );

  function onSelect(unit) {
    setSelectedId(unit ? unit.id : null);
    setLastAction(null);
  }

  function onAction(type) {
    if (!selectedUnit) return;
    const now = new Date();
    const at = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setLastAction({ type, at, unitId: selectedUnit.id });
  }

  return (
    <div
      style={{
        padding: PAGE.padding,
        background: PAGE.bg,
        minHeight: "calc(100vh - 0px)",
        color: PAGE.text,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.15fr 0.85fr",
          gap: PAGE.gap,
          alignItems: "stretch",
        }}
      >
        <CadView units={units} selectedId={selectedId} onSelect={onSelect} />

        <div style={{ display: "grid", gap: PAGE.gap, alignContent: "start" }}>
          <HmiPanel unit={selectedUnit} lastAction={lastAction} onAction={onAction} />
          <ShiftTotalsPanel unit={selectedUnit} />
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          color: PAGE.subtext,
          fontSize: 12,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          Selected:{" "}
          <span style={{ color: PAGE.text, fontWeight: 800 }}>
            {selectedUnit ? selectedUnit.name : "—"}
          </span>{" "}
          • Status:{" "}
          <span style={{ color: PAGE.text, fontWeight: 800 }}>
            {formatUnitStatus(selectedUnit)}
          </span>
        </div>
        <div>Mode: UI Prototype + Mock Data • No real-time required yet</div>
      </div>
    </div>
  );
}
