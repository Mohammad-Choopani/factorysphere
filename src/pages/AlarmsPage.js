// src/pages/AlarmsPage.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  Dialog,
  Button,
  MenuItem,
  Select,
  Divider,
  Stack,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  IconButton,
  Tooltip,
  Drawer,
  useMediaQuery,
} from "@mui/material";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import VolumeOffRoundedIcon from "@mui/icons-material/VolumeOffRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Billboard, Text } from "@react-three/drei";

import { getPlant3Units } from "../data/mock/plant3.units.mock";
import { useAlarmCenter, EVENT_TYPE } from "../state/alarmCenter.store";
import { postDowntimeStart, postDowntimeEnd } from "../services/alarms.api";

const LAYOUT_SPREAD = 1.34;

const PAGE = {
  bg: "#0b0f14",
  frame: "rgba(255,255,255,0.04)",
  panel: "#111826",
  panel2: "#0f1623",
  border: "rgba(255,255,255,0.10)",
  borderSoft: "rgba(255,255,255,0.08)",
  text: "rgba(255,255,255,0.92)",
  subtext: "rgba(255,255,255,0.65)",
  muted: "rgba(255,255,255,0.52)",
  accent: "rgba(56,189,248,0.95)",
};

const SEVERITY = { LOW: "LOW", MED: "MED", HIGH: "HIGH" };

const COLOR_GREEN = "#22c55e";
const COLOR_RED = "#ef4444";
const COLOR_YELLOW = "#f59e0b";

const ALARM_HOLD_MS = 10 * 60 * 1000;

// ✅ History/Print policy:
// Show ONLY these (Resume must NOT be printed/shown)
const PRINTABLE_TYPES = new Set([EVENT_TYPE.DT_START, EVENT_TYPE.ALARM_RAISE]);

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function baseLineColor(status) {
  return status === "RUNNING" ? COLOR_GREEN : COLOR_RED;
}

function severityChipColor(sev) {
  if (sev === SEVERITY.HIGH) return "error";
  if (sev === SEVERITY.MED) return "warning";
  return "default";
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function pickPreferredVoice(voices, lang) {
  const list = (voices || []).filter((v) => (v.lang || "").toLowerCase().startsWith(lang.toLowerCase()));
  if (!list.length) return null;

  const preferredNames = [
    "zira",
    "samantha",
    "victoria",
    "karen",
    "tessa",
    "allison",
    "microsoft aria",
    "microsoft zira",
    "google us english",
  ];

  const byName = list.find((v) => preferredNames.some((p) => (v.name || "").toLowerCase().includes(p)));
  return byName || list[0];
}

function safeSpeak(text, enabled, opts = {}) {
  if (!enabled) return;
  if (!("speechSynthesis" in window)) return;

  const { lang = "en-US", rate = 1.0, pitch = 1.05, volume = 1.0, preferFemale = true } = opts;

  try {
    window.speechSynthesis.cancel();

    const utter = new window.SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = rate;
    utter.pitch = pitch;
    utter.volume = volume;

    const voices = window.speechSynthesis.getVoices?.() || [];
    if (preferFemale && voices.length) {
      const v = pickPreferredVoice(voices, lang);
      if (v) utter.voice = v;
    }

    window.speechSynthesis.speak(utter);
  } catch {
    // ignore
  }
}

const DOWNTIME_CATALOG = [
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

/**
 * Derive active downtime + alarm holds from log.
 * - Downtime: active if latest DT event is DT_START (no later DT_END)
 * - Alarm: active if latest alarm event is ALARM_RAISE within hold window (and no later ALARM_CLEAR)
 */
function deriveActiveMapsFromLog(log) {
  const activeDowntimeMap = {};
  const activeAlarmMap = {};
  const now = Date.now();

  const list = Array.isArray(log) ? log : []; // newest-first
  for (const n of list) {
    const unitId = n?.unitId;
    if (!unitId) continue;

    const type = n?.eventType || "";
    const ts = n?.tsISO ? Date.parse(n.tsISO) : NaN;

    if (!Object.prototype.hasOwnProperty.call(activeDowntimeMap, unitId)) {
      if (type === EVENT_TYPE.DT_START) {
        activeDowntimeMap[unitId] = {
          startISO: n.tsISO,
          categoryLabel: n.category,
          reasonLabel: n.reason,
        };
      } else if (type === EVENT_TYPE.DT_END) {
        activeDowntimeMap[unitId] = null;
      }
    }

    if (!Object.prototype.hasOwnProperty.call(activeAlarmMap, unitId)) {
      if (type === EVENT_TYPE.ALARM_RAISE) {
        if (Number.isFinite(ts) && now - ts <= ALARM_HOLD_MS) {
          activeAlarmMap[unitId] = { tsISO: n.tsISO, lastAlarmId: n.id, severity: n.severity || SEVERITY.LOW };
        } else {
          activeAlarmMap[unitId] = null;
        }
      } else if (type === EVENT_TYPE.ALARM_CLEAR) {
        activeAlarmMap[unitId] = null;
      }
    }
  }

  Object.keys(activeDowntimeMap).forEach((k) => {
    if (!activeDowntimeMap[k]) delete activeDowntimeMap[k];
  });
  Object.keys(activeAlarmMap).forEach((k) => {
    if (!activeAlarmMap[k]) delete activeAlarmMap[k];
  });

  return { activeDowntimeMap, activeAlarmMap };
}

/* ---------- 3D Label ---------- */

function LabelTag3D({ text, dotColor, active, unitSize, zoomDist }) {
  const groupRef = useRef(null);

  const name = String(text || "UNIT");
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
  const opacity = clamp(0.2 + t * (active ? 0.8 : 0.72), 0.2, 1.0);

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

function AlarmPulse({ w, h, enabled }) {
  const ringRef = useRef(null);

  useFrame((state) => {
    if (!ringRef.current) return;
    if (!enabled) {
      ringRef.current.visible = false;
      return;
    }
    ringRef.current.visible = true;
    const t = state.clock.getElapsedTime();
    const k = 0.88 + (Math.sin(t * 3.2) * 0.5 + 0.5) * 0.22;
    ringRef.current.scale.set(k, 1, k);
    ringRef.current.position.y = 0.08 + (Math.sin(t * 2.6) * 0.5 + 0.5) * 0.02;
  });

  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[Math.max(w, h) * 0.58, Math.max(w, h) * 0.72, 48]} />
      <meshStandardMaterial color={COLOR_YELLOW} transparent opacity={0.32} emissive={COLOR_YELLOW} emissiveIntensity={0.35} />
    </mesh>
  );
}

function UnitBox3D({ unit, isSelected, isHovered, onSelect, onHoverChange, zoomDist, isDowntimeHeld, isAlarmHeld }) {
  const { x, y, w, h } = unit.layout;

  const height = 0.12;
  const borderUp = isSelected ? 0.03 : 0;

  const baseColor = baseLineColor(unit.status);
  const topColor = isDowntimeHeld || isAlarmHeld ? COLOR_YELLOW : baseColor;

  const unitSize = Math.max(w, h);
  const active = isSelected || isHovered || isAlarmHeld;

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
          emissive={isAlarmHeld ? COLOR_YELLOW : isHovered ? "#0ea5e9" : "#000000"}
          emissiveIntensity={isAlarmHeld ? 0.22 : isHovered ? 0.18 : 0}
        />
      </mesh>

      <mesh position={[0, (height + borderUp) / 2 + 0.01, 0]}>
        <boxGeometry args={[w * 0.96, 0.02, h * 0.96]} />
        <meshStandardMaterial color={topColor} transparent opacity={0.94} />
      </mesh>

      <AlarmPulse w={w} h={h} enabled={!!isAlarmHeld && !isDowntimeHeld} />

      <group position={[0, lift, 0]}>
        <LabelTag3D text={unit.name} dotColor={topColor} active={active} unitSize={unitSize} zoomDist={zoomDist} />
      </group>
    </group>
  );
}

function StableControls({ target, isMobile, onControlsReady }) {
  const controlsRef = useRef(null);

  useEffect(() => {
    if (!controlsRef.current) return;
    controlsRef.current.target.set(target[0], target[1], target[2]);
    controlsRef.current.update();
    onControlsReady?.(controlsRef.current);
  }, [target, onControlsReady]);

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
      maxDistance={isMobile ? 36 : 42}
      minDistance={isMobile ? 8.5 : 10}
    />
  );
}

function CadScene({
  units,
  selectedId,
  hoveredId,
  onHoverChange,
  onSelect,
  bounds,
  isMobile,
  onZoomUpdate,
  activeDowntimeMap,
  activeAlarmMap,
  focusUnitId,
  onFocusDone,
}) {
  const target0 = useMemo(() => [bounds.cx, 0, bounds.cy], [bounds.cx, bounds.cy]);
  const { camera } = useThree();

  const controlsRef = useRef(null);
  const zoomDistRef = useRef(18);
  const lastSentRef = useRef(0);

  const focusAnimRef = useRef({
    active: false,
    t: 0,
    dur: 0.65,
    fromTarget: [0, 0, 0],
    toTarget: [0, 0, 0],
    fromCam: [0, 0, 0],
    toCam: [0, 0, 0],
  });

  const onControlsReady = useCallback((c) => {
    controlsRef.current = c;
  }, []);

  const easeInOut = (x) => {
    const t = clamp(x, 0, 1);
    return t * t * (3 - 2 * t);
  };

  useEffect(() => {
    if (!focusUnitId) return;
    const u = units.find((x) => x.id === focusUnitId);
    if (!u) return;
    if (!controlsRef.current) return;

    const tx = u.layout.x + u.layout.w / 2;
    const tz = u.layout.y + u.layout.h / 2;

    const c = controlsRef.current;
    const curT = [c.target.x, c.target.y, c.target.z];
    const curC = [camera.position.x, camera.position.y, camera.position.z];

    const desiredTarget = [tx, 0, tz];
    const desiredCam = [tx, curC[1], tz + 14];

    focusAnimRef.current = {
      active: true,
      t: 0,
      dur: 0.65,
      fromTarget: curT,
      toTarget: desiredTarget,
      fromCam: curC,
      toCam: desiredCam,
    };
  }, [camera.position.x, camera.position.y, camera.position.z, focusUnitId, units]);

  useFrame((state, delta) => {
    const dx = camera.position.x - target0[0];
    const dy = camera.position.y - target0[1];
    const dz = camera.position.z - target0[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    zoomDistRef.current = dist;

    const now = performance.now();
    if (now - lastSentRef.current > 120) {
      lastSentRef.current = now;
      onZoomUpdate(dist);
    }

    const anim = focusAnimRef.current;
    if (anim.active && controlsRef.current) {
      anim.t += delta;
      const k = easeInOut(anim.t / anim.dur);

      const lerp = (a, b) => a + (b - a) * k;

      const nx = lerp(anim.fromTarget[0], anim.toTarget[0]);
      const ny = lerp(anim.fromTarget[1], anim.toTarget[1]);
      const nz = lerp(anim.fromTarget[2], anim.toTarget[2]);

      controlsRef.current.target.set(nx, ny, nz);

      const cx = lerp(anim.fromCam[0], anim.toCam[0]);
      const cy = lerp(anim.fromCam[1], anim.toCam[1]);
      const cz = lerp(anim.fromCam[2], anim.toCam[2]);

      camera.position.set(cx, cy, cz);
      controlsRef.current.update();

      if (anim.t >= anim.dur) {
        anim.active = false;
        onFocusDone?.();
      }
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
          isDowntimeHeld={!!activeDowntimeMap[u.id]}
          isAlarmHeld={!!activeAlarmMap[u.id]}
        />
      ))}

      <StableControls target={target0} isMobile={isMobile} onControlsReady={onControlsReady} />
    </>
  );
}

function CadView({
  units,
  selectedId,
  hoveredId,
  onHoverChange,
  onSelect,
  heightPx,
  isMobile,
  onZoomUpdate,
  activeDowntimeMap,
  activeAlarmMap,
  focusUnitId,
  onFocusDone,
}) {
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

    return { w, h, cx: minX + w / 2, cy: minY + h / 2 };
  }, [units]);

  const headerH = 56;
  const canvasInnerGutter = 10;

  return (
    <Box
      sx={{
        border: `1px solid ${PAGE.border}`,
        background: PAGE.panel2,
        borderRadius: 3,
        overflow: "hidden",
        height: heightPx,
        minHeight: 0,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      }}
    >
      <Box
        sx={{
          height: headerH,
          px: 1.6,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          borderBottom: `1px solid ${PAGE.borderSoft}`,
          bgcolor: "rgba(255,255,255,0.02)",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 900, color: PAGE.text, lineHeight: 1.1 }} noWrap>
            Plant 3 — Live Alarms
          </Typography>
          <Typography sx={{ color: PAGE.subtext, fontSize: 12 }} noWrap>
            Green/Red base • Yellow = alarm/downtime hold
          </Typography>
        </Box>

        <Typography sx={{ color: PAGE.subtext, fontSize: 12, whiteSpace: "nowrap" }}>
          Pan / Zoom / Rotate
        </Typography>
      </Box>

      <Box sx={{ height: `calc(100% - ${headerH}px)`, p: `${canvasInnerGutter}px`, boxSizing: "border-box", minHeight: 0 }}>
        <Box
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            height: "100%",
            border: `1px solid rgba(255,255,255,0.06)`,
            bgcolor: "rgba(0,0,0,0.18)",
          }}
        >
          <Canvas
            style={{ width: "100%", height: "100%" }}
            camera={{ position: [bounds.cx, 7.4, bounds.cy + 14], fov: 45 }}
            dpr={[1, 1.6]}
            onPointerMissed={() => onSelect(null)}
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
              activeDowntimeMap={activeDowntimeMap}
              activeAlarmMap={activeAlarmMap}
              focusUnitId={focusUnitId}
              onFocusDone={onFocusDone}
            />
          </Canvas>
        </Box>
      </Box>
    </Box>
  );
}

function HistoryContent({
  log,
  filteredLog,
  search,
  setSearch,
  sevFilter,
  setSevFilter,
  onClear,
  onResetFilters,
  onClickItem,
  mobileSizing,
}) {
  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <Stack spacing={1.1} sx={{ width: "100%" }}>
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search unit / text / reason"
          fullWidth
          size={mobileSizing ? "medium" : "small"}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon />
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiInputBase-root": {
              bgcolor: "rgba(255,255,255,0.03)",
              borderRadius: 2,
            },
          }}
        />

        <FormControl size={mobileSizing ? "medium" : "small"} sx={{ width: "100%" }}>
          <Select value={sevFilter} onChange={(e) => setSevFilter(e.target.value)}>
            <MenuItem value="ALL">All Severities</MenuItem>
            <MenuItem value={SEVERITY.HIGH}>HIGH</MenuItem>
            <MenuItem value={SEVERITY.MED}>MED</MenuItem>
            <MenuItem value={SEVERITY.LOW}>LOW</MenuItem>
          </Select>
        </FormControl>

        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
          <Button variant="outlined" onClick={onResetFilters} startIcon={<RestartAltRoundedIcon />}>
            Reset
          </Button>
          <Button variant="outlined" color="warning" onClick={onClear}>
            Clear History
          </Button>
        </Stack>
      </Stack>

      <Divider sx={{ my: 1.4, borderColor: PAGE.borderSoft }} />

      {filteredLog.length === 0 ? (
        <Typography sx={{ color: PAGE.subtext, fontSize: mobileSizing ? 14 : 13 }}>
          {log.length === 0 ? "No alarms yet." : "No results for current filters."}
        </Typography>
      ) : (
        <Stack spacing={1.2}>
          {filteredLog.map((n) => (
            <Paper
              key={n.id}
              elevation={0}
              onClick={() => onClickItem(n)}
              sx={{
                p: mobileSizing ? 1.4 : 1.2,
                borderRadius: 3,
                cursor: "pointer",
                bgcolor: "rgba(255,255,255,0.03)",
                border: `1px solid ${PAGE.borderSoft}`,
                transition: "transform 120ms ease, background 120ms ease, border-color 120ms ease",
                "&:hover": {
                  transform: "translateY(-1px)",
                  bgcolor: "rgba(255,255,255,0.045)",
                  borderColor: "rgba(255,255,255,0.12)",
                },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ color: PAGE.text, fontWeight: 900, fontSize: mobileSizing ? 15 : 13 }} noWrap>
                    {n.unitName || "—"}
                  </Typography>
                  <Typography sx={{ color: PAGE.subtext, fontSize: mobileSizing ? 13 : 12 }}>
                    {n.text || "—"}
                  </Typography>

                  <Stack direction="row" spacing={1} sx={{ mt: 0.9, flexWrap: "wrap" }}>
                    {n.category ? <Chip size="small" label={n.category} variant="outlined" sx={{ color: PAGE.muted }} /> : null}
                    {n.reason ? <Chip size="small" label={n.reason} variant="outlined" sx={{ color: PAGE.muted }} /> : null}
                  </Stack>

                  <Typography sx={{ color: PAGE.subtext, fontSize: 11, mt: 0.9 }}>
                    {n.tsISO ? new Date(n.tsISO).toLocaleString() : "—"}
                  </Typography>
                </Box>

                <Chip size="small" label={n.severity || "—"} color={severityChipColor(n.severity)} variant="outlined" />
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}

export default function AlarmsPage() {
  const rawUnits = useMemo(() => getPlant3Units(), []);

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
      return { ...u, layout: { ...u.layout, x: nx, y: ny, w, h } };
    });
  }, [rawUnits]);

  const isMobile = useMediaQuery("(max-width: 900px)");
  const isTablet = useMediaQuery("(min-width: 900px) and (max-width: 1199px)");

  const pad = isMobile ? 12 : isTablet ? 14 : 18;
  const framePad = isMobile ? 10 : isTablet ? 12 : 14;

  const canvasH = isMobile ? 560 : isTablet ? 660 : 700;

  const gridCols = isTablet || isMobile ? "1fr" : "1.28fr 0.72fr";

  const { unread, log, pushAlarm, clearAll, startEngine } = useAlarmCenter();

  useEffect(() => {
    startEngine?.();
  }, [startEngine]);

  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [zoomDist, setZoomDist] = useState(null);

  const [focusUnitId, setFocusUnitId] = useState(null);
  const selectedUnit = useMemo(() => units.find((u) => u.id === selectedId) || null, [units, selectedId]);

  const [dtCategoryCode, setDtCategoryCode] = useState("");
  const [dtReasonCode, setDtReasonCode] = useState("");

  const selectedCategory = useMemo(
    () => DOWNTIME_CATALOG.find((c) => c.code === dtCategoryCode) || null,
    [dtCategoryCode]
  );
  const reasonsForCategory = useMemo(() => selectedCategory?.reasons || [], [selectedCategory]);

  const [ttsEnabled, setTtsEnabled] = useState(true);
  const lastSpokenIdRef = useRef(null);

  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("ALL");

  const [historyOpen, setHistoryOpen] = useState(false);

  const { activeDowntimeMap, activeAlarmMap } = useMemo(() => deriveActiveMapsFromLog(log || []), [log]);
  const activeHoldIds = useMemo(() => Object.keys(activeDowntimeMap), [activeDowntimeMap]);
  const activeAlarmIds = useMemo(() => Object.keys(activeAlarmMap), [activeAlarmMap]);

  // ✅ Only printable items are visible in history (Resume is hidden)
  const printableLog = useMemo(() => {
    return (log || []).filter((n) => PRINTABLE_TYPES.has(String(n?.eventType || "")));
  }, [log]);

  const filteredLog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return printableLog.filter((n) => {
      const sevOk = sevFilter === "ALL" ? true : n.severity === sevFilter;
      const text = `${n.unitName || ""} ${n.text || ""} ${n.category || ""} ${n.reason || ""}`.toLowerCase();
      const qOk = q.length === 0 ? true : text.includes(q);
      return sevOk && qOk;
    });
  }, [printableLog, search, sevFilter]);

  // Warm-up voices list for more reliable selection
  useEffect(() => {
    try {
      window.speechSynthesis?.getVoices?.();
      const h = () => window.speechSynthesis?.getVoices?.();
      window.speechSynthesis?.addEventListener?.("voiceschanged", h);
      return () => window.speechSynthesis?.removeEventListener?.("voiceschanged", h);
    } catch {
      return undefined;
    }
  }, []);

  // ✅ Speak for NEW incoming events (including Resume), but History will NOT show Resume.
  useEffect(() => {
    if (!ttsEnabled) return;

    const top = (log || [])[0];
    if (!top?.id) return;

    if (lastSpokenIdRef.current === top.id) return;
    lastSpokenIdRef.current = top.id;

    const type = String(top.eventType || "");
    const unit = top.unitName || "Unknown unit";
    const cat = top.category || "";
    const reason = top.reason || "";

    if (type === EVENT_TYPE.DT_START) {
      safeSpeak(`Downtime alert. Unit ${unit}. Reason: ${cat}. ${reason}.`, true, {
        preferFemale: true,
        lang: "en-US",
        pitch: 1.05,
      });
      return;
    }

    if (type === EVENT_TYPE.ALARM_RAISE) {
      safeSpeak(`Live alarm. Unit ${unit}. ${cat}. ${reason}.`, true, {
        preferFemale: true,
        lang: "en-US",
        pitch: 1.05,
      });
      return;
    }

    if (type === EVENT_TYPE.DT_END) {
      safeSpeak(`Unit ${unit} resumed.`, true, { preferFemale: true, lang: "en-US", pitch: 1.05 });
      return;
    }

    if (type === EVENT_TYPE.ALARM_CLEAR) {
      safeSpeak(`Alarm cleared. Unit ${unit}.`, true, { preferFemale: true, lang: "en-US", pitch: 1.05 });
    }
  }, [log, ttsEnabled]);

  const openDowntimeDialog = useCallback((unit) => {
    if (!unit) return;
    setSelectedId(unit.id);
    setDtCategoryCode("");
    setDtReasonCode("");
  }, []);

  const applyDowntimeStart = useCallback(
    async ({ unit, category, reason }) => {
      const tsISO = new Date().toISOString();

      postDowntimeStart({
        payload: {
          unitId: unit.id,
          tsISO,
          categoryCode: category.code,
          reasonCode: reason.code,
        },
      });

      const sev =
        category.code === "MAINTENANCE" ? SEVERITY.HIGH : category.code === "QUALITY" ? SEVERITY.MED : SEVERITY.LOW;

      const text = `Downtime — ${category.group}: ${reason.label}`;

      // ✅ push only (speech is handled by "new log entry" effect)
      pushAlarm({
        id: makeId(),
        tsISO,
        unitId: unit.id,
        unitName: unit.name,
        severity: sev,
        category: category.group,
        reason: reason.label,
        text,
        eventType: EVENT_TYPE.DT_START,
      });

      setFocusUnitId(unit.id);

      setSelectedId(null);
      setDtCategoryCode("");
      setDtReasonCode("");
    },
    [pushAlarm]
  );

  const applyDowntimeEnd = useCallback(
    async (unitId) => {
      const unit = units.find((u) => u.id === unitId);
      if (!unit) return;

      postDowntimeEnd({ payload: { unitId, tsISO: new Date().toISOString() } });

      // ✅ push only (speech is handled by "new log entry" effect)
      pushAlarm({
        id: makeId(),
        tsISO: new Date().toISOString(),
        unitId: unit.id,
        unitName: unit.name,
        severity: SEVERITY.LOW,
        category: "Resume",
        reason: "Resume",
        text: "Station resumed (downtime cleared).",
        eventType: EVENT_TYPE.DT_END,
      });
    },
    [pushAlarm, units]
  );

  const applyAlarmResume = useCallback(
    (unitId) => {
      const unit = units.find((u) => u.id === unitId);
      if (!unit) return;

      // ✅ push only (speech is handled by "new log entry" effect)
      pushAlarm({
        id: makeId(),
        tsISO: new Date().toISOString(),
        unitId: unit.id,
        unitName: unit.name,
        severity: SEVERITY.LOW,
        category: "Resume",
        reason: "Alarm Resume",
        text: "Live alarm cleared by operator.",
        eventType: EVENT_TYPE.ALARM_CLEAR,
      });
    },
    [pushAlarm, units]
  );

  // No-confirm: apply downtime start when both selected
  useEffect(() => {
    if (!selectedUnit) return;
    if (!dtCategoryCode || !dtReasonCode) return;

    const category = DOWNTIME_CATALOG.find((c) => c.code === dtCategoryCode) || null;
    const reason = category?.reasons?.find((r) => r.code === dtReasonCode) || null;

    if (!category || !reason) return;

    if (activeDowntimeMap[selectedUnit.id]) {
      safeSpeak(`Unit ${selectedUnit.name} is already in downtime.`, ttsEnabled, { preferFemale: true });
      setSelectedId(null);
      setDtCategoryCode("");
      setDtReasonCode("");
      return;
    }

    applyDowntimeStart({ unit: selectedUnit, category, reason });
  }, [activeDowntimeMap, applyDowntimeStart, dtCategoryCode, dtReasonCode, selectedUnit, ttsEnabled]);

  const frameSx = useMemo(
    () => ({
      minHeight: "100dvh",
      width: "100%",
      bgcolor: PAGE.bg,
      color: PAGE.text,
      boxSizing: "border-box",
      p: `${pad}px`,
      pb: `calc(${pad}px + env(safe-area-inset-bottom, 0px))`,
      pt: `calc(${pad}px + env(safe-area-inset-top, 0px))`,
      overflowX: "hidden",
    }),
    [pad]
  );

  return (
    <Box sx={frameSx}>
      <Box
        sx={{
          width: "100%",
          maxWidth: 1460,
          mx: "auto",
          border: `1px solid ${PAGE.borderSoft}`,
          borderRadius: 4,
          bgcolor: "rgba(255,255,255,0.015)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: `${framePad}px`, boxSizing: "border-box" }}>
          <Box
            sx={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: gridCols,
              gap: `${framePad}px`,
              alignItems: "stretch",
              minHeight: 0,
            }}
          >
            <Box sx={{ minHeight: 0, minWidth: 0 }}>
              <CadView
                units={units}
                selectedId={selectedId}
                hoveredId={hoveredId}
                onHoverChange={setHoveredId}
                onSelect={openDowntimeDialog}
                heightPx={canvasH}
                isMobile={isMobile}
                onZoomUpdate={setZoomDist}
                activeDowntimeMap={activeDowntimeMap}
                activeAlarmMap={activeAlarmMap}
                focusUnitId={focusUnitId}
                onFocusDone={() => setFocusUnitId(null)}
              />

              <Box
                sx={{
                  mt: 1.2,
                  px: 0.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1.2,
                  flexWrap: "wrap",
                  color: PAGE.subtext,
                  fontSize: 12,
                }}
              >
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  <span>Zoom: {zoomDist ? Math.round(zoomDist) : "—"}</span>
                  <span>Units: {units.length}</span>
                  <span>Downtime: {activeHoldIds.length}</span>
                  <span>Live Alarm: {activeAlarmIds.length}</span>
                  <span>Unread: {unread}</span>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                  {isMobile ? (
                    <Tooltip title="Open history" arrow>
                      <IconButton
                        size="small"
                        onClick={() => setHistoryOpen(true)}
                        sx={{
                          color: "rgba(255,255,255,0.78)",
                          border: `1px solid ${PAGE.borderSoft}`,
                          borderRadius: 2,
                          bgcolor: "rgba(255,255,255,0.03)",
                        }}
                      >
                        <HistoryRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}

                  <Tooltip title={ttsEnabled ? "TTS enabled" : "TTS muted"} arrow>
                    <IconButton
                      size="small"
                      onClick={() => setTtsEnabled((v) => !v)}
                      sx={{
                        color: "rgba(255,255,255,0.78)",
                        border: `1px solid ${PAGE.borderSoft}`,
                        borderRadius: 2,
                        bgcolor: "rgba(255,255,255,0.03)",
                      }}
                    >
                      {ttsEnabled ? <VolumeUpRoundedIcon fontSize="small" /> : <VolumeOffRoundedIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Reset filters" arrow>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSearch("");
                        setSevFilter("ALL");
                      }}
                      sx={{
                        color: "rgba(255,255,255,0.78)",
                        border: `1px solid ${PAGE.borderSoft}`,
                        borderRadius: 2,
                        bgcolor: "rgba(255,255,255,0.03)",
                      }}
                    >
                      <RestartAltRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>

              {(activeHoldIds.length || activeAlarmIds.length) ? (
                <Stack
                  direction="row"
                  spacing={1.2}
                  sx={{
                    mt: 1.2,
                    flexWrap: "wrap",
                    "& .MuiButton-root": {
                      minWidth: isMobile ? "100%" : "auto",
                    },
                  }}
                >
                  {activeHoldIds.map((id) => {
                    const u = units.find((x) => x.id === id);
                    return (
                      <Button key={`dt-${id}`} variant="outlined" color="warning" onClick={() => applyDowntimeEnd(id)}>
                        Resume DT {u?.name || id}
                      </Button>
                    );
                  })}

                  {activeAlarmIds.map((id) => {
                    const u = units.find((x) => x.id === id);
                    return (
                      <Button
                        key={`al-${id}`}
                        variant="outlined"
                        color="warning"
                        startIcon={<WarningAmberRoundedIcon />}
                        onClick={() => applyAlarmResume(id)}
                      >
                        Resume Alarm {u?.name || id}
                      </Button>
                    );
                  })}
                </Stack>
              ) : null}
            </Box>

            {!isMobile && !isTablet ? (
              <Box
                sx={{
                  border: `1px solid ${PAGE.border}`,
                  bgcolor: PAGE.panel,
                  borderRadius: 3,
                  overflow: "hidden",
                  minHeight: 0,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
                }}
              >
                <Box sx={{ p: 1.6, borderBottom: `1px solid ${PAGE.borderSoft}`, bgcolor: "rgba(255,255,255,0.02)" }}>
                  <Typography sx={{ fontWeight: 900, fontSize: 14 }}>Alarm / Downtime History</Typography>
                  <Typography sx={{ color: PAGE.subtext, fontSize: 12, mt: 0.4 }}>
                    Click an item to focus the unit. (Resume events are hidden)
                  </Typography>
                </Box>

                <Box sx={{ p: 1.6, overflowY: "auto", minHeight: 0 }}>
                  <HistoryContent
                    log={printableLog}
                    filteredLog={filteredLog}
                    search={search}
                    setSearch={setSearch}
                    sevFilter={sevFilter}
                    setSevFilter={setSevFilter}
                    onClear={clearAll}
                    onResetFilters={() => {
                      setSearch("");
                      setSevFilter("ALL");
                    }}
                    onClickItem={(n) => {
                      if (n?.unitId) setFocusUnitId(n.unitId);
                    }}
                    mobileSizing={false}
                  />
                </Box>
              </Box>
            ) : null}
          </Box>

          {isTablet ? (
            <Box
              sx={{
                mt: `${framePad}px`,
                border: `1px solid ${PAGE.border}`,
                bgcolor: PAGE.panel,
                borderRadius: 3,
                overflow: "hidden",
                boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              }}
            >
              <Box sx={{ p: 1.6, borderBottom: `1px solid ${PAGE.borderSoft}`, bgcolor: "rgba(255,255,255,0.02)" }}>
                <Typography sx={{ fontWeight: 900, fontSize: 14 }}>Alarm / Downtime History</Typography>
                <Typography sx={{ color: PAGE.subtext, fontSize: 12, mt: 0.4 }}>
                  Tap an item to focus the unit. (Resume events are hidden)
                </Typography>
              </Box>
              <Box sx={{ p: 1.6 }}>
                <HistoryContent
                  log={printableLog}
                  filteredLog={filteredLog}
                  search={search}
                  setSearch={setSearch}
                  sevFilter={sevFilter}
                  setSevFilter={setSevFilter}
                  onClear={clearAll}
                  onResetFilters={() => {
                    setSearch("");
                    setSevFilter("ALL");
                  }}
                  onClickItem={(n) => {
                    if (n?.unitId) setFocusUnitId(n.unitId);
                  }}
                  mobileSizing
                />
              </Box>
            </Box>
          ) : null}
        </Box>
      </Box>

      <Drawer
        anchor="bottom"
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: PAGE.panel,
            color: PAGE.text,
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            borderTop: `1px solid ${PAGE.border}`,
            height: "86dvh",
            width: "100%",
            overflow: "hidden",
          },
        }}
      >
        <Box
          sx={{
            p: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            borderBottom: `1px solid ${PAGE.borderSoft}`,
            bgcolor: "rgba(255,255,255,0.02)",
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 900, fontSize: 15 }} noWrap>
              History
            </Typography>
            <Typography sx={{ color: PAGE.subtext, fontSize: 12 }} noWrap>
              Tap an item to focus unit (Resume hidden)
            </Typography>
          </Box>

          <IconButton
            size="small"
            onClick={() => setHistoryOpen(false)}
            sx={{
              color: "rgba(255,255,255,0.8)",
              border: `1px solid ${PAGE.borderSoft}`,
              borderRadius: 2,
              bgcolor: "rgba(255,255,255,0.03)",
            }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ p: 1.5, height: "calc(86dvh - 64px)", overflow: "auto" }}>
          <HistoryContent
            log={printableLog}
            filteredLog={filteredLog}
            search={search}
            setSearch={setSearch}
            sevFilter={sevFilter}
            setSevFilter={setSevFilter}
            onClear={clearAll}
            onResetFilters={() => {
              setSearch("");
              setSevFilter("ALL");
            }}
            onClickItem={(n) => {
              if (n?.unitId) setFocusUnitId(n.unitId);
              setHistoryOpen(false);
            }}
            mobileSizing
          />
        </Box>
      </Drawer>

      <Dialog open={!!selectedUnit} onClose={() => setSelectedId(null)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 900, mb: 1.5 }}>
            Downtime — {selectedUnit?.name || "—"}
          </Typography>

          <Typography sx={{ color: "text.secondary", fontSize: 13, mb: 1 }}>
            Pick category, then reason. Selecting a reason applies immediately.
          </Typography>

          <Divider sx={{ mb: 2 }} />

          <Typography sx={{ fontWeight: 800, fontSize: 13, mb: 1 }}>Category</Typography>
          <Select
            value={dtCategoryCode}
            onChange={(e) => {
              setDtCategoryCode(e.target.value);
              setDtReasonCode("");
            }}
            fullWidth
          >
            {DOWNTIME_CATALOG.map((c) => (
              <MenuItem key={c.code} value={c.code}>
                {c.group}
              </MenuItem>
            ))}
          </Select>

          <Typography sx={{ fontWeight: 800, fontSize: 13, mt: 2, mb: 1 }}>Reason</Typography>
          <Select
            value={dtReasonCode}
            onChange={(e) => setDtReasonCode(e.target.value)}
            fullWidth
            disabled={!dtCategoryCode}
          >
            {reasonsForCategory.map((r) => (
              <MenuItem key={r.code} value={r.code}>
                {r.label}
              </MenuItem>
            ))}
          </Select>

          <Stack direction="row" spacing={1.2} sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={() => setSelectedId(null)} sx={{ flex: 1 }}>
              Close
            </Button>
          </Stack>

          {selectedUnit?.id && activeDowntimeMap[selectedUnit.id] ? (
            <Box sx={{ mt: 1.5, color: "text.secondary", fontSize: 12 }}>
              This unit is already in downtime. Use Resume DT button on the main page.
            </Box>
          ) : null}
        </Box>
      </Dialog>
    </Box>
  );
}