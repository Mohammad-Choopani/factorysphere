import React from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  Divider,
  Button,
  Stack,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  useTheme,
  useMediaQuery,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from "@mui/material";

import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import VideocamIcon from "@mui/icons-material/Videocam";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import FilterAltRoundedIcon from "@mui/icons-material/FilterAltRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import PauseCircleFilledRoundedIcon from "@mui/icons-material/PauseCircleFilledRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import AlarmOnRoundedIcon from "@mui/icons-material/AlarmOnRounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";
import ViewModuleRoundedIcon from "@mui/icons-material/ViewModuleRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import AlternateEmailRoundedIcon from "@mui/icons-material/AlternateEmailRounded";
import InboxRoundedIcon from "@mui/icons-material/InboxRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import DraftsRoundedIcon from "@mui/icons-material/DraftsRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import MarkEmailUnreadRoundedIcon from "@mui/icons-material/MarkEmailUnreadRounded";
import ReplyRoundedIcon from "@mui/icons-material/ReplyRounded";

import { useNavigate } from "react-router-dom";
import { PAGE_PERMISSIONS } from "../utils/permissions";
import {
  getPlant3Units,
  getCurrentShiftKey,
  getCurrentShiftLabel,
} from "../data/mock/plant3.units.mock";

const UI = {
  rCard: 4,
  rInner: 3,
  padCard: { xs: 1.5, sm: 1.9 },
  gap: { xs: 1.2, sm: 2 },
};

const USER_DIRECTORY = [
  { email: "plant.manager@factorysphere.dev", role: "PlantManager", label: "Plant Manager" },
  { email: "production.manager@factorysphere.dev", role: "ProductionManager", label: "Production Manager" },
  { email: "maintenance.manager@factorysphere.dev", role: "MaintenanceManager", label: "Maintenance Manager" },
  { email: "quality.manager@factorysphere.dev", role: "QualityManager", label: "Quality Manager" },
  { email: "engineering.manager@factorysphere.dev", role: "EngineeringManager", label: "Engineering Manager" },
  { email: "supervisor@factorysphere.dev", role: "Supervisor", label: "Supervisor" },
  { email: "teamleader@factorysphere.dev", role: "TeamLeader", label: "Team Leader" },
];

function getShiftRange(shiftKey) {
  if (shiftKey === "A") return "22:00–06:00";
  if (shiftKey === "B") return "06:00–14:00";
  return "14:00–22:00";
}

function canAccess(role, pageKey) {
  const allowed = PAGE_PERMISSIONS?.[pageKey] || [];
  return allowed.includes(role);
}

function resolveUserLabel(email, fallbackRole) {
  const found = USER_DIRECTORY.find((u) => u.email === email);
  return found ? found.label : fallbackRole || email;
}

function canSeeMessage(message, currentEmail) {
  if (message.recipientMode === "all") return true;
  return message.senderEmail === currentEmail || message.recipientEmail === currentEmail;
}

function getRuntimeStatus(unit) {
  return unit?.status || unit?.runtime?.status || unit?.mock?.status || "DOWN";
}

function formatUnitCounts(units) {
  const running = units.filter((u) => getRuntimeStatus(u) === "RUNNING").length;
  const attention = units.filter((u) => getRuntimeStatus(u) === "ATTN").length;
  const down = units.filter((u) => getRuntimeStatus(u) === "DOWN").length;
  return { running, attention, down };
}

function SafeIconSlot({ children, sx }) {
  return (
    <Box
      sx={{
        width: 48,
        height: 48,
        minWidth: 48,
        minHeight: 48,
        borderRadius: 3,
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        boxSizing: "border-box",
        p: 0,
        background: "linear-gradient(180deg, rgba(124,92,255,0.16), rgba(124,92,255,0.08))",
        border: "1px solid rgba(124,92,255,0.24)",
        flexShrink: 0,
        "& svg": {
          fontSize: 19,
          flexShrink: 0,
          display: "block",
        },
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

function EllipChip({ label, sx }) {
  return (
    <Chip
      size="small"
      label={label}
      sx={{
        height: 30,
        maxWidth: 180,
        borderRadius: 999,
        fontWeight: 900,
        overflow: "hidden",
        boxSizing: "border-box",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.08)",
        "& .MuiChip-label": {
          px: 1.35,
          py: 0,
          lineHeight: "30px",
          display: "block",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        },
        ...sx,
      }}
    />
  );
}

function GridInset({ children, sx }) {
  return (
    <Box
      sx={{
        px: { xs: 0.8, sm: 0.3, md: 0 },
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

function CardShell({ children, sx, onClick, role = "region" }) {
  return (
    <Paper
      role={role}
      onClick={onClick}
      sx={{
        p: UI.padCard,
        borderRadius: UI.rCard,
        height: "100%",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        minWidth: 0,
        background: "rgba(8,12,24,0.68)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 14px 40px rgba(0,0,0,0.22)",
        transition: "transform .16s ease, border-color .16s ease, background .16s ease",
        ...(onClick
          ? {
              cursor: "pointer",
              "&:hover": {
                transform: { xs: "none", md: "translateY(-1px)" },
                borderColor: "rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.035)",
              },
              "&:active": { transform: "translateY(0px) scale(0.995)" },
            }
          : null),
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}

function SectionHeader({ icon, title, rightChip }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ gap: 1.2, minWidth: 0, pb: 0.6, pt: 0.2 }}
    >
      <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
        <SafeIconSlot>{icon}</SafeIconSlot>
        <Typography
          sx={{
            fontWeight: 950,
            minWidth: 0,
            flex: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.2,
          }}
        >
          {title}
        </Typography>
      </Stack>

      {rightChip ? (
        <EllipChip
          label={rightChip}
          sx={{
            flexShrink: 0,
            maxWidth: { xs: 96, sm: 150 },
          }}
        />
      ) : null}
    </Stack>
  );
}

function MessagePanelShell({ icon, title, rightChip, children, sx }) {
  return (
    <CardShell
      sx={{
        p: { xs: 1.35, sm: 1.55, md: 1.65 },
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.038), rgba(255,255,255,0.018)), rgba(8,12,24,0.72)",
        ...sx,
      }}
    >
      <SectionHeader icon={icon} title={title} rightChip={rightChip} />
      <Divider sx={{ mt: 1.1, mb: 1.15, borderColor: "rgba(255,255,255,0.08)", flexShrink: 0 }} />

      <Box
        sx={{
          minWidth: 0,
          minHeight: 0,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {children}
      </Box>
    </CardShell>
  );
}

function MessageSectionCard({ title, subtitle, children, sx }) {
  return (
    <Paper
      sx={{
        p: { xs: 1.3, sm: 1.45 },
        borderRadius: 3.2,
        background: "linear-gradient(180deg, rgba(255,255,255,0.032), rgba(255,255,255,0.02))",
        border: "1px solid rgba(255,255,255,0.08)",
        overflow: "hidden",
        boxSizing: "border-box",
        minWidth: 0,
        ...sx,
      }}
    >
      <Box sx={{ mb: 1.1, minWidth: 0, pl: 0.2 }}>
        <Typography
          sx={{
            fontWeight: 950,
            lineHeight: 1.2,
            minWidth: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </Typography>

        {subtitle ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              mt: 0.4,
              lineHeight: 1.35,
              minWidth: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {subtitle}
          </Typography>
        ) : null}
      </Box>

      <Box sx={{ minWidth: 0 }}>{children}</Box>
    </Paper>
  );
}

function StatPill({ icon, label, value, sx }) {
  return (
    <Paper
      sx={{
        p: 1.2,
        borderRadius: UI.rInner,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        overflow: "hidden",
        minHeight: 68,
        height: "100%",
        minWidth: 0,
        transition: "transform .14s ease, border-color .14s ease, background .14s ease",
        "&:hover": {
          transform: { xs: "none", md: "translateY(-1px)" },
          borderColor: "rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.04)",
        },
        ...sx,
      }}
    >
      <SafeIconSlot>{icon}</SafeIconSlot>
      <Box sx={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "block",
            fontWeight: 900,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontWeight: 950,
            lineHeight: 1.1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {value}
        </Typography>
      </Box>
    </Paper>
  );
}

function ModuleRow({ icon, title, subtitle, badge, onClick }) {
  return (
    <CardShell
      onClick={onClick}
      role="button"
      sx={{
        p: 1.25,
        pr: 1.45,
        width: "100%",
        borderRadius: UI.rInner,
        background: "rgba(255,255,255,0.03)",
        display: "flex",
        alignItems: "center",
        gap: 1.2,
        minHeight: 78,
        minWidth: 0,
        "&:hover": {
          transform: { xs: "none", md: "translateY(-1px)" },
          borderColor: "rgba(124,92,255,0.28)",
          background: "rgba(124,92,255,0.05)",
        },
      }}
    >
      <SafeIconSlot>{icon}</SafeIconSlot>

      <Box sx={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 900,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.15,
              minWidth: 0,
              flex: 1,
            }}
          >
            {title}
          </Typography>
          {badge ? <EllipChip label={badge} sx={{ maxWidth: 90, flexShrink: 0 }} /> : null}
        </Stack>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "block",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {subtitle}
        </Typography>
      </Box>

      <ArrowForwardRoundedIcon style={{ opacity: 0.65, flexShrink: 0 }} />
    </CardShell>
  );
}

function SimpleList({ title, rows, rightBadge, icon, minRows = 5 }) {
  const padCount = Math.max(0, minRows - rows.length);

  return (
    <CardShell sx={{ display: "flex", flexDirection: "column", minHeight: 260 }}>
      <SectionHeader icon={icon} title={title} rightChip={rightBadge} />
      <Divider sx={{ mt: 1.2, mb: 1.2 }} />

      <Box sx={{ display: "grid", gap: 1, flex: 1, minHeight: 0 }}>
        {rows.map((r) => (
          <Paper
            key={r.id}
            sx={{
              p: 1.1,
              borderRadius: UI.rInner,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.2,
              overflow: "hidden",
              minHeight: 58,
              minWidth: 0,
            }}
          >
            <Box sx={{ minWidth: 0, overflow: "hidden", flex: 1 }}>
              <Typography
                sx={{
                  fontWeight: 900,
                  lineHeight: 1.15,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {r.title}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "block",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {r.sub}
              </Typography>
            </Box>

            <EllipChip label={r.badge} sx={{ maxWidth: 96, flexShrink: 0 }} />
          </Paper>
        ))}

        {Array.from({ length: padCount }).map((_, idx) => (
          <Box key={`pad-${idx}`} sx={{ height: 58, opacity: 0, pointerEvents: "none" }} />
        ))}

        {rows.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            No items.
          </Typography>
        )}
      </Box>
    </CardShell>
  );
}

function MessageInfoPill({ icon, label, value, sx }) {
  return (
    <Paper
      sx={{
        p: 1.05,
        borderRadius: 3,
        background: "rgba(255,255,255,0.035)",
        border: "1px solid rgba(255,255,255,0.08)",
        minWidth: 0,
        overflow: "hidden",
        boxSizing: "border-box",
        height: "100%",
        ...sx,
      }}
    >
      <Stack direction="row" spacing={1.1} alignItems="center" sx={{ minWidth: 0 }}>
        <SafeIconSlot
          sx={{
            width: 40,
            height: 40,
            minWidth: 40,
            minHeight: 40,
            borderRadius: 2.5,
            p: 0,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.09)",
            "& svg": { fontSize: 16 },
          }}
        >
          {icon}
        </SafeIconSlot>

        <Box sx={{ minWidth: 0, flex: 1, pl: 0.1 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              lineHeight: 1.1,
              fontWeight: 800,
              minWidth: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {label}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 900,
              lineHeight: 1.2,
              mt: 0.28,
              minWidth: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {value}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

function ModuleStyleMailRow({ message, onClick, active = false }) {
  const senderLabel = resolveUserLabel(message.senderEmail, message.senderRole);
  const subLine = message.isSender
    ? `To ${message.recipientMode === "all" ? "All Users" : message.recipientLabel}`
    : `From ${senderLabel}`;

  return (
    <CardShell
      onClick={onClick}
      role="button"
      sx={{
        p: { xs: 1.35, sm: 1.45 },
        width: "100%",
        borderRadius: 4,
        background: active ? "rgba(124,92,255,0.08)" : "rgba(255,255,255,0.03)",
        border: active ? "1px solid rgba(124,92,255,0.28)" : "1px solid rgba(255,255,255,0.08)",
        display: "grid",
        gridTemplateColumns: { xs: "auto minmax(0,1fr)", sm: "auto minmax(0,1fr) auto" },
        alignItems: "center",
        gap: 1.25,
        minHeight: { xs: 120, sm: 128 },
        minWidth: 0,
      }}
    >
      <SafeIconSlot
        sx={{
          background:
            message.recipientMode === "all"
              ? "rgba(45,226,230,0.10)"
              : "rgba(124,92,255,0.12)",
          border:
            message.recipientMode === "all"
              ? "1px solid rgba(45,226,230,0.22)"
              : "1px solid rgba(124,92,255,0.24)",
        }}
      >
        {message.recipientMode === "all" ? <ForumRoundedIcon /> : <DraftsRoundedIcon />}
      </SafeIconSlot>

      <Box sx={{ minWidth: 0, overflow: "hidden", pl: 0.1 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ minWidth: 0 }}
        >
          <Typography
            sx={{
              fontWeight: message.unread ? 950 : 900,
              lineHeight: 1.15,
              minWidth: 0,
              flex: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {message.subject}
          </Typography>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              flexShrink: 0,
              fontWeight: 800,
              whiteSpace: "nowrap",
              display: { xs: "none", sm: "block" },
              pl: 1,
            }}
          >
            {message.time}
          </Typography>
        </Stack>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "block",
            mt: 0.42,
            fontWeight: 700,
            minWidth: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {subLine}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 0.75,
            minWidth: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {message.preview}
        </Typography>

        <Stack
          direction="row"
          spacing={0.75}
          sx={{
            mt: 1,
            display: { xs: "flex", sm: "none" },
            flexWrap: "wrap",
            rowGap: 0.75,
          }}
        >
          <EllipChip
            label={message.recipientMode === "all" ? "Broadcast" : "Direct"}
            sx={{
              maxWidth: 94,
              background:
                message.recipientMode === "all"
                  ? "rgba(45,226,230,0.08)"
                  : "rgba(124,92,255,0.12)",
              border:
                message.recipientMode === "all"
                  ? "1px solid rgba(45,226,230,0.22)"
                  : "1px solid rgba(124,92,255,0.22)",
            }}
          />
          {message.unread ? <EllipChip label="Unread" sx={{ maxWidth: 80 }} /> : null}
          {message.attachmentName ? <EllipChip label="File" sx={{ maxWidth: 64 }} /> : null}
        </Stack>
      </Box>

      <Stack
        spacing={0.7}
        alignItems="flex-end"
        sx={{
          flexShrink: 0,
          minWidth: 0,
          display: { xs: "none", sm: "flex" },
          pl: 1,
        }}
      >
        <EllipChip
          label={message.recipientMode === "all" ? "Broadcast" : "Direct"}
          sx={{
            maxWidth: 100,
            background:
              message.recipientMode === "all"
                ? "rgba(45,226,230,0.08)"
                : "rgba(124,92,255,0.12)",
            border:
              message.recipientMode === "all"
                ? "1px solid rgba(45,226,230,0.22)"
                : "1px solid rgba(124,92,255,0.22)",
          }}
        />

        {message.unread ? (
          <EllipChip
            label="Unread"
            sx={{
              maxWidth: 84,
              background: "rgba(124,92,255,0.12)",
              border: "1px solid rgba(124,92,255,0.24)",
            }}
          />
        ) : null}

        {message.attachmentName ? (
          <EllipChip
            label="File"
            sx={{
              maxWidth: 74,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          />
        ) : null}
      </Stack>
    </CardShell>
  );
}

function ModuleStyleAttachmentRow({ fileName }) {
  return (
    <Paper
      sx={{
        p: 1.2,
        borderRadius: UI.rInner,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        display: "grid",
        gridTemplateColumns: "auto minmax(0,1fr) auto",
        alignItems: "center",
        gap: 1.15,
        minHeight: 74,
        minWidth: 0,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <SafeIconSlot
        sx={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <DescriptionRoundedIcon />
      </SafeIconSlot>

      <Box sx={{ minWidth: 0, overflow: "hidden", pl: 0.1 }}>
        <Typography
          sx={{
            fontWeight: 900,
            lineHeight: 1.15,
            minWidth: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {fileName || "No attachment selected"}
        </Typography>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "block",
            mt: 0.28,
            minWidth: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {fileName ? "Attachment ready to send" : "Optional supporting document"}
        </Typography>
      </Box>

      <EllipChip label={fileName ? "Ready" : "Empty"} sx={{ maxWidth: 82, flexShrink: 0 }} />
    </Paper>
  );
}

function EmptyInboxState() {
  return (
    <Paper
      sx={{
        p: 2.3,
        borderRadius: 3.2,
        background: "linear-gradient(180deg, rgba(255,255,255,0.028), rgba(255,255,255,0.018))",
        border: "1px solid rgba(255,255,255,0.08)",
        textAlign: "center",
        overflow: "hidden",
        minHeight: 230,
        display: "grid",
        placeItems: "center",
      }}
    >
      <Stack spacing={1.15} alignItems="center" sx={{ maxWidth: 300 }}>
        <SafeIconSlot
          sx={{
            width: 56,
            height: 56,
            minWidth: 56,
            minHeight: 56,
            borderRadius: 3.1,
            "& svg": { fontSize: 24 },
          }}
        >
          <InboxRoundedIcon />
        </SafeIconSlot>

        <Typography sx={{ fontWeight: 950 }}>No messages yet</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
          New operational messages will appear here. Use compose to send a plant-wide broadcast or a direct message.
        </Typography>
      </Stack>
    </Paper>
  );
}

function fieldSx(multiline = false) {
  return {
    "& .MuiOutlinedInput-root": {
      borderRadius: 3.1,
      minHeight: multiline ? undefined : 50,
      alignItems: multiline ? "flex-start" : "center",
      background: "rgba(255,255,255,0.03)",
      overflow: "hidden",
      boxSizing: "border-box",
      "& .MuiOutlinedInput-input": {
        px: 1.8,
        py: multiline ? 1.6 : 1.45,
      },
      "& .MuiOutlinedInput-inputMultiline": {
        px: 1.8,
        py: 1.6,
      },
      "& .MuiSelect-select": {
        px: 1.8,
        py: 1.45,
      },
    },
    "& .MuiInputLabel-root": {
      maxWidth: "calc(100% - 28px)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      left: 4,
    },
  };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));
  const isSmDown = useMediaQuery(theme.breakpoints.down("sm"));

  const role = localStorage.getItem("role") || "PlantManager";
  const email = localStorage.getItem("userEmail") || "plant.manager@factorysphere.dev";

  const shiftKey = getCurrentShiftKey();
  const shiftLabel = getCurrentShiftLabel();
  const shiftRange = getShiftRange(shiftKey);

  const plantUnits = React.useMemo(() => getPlant3Units(), []);
  const deviceSummary = React.useMemo(() => formatUnitCounts(plantUnits), [plantUnits]);

  const [query, setQuery] = React.useState("");
  const [messagesOpen, setMessagesOpen] = React.useState(false);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [mobileMessageTab, setMobileMessageTab] = React.useState("inbox");

  const [recipientMode, setRecipientMode] = React.useState("all");
  const [recipientEmail, setRecipientEmail] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [messageBody, setMessageBody] = React.useState("");
  const [selectedFile, setSelectedFile] = React.useState(null);

  const [messages, setMessages] = React.useState([
    {
      id: "m1",
      subject: "Shift Handover Summary",
      preview: "Production handover updated for the active shift.",
      body:
        "Production handover has been updated for the active shift. Please review the latest operating notes, expected focus areas, and line-level coordination items.",
      senderEmail: "plant.manager@factorysphere.dev",
      senderRole: "PlantManager",
      recipientMode: "all",
      recipientEmail: "",
      recipientLabel: "All Users",
      time: "08:42",
      unreadBy: [
        "maintenance.manager@factorysphere.dev",
        "quality.manager@factorysphere.dev",
        "engineering.manager@factorysphere.dev",
      ],
      attachmentName: "",
    },
    {
      id: "m2",
      subject: "Maintenance Review Required",
      preview: "Please review repeated stop condition before noon.",
      body:
        "Please review the repeated stop condition on the affected unit before noon and coordinate your feedback with operations leadership.",
      senderEmail: "plant.manager@factorysphere.dev",
      senderRole: "PlantManager",
      recipientMode: "direct",
      recipientEmail: "maintenance.manager@factorysphere.dev",
      recipientLabel: "Maintenance Manager",
      time: "09:10",
      unreadBy: ["maintenance.manager@factorysphere.dev"],
      attachmentName: "fault_snapshot.pdf",
    },
    {
      id: "m3",
      subject: "Quality Follow-up",
      preview: "Temporary review requested for suspect output.",
      body:
        "Temporary review requested for suspect output. Please validate the current batch and confirm the next decision after inspection review.",
      senderEmail: "quality.manager@factorysphere.dev",
      senderRole: "QualityManager",
      recipientMode: "direct",
      recipientEmail: "plant.manager@factorysphere.dev",
      recipientLabel: "Plant Manager",
      time: "09:38",
      unreadBy: ["plant.manager@factorysphere.dev"],
      attachmentName: "",
    },
  ]);

  const availableRecipients = React.useMemo(() => {
    const list = USER_DIRECTORY.filter((u) => u.email !== email);
    if (!list.length) return [{ email: "user@factorysphere.dev", role: "User", label: "Factory User" }];
    return list;
  }, [email]);

  React.useEffect(() => {
    if (recipientMode === "direct" && !recipientEmail && availableRecipients.length > 0) {
      setRecipientEmail(availableRecipients[0].email);
    }
  }, [recipientMode, recipientEmail, availableRecipients]);

  const visibleMessages = React.useMemo(() => {
    return messages
      .filter((msg) => canSeeMessage(msg, email))
      .map((msg) => ({
        ...msg,
        isSender: msg.senderEmail === email,
        unread: msg.unreadBy.includes(email),
      }));
  }, [messages, email]);

  const unreadCount = React.useMemo(() => visibleMessages.filter((m) => m.unread).length, [visibleMessages]);
  const directCount = React.useMemo(() => visibleMessages.filter((m) => m.recipientMode === "direct").length, [visibleMessages]);
  const broadcastCount = React.useMemo(() => visibleMessages.filter((m) => m.recipientMode === "all").length, [visibleMessages]);

  const [selectedMessageId, setSelectedMessageId] = React.useState(null);

  React.useEffect(() => {
    if (!visibleMessages.length) {
      setSelectedMessageId(null);
      return;
    }
    const exists = visibleMessages.some((m) => m.id === selectedMessageId);
    if (!exists) setSelectedMessageId(visibleMessages[0].id);
  }, [visibleMessages, selectedMessageId]);

  const selectedMessage = React.useMemo(
    () => visibleMessages.find((m) => m.id === selectedMessageId) || null,
    [visibleMessages, selectedMessageId]
  );

  const modules = React.useMemo(() => {
    const list = [
      {
        key: "dashboard",
        label: "Dashboard",
        desc: "Plant command center overview",
        path: "/dashboard",
        icon: <ViewModuleRoundedIcon />,
        badge: "HOME",
      },
      {
        key: "devices",
        label: "Stations & Devices",
        desc: "Digital Twin layout and unit monitoring",
        path: "/devices",
        icon: <PrecisionManufacturingIcon />,
        badge: "TWIN",
      },
      {
        key: "production",
        label: "Production",
        desc: "Shift output, line performance, and live production status",
        path: "/production",
        icon: <TrendingUpRoundedIcon />,
        badge: "NEW",
      },
      {
        key: "components",
        label: "Components",
        desc: "Component flow, usage, and part-level tracking",
        path: "/components",
        icon: <BuildCircleIcon />,
        badge: "NEW",
      },
      {
        key: "inventory",
        label: "Inventory",
        desc: "Stock visibility, material availability, and warehouse balance",
        path: "/inventory",
        icon: <AssessmentRoundedIcon />,
        badge: "SOON",
      },
      {
        key: "alarms",
        label: "Live Alarms",
        desc: "Alert stream and event monitoring",
        path: "/alarms",
        icon: <NotificationsActiveIcon />,
        badge: "LIVE",
      },
      {
        key: "downtime",
        label: "Downtime & Maintenance",
        desc: "Downtime reasons, categories, and maintenance visibility",
        path: "/downtime",
        icon: <TimerRoundedIcon />,
        badge: "OPS",
      },
      {
        key: "analytics",
        label: "Analytics",
        desc: "KPI, OEE, trends, and executive insights",
        path: "/analytics",
        icon: <AnalyticsIcon />,
        badge: "KPI",
      },
      {
        key: "cameras",
        label: "Cameras",
        desc: "Camera feeds and visual station monitoring",
        path: "/cameras",
        icon: <VideocamIcon />,
        badge: "VIEW",
      },
      {
        key: "reports",
        label: "Reports",
        desc: "Reports, exports, and operational summaries",
        path: "/reports",
        icon: <AssessmentRoundedIcon />,
        badge: "DOCS",
      },
    ];

    const allowed = list.filter((m) => (m.key === "dashboard" ? true : canAccess(role, m.key)));
    const q = query.trim().toLowerCase();
    if (!q) return allowed;

    return allowed.filter((m) => `${m.label} ${m.desc}`.toLowerCase().includes(q));
  }, [role, query]);

  const primaryCta = React.useMemo(() => {
    if (canAccess(role, "devices")) return { label: "Open Digital Twin", path: "/devices" };
    if (canAccess(role, "production")) return { label: "Open Production", path: "/production" };
    if (canAccess(role, "alarms")) return { label: "View Alarms", path: "/alarms" };
    if (canAccess(role, "downtime")) return { label: "Open Downtime", path: "/downtime" };
    return { label: "Dashboard", path: "/dashboard" };
  }, [role]);

  const topAlarms = React.useMemo(
    () => [
      { id: "a1", title: "DT-FRT-01 • Safety Gate", sub: "Zone 2 • 2 min ago", badge: "HIGH" },
      { id: "a2", title: "C1UL-SPOILER • Sensor Fault", sub: "Line 1 • 6 min ago", badge: "MED" },
      { id: "a3", title: "WINDSHIELD • Robot Pause", sub: "Cell 4 • 11 min ago", badge: "LOW" },
      { id: "a4", title: "DT-RR-02 • E-Stop", sub: "Zone 1 • 18 min ago", badge: "HIGH" },
      { id: "a5", title: "PACK-03 • Jam Detected", sub: "Endline • 22 min ago", badge: "MED" },
    ],
    []
  );

  const topDowntime = React.useMemo(
    () => [
      { id: "d1", title: "Changeover", sub: `${shiftLabel}`, badge: "PLANNED" },
      { id: "d2", title: "Waiting Components", sub: "9 min • Line 2", badge: "SUPPLY" },
      { id: "d3", title: "Quality Check", sub: "6 min • Station 7", badge: "QC" },
      { id: "d4", title: "Maintenance", sub: "4 min • Robot Cell", badge: "MAINT" },
      { id: "d5", title: "Meeting/Break", sub: "1 min • Floor", badge: "SHIFT" },
    ],
    [shiftLabel]
  );

  const handleOpenMessages = () => {
    setMobileMessageTab("inbox");
    setMessagesOpen(true);
  };

  const handleCloseMessages = () => setMessagesOpen(false);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleOpenMessage = (id) => {
    setSelectedMessageId(id);
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id
          ? {
              ...msg,
              unreadBy: msg.unreadBy.filter((mail) => mail !== email),
            }
          : msg
      )
    );
    setDetailOpen(true);
  };

  const handleDeleteSelected = () => {
    if (!selectedMessage) return;
    setMessages((prev) => prev.filter((msg) => msg.id !== selectedMessage.id));
    setDetailOpen(false);
  };

  const handleReplyFromDetail = () => {
    if (!selectedMessage || selectedMessage.recipientMode !== "direct") return;
    setRecipientMode("direct");
    setRecipientEmail(selectedMessage.senderEmail);
    setSubject(`Re: ${selectedMessage.subject}`);
    setMessageBody("");
    setDetailOpen(false);
    setMobileMessageTab("compose");
    setMessagesOpen(true);
  };

  const handleMarkUnread = () => {
    if (!selectedMessage) return;
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === selectedMessage.id
          ? {
              ...msg,
              unreadBy: msg.unreadBy.includes(email) ? msg.unreadBy : [...msg.unreadBy, email],
            }
          : msg
      )
    );
    setDetailOpen(false);
  };

  const handleSend = () => {
    const trimmedSubject = subject.trim();
    const trimmedBody = messageBody.trim();

    if (!trimmedSubject || !trimmedBody) return;
    if (recipientMode === "direct" && !recipientEmail) return;

    const recipientInfo = availableRecipients.find((u) => u.email === recipientEmail);

    const nextMessage = {
      id: `m-${Date.now()}`,
      subject: trimmedSubject,
      preview: trimmedBody,
      body: trimmedBody,
      senderEmail: email,
      senderRole: role,
      recipientMode,
      recipientEmail: recipientMode === "all" ? "" : recipientEmail,
      recipientLabel: recipientMode === "all" ? "All Users" : recipientInfo?.label || recipientEmail,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      unreadBy: recipientMode === "all" ? [] : [recipientEmail],
      attachmentName: selectedFile?.name || "",
    };

    setMessages((prev) => [nextMessage, ...prev]);
    setSelectedMessageId(nextMessage.id);
    setSubject("");
    setMessageBody("");
    setRecipientMode("all");
    setRecipientEmail(availableRecipients[0]?.email || "");
    setSelectedFile(null);

    if (isSmDown) setMobileMessageTab("inbox");
  };

  const renderComposePanel = () => (
    <MessagePanelShell icon={<EditRoundedIcon />} title="Compose" rightChip="New Message">
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          pr: 0.45,
          pb: 0.15,
          scrollbarGutter: "stable",
          "&::-webkit-scrollbar": { width: 8 },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(255,255,255,0.12)",
            borderRadius: 999,
          },
        }}
      >
        <Stack spacing={1.15} sx={{ minWidth: 0 }}>
          <MessageSectionCard title="Delivery" subtitle="Choose audience and visibility">
            <Stack spacing={1.1}>
              <Box
                sx={{
                  display: "grid",
                  gap: 1,
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: recipientMode === "direct" ? "1fr 1fr" : "1fr",
                  },
                }}
              >
                <FormControl fullWidth size="small" sx={fieldSx()}>
                  <InputLabel id="recipient-mode-label">Recipient Mode</InputLabel>
                  <Select
                    labelId="recipient-mode-label"
                    value={recipientMode}
                    label="Recipient Mode"
                    onChange={(e) => setRecipientMode(e.target.value)}
                  >
                    <MenuItem value="all">Send to All</MenuItem>
                    <MenuItem value="direct">Send to Specific User</MenuItem>
                  </Select>
                </FormControl>

                {recipientMode === "direct" ? (
                  <FormControl fullWidth size="small" sx={fieldSx()}>
                    <InputLabel id="recipient-user-label">User</InputLabel>
                    <Select
                      labelId="recipient-user-label"
                      value={recipientEmail}
                      label="User"
                      onChange={(e) => setRecipientEmail(e.target.value)}
                    >
                      {availableRecipients.map((u) => (
                        <MenuItem key={u.email} value={u.email}>
                          {u.label} — {u.role}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : null}
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gap: 1,
                  gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) auto" },
                  alignItems: "stretch",
                }}
              >
                <MessageInfoPill
                  icon={recipientMode === "all" ? <PublicRoundedIcon /> : <PersonRoundedIcon />}
                  label="Audience"
                  value={
                    recipientMode === "all"
                      ? "All Users"
                      : availableRecipients.find((u) => u.email === recipientEmail)?.label || "Selected User"
                  }
                />

                <EllipChip
                  label={recipientMode === "all" ? "Broadcast" : "Direct"}
                  sx={{
                    alignSelf: { xs: "flex-start", sm: "center" },
                    maxWidth: 110,
                    background:
                      recipientMode === "all"
                        ? "rgba(45,226,230,0.08)"
                        : "rgba(124,92,255,0.12)",
                    border:
                      recipientMode === "all"
                        ? "1px solid rgba(45,226,230,0.22)"
                        : "1px solid rgba(124,92,255,0.22)",
                  }}
                />
              </Box>
            </Stack>
          </MessageSectionCard>

          <MessageSectionCard title="Content" subtitle="Write a clear operational message">
            <Stack spacing={1.1}>
              <TextField
                fullWidth
                size="small"
                label="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter subject"
                inputProps={{ maxLength: 140 }}
                sx={fieldSx()}
              />

              <TextField
                fullWidth
                multiline
                minRows={isSmDown ? 5 : 6}
                maxRows={isSmDown ? 8 : 10}
                label="Message"
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Write your message..."
                inputProps={{ maxLength: 1200 }}
                sx={fieldSx(true)}
              />
            </Stack>
          </MessageSectionCard>

          <MessageSectionCard title="Attachment" subtitle="Optional supporting file">
            <Stack spacing={1.1}>
              <Button
                component="label"
                variant="outlined"
                startIcon={<AttachFileRoundedIcon />}
                sx={{
                  justifyContent: "flex-start",
                  minWidth: 0,
                  minHeight: 48,
                  width: "100%",
                  borderRadius: 3.1,
                  overflow: "hidden",
                  textTransform: "none",
                  px: 1.2,
                  "& .MuiButton-startIcon": {
                    flexShrink: 0,
                    mr: 1,
                  },
                }}
              >
                <Box
                  component="span"
                  sx={{
                    display: "block",
                    minWidth: 0,
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textAlign: "left",
                  }}
                >
                  {selectedFile ? "Change Attachment" : "Upload Attachment"}
                </Box>
                <input hidden type="file" onChange={handleFileChange} />
              </Button>

              <ModuleStyleAttachmentRow fileName={selectedFile?.name || ""} />
            </Stack>
          </MessageSectionCard>
        </Stack>
      </Box>
    </MessagePanelShell>
  );

  const renderInboxPanel = () => (
    <MessagePanelShell icon={<InboxRoundedIcon />} title="Inbox" rightChip={`${visibleMessages.length} Items`}>
      <Box
        sx={{
          display: "grid",
          gap: 1,
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
          minWidth: 0,
          flexShrink: 0,
          pb: 1.05,
        }}
      >
        <MessageInfoPill icon={<MailOutlineRoundedIcon />} label="Unread" value={String(unreadCount)} />
        <MessageInfoPill icon={<ForumRoundedIcon />} label="Broadcast" value={String(broadcastCount)} />
        <MessageInfoPill icon={<DraftsRoundedIcon />} label="Direct" value={String(directCount)} />
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 1.05,
          minWidth: 0,
          minHeight: 0,
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          pr: 0.45,
          pb: 0.15,
          alignContent: "start",
          scrollbarGutter: "stable",
          "&::-webkit-scrollbar": { width: 8 },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(255,255,255,0.12)",
            borderRadius: 999,
          },
        }}
      >
        {visibleMessages.length > 0 ? (
          visibleMessages.map((msg) => (
            <ModuleStyleMailRow
              key={msg.id}
              message={msg}
              active={selectedMessageId === msg.id}
              onClick={() => handleOpenMessage(msg.id)}
            />
          ))
        ) : (
          <EmptyInboxState />
        )}
      </Box>
    </MessagePanelShell>
  );

  return (
    <>
      <Box
        sx={{
          px: { xs: 1.1, sm: 2.2, md: 3 },
          py: { xs: 1.2, sm: 2.2, md: 3 },
          maxWidth: 1400,
          mx: "auto",
          overflowX: "clip",
          background: `
            radial-gradient(1100px 560px at 15% 8%, rgba(124,92,255,0.14), transparent 60%),
            radial-gradient(900px 520px at 92% 16%, rgba(45,226,230,0.10), transparent 55%),
            linear-gradient(180deg, rgba(0,0,0,0.00) 0%, rgba(0,0,0,0.18) 100%)
          `,
        }}
      >
        <CardShell sx={{ mb: { xs: 1.1, sm: 2 } }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={{ xs: 1.1, md: 1.6 }}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
            sx={{ minWidth: 0 }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  minWidth: 0,
                  flexWrap: "wrap",
                  px: { xs: 1.2, sm: 0 },
                }}
              >
                <Typography variant={isMdDown ? "h6" : "h5"} sx={{ fontWeight: 950, letterSpacing: -0.3 }}>
                  Control Center
                </Typography>
                <EllipChip label="Phase A" />
                <EllipChip label="Mock" />
                <EllipChip label="Plant 3" />
              </Stack>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={{ xs: 0.3, sm: 1 }}
                sx={{ mt: 0.7, color: "text.secondary" }}
              >
                <Typography sx={{ lineHeight: 1.25 }}>
                  {shiftLabel} ({shiftRange}) • <b>{role}</b>
                </Typography>
                <Typography sx={{ display: { xs: "none", md: "block" }, lineHeight: 1.25 }}>
                  {email}
                </Typography>
              </Stack>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
              <Tooltip title="Inbox & Compose">
                <IconButton
                  aria-label="messages"
                  onClick={handleOpenMessages}
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 3,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.04)",
                    overflow: "visible",
                    position: "relative",
                    "&:hover": {
                      background: "rgba(124,92,255,0.08)",
                      borderColor: "rgba(124,92,255,0.24)",
                    },
                  }}
                >
                  <Badge
                    badgeContent={unreadCount}
                    color="error"
                    overlap="circular"
                    sx={{
                      "& .MuiBadge-badge": {
                        fontWeight: 900,
                        minWidth: 20,
                        height: 20,
                        px: 0.5,
                        borderRadius: 999,
                        border: "1px solid rgba(8,12,24,0.8)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.28)",
                        top: 10,
                        right: 10,
                      },
                    }}
                  >
                    <MailOutlineRoundedIcon />
                  </Badge>
                </IconButton>
              </Tooltip>

              <Tooltip title="Phase A scope: UI foundation only">
                <IconButton
                  aria-label="info"
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 3,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.04)",
                    overflow: "hidden",
                  }}
                >
                  <InfoOutlinedIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          <Divider sx={{ my: 1.6 }} />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
            <TextField
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search modules..."
              fullWidth
              sx={fieldSx()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon />
                  </InputAdornment>
                ),
              }}
            />

            <Button
              variant="outlined"
              startIcon={<FilterAltRoundedIcon />}
              onClick={() => setQuery("")}
              sx={{ whiteSpace: "nowrap", minHeight: 48 }}
            >
              Clear
            </Button>
          </Stack>

          <GridInset sx={{ mt: 1.4 }}>
            <Grid container spacing={1.2} alignItems="stretch">
              <Grid item xs={12} sm={6} md={3}>
                <StatPill icon={<TrendingUpRoundedIcon />} label="Running" value={String(deviceSummary.running)} />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <StatPill
                  icon={<PauseCircleFilledRoundedIcon />}
                  label="Attention"
                  value={String(deviceSummary.attention)}
                  sx={{
                    "& > div:first-of-type": {
                      background: "rgba(255,200,87,0.10)",
                      borderColor: "rgba(255,200,87,0.22)",
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <StatPill
                  icon={<CancelRoundedIcon />}
                  label="Down"
                  value={String(deviceSummary.down)}
                  sx={{
                    "& > div:first-of-type": {
                      background: "rgba(255,77,109,0.10)",
                      borderColor: "rgba(255,77,109,0.22)",
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <StatPill
                  icon={<AlternateEmailRoundedIcon />}
                  label="Messages"
                  value={`${unreadCount} New`}
                  sx={{
                    "& > div:first-of-type": {
                      background: "rgba(124,92,255,0.14)",
                      borderColor: "rgba(124,92,255,0.28)",
                    },
                  }}
                />
              </Grid>
            </Grid>
          </GridInset>
        </CardShell>

        <Box
          sx={{
            mt: { xs: 1.1, sm: 2 },
            display: "grid",
            gap: UI.gap,
            gridTemplateColumns: {
              xs: "1fr",
              md: "1fr 1fr",
              lg: "5fr 7fr",
            },
            gridTemplateAreas: {
              xs: `
                "qa"
                "alarms"
                "down"
                "mods"
              `,
              md: `
                "qa alarms"
                "down mods"
              `,
              lg: `
                "qa alarms"
                "down mods"
              `,
            },
            alignItems: "stretch",
          }}
        >
          <Box sx={{ gridArea: "qa", minWidth: 0 }}>
            <CardShell sx={{ minHeight: { xs: 250, md: 270 }, display: "flex", flexDirection: "column" }}>
              <SectionHeader icon={<BoltRoundedIcon />} title="Quick Actions" rightChip="Safe" />
              <Divider sx={{ mt: 1.2, mb: 1.2 }} />

              <GridInset>
                <Grid container spacing={1.2} sx={{ flex: 1, alignContent: "flex-start" }}>
                  <Grid item xs={12}>
                    <Button
                      fullWidth
                      variant="contained"
                      endIcon={<ArrowForwardRoundedIcon />}
                      onClick={() => navigate(primaryCta.path)}
                      sx={{ minHeight: 48 }}
                    >
                      {primaryCta.label}
                    </Button>
                  </Grid>

                  <Grid item xs={12}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<MailOutlineRoundedIcon />}
                      onClick={handleOpenMessages}
                      sx={{ minHeight: 48 }}
                    >
                      Open Inbox
                    </Button>
                  </Grid>

                  <Grid item xs={12}>
                    <Paper
                      sx={{
                        p: 1.45,
                        borderRadius: UI.rInner,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        overflow: "hidden",
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 900 }}>
                        Message Access
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mt: 0.55,
                          lineHeight: 1.6,
                          overflowWrap: "anywhere",
                        }}
                      >
                        All users can send and receive. Direct messages are visible only to sender and target user.
                      </Typography>

                      <Stack direction="row" spacing={0.8} sx={{ mt: 1, flexWrap: "wrap", rowGap: 0.8 }}>
                        <EllipChip label={`${broadcastCount} All`} />
                        <EllipChip label={`${directCount} Direct`} />
                        <EllipChip label={`${unreadCount} Unread`} />
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>
              </GridInset>
            </CardShell>
          </Box>

          <Box sx={{ gridArea: "alarms", minWidth: 0 }}>
            <SimpleList title="Top Alarms" rightBadge="Mock" rows={topAlarms} icon={<AlarmOnRoundedIcon />} minRows={5} />
          </Box>

          <Box sx={{ gridArea: "down", minWidth: 0 }}>
            <SimpleList title="Downtime Drivers" rightBadge="Mock" rows={topDowntime} icon={<TimerRoundedIcon />} minRows={5} />
          </Box>

          <Box sx={{ gridArea: "mods", minWidth: 0 }}>
            <CardShell sx={{ minHeight: { xs: 290, md: 330 }, display: "flex", flexDirection: "column" }}>
              <SectionHeader icon={<ViewModuleRoundedIcon />} title="Modules" rightChip="Permission-based" />
              <Divider sx={{ mt: 1.2, mb: 1.2 }} />

              <Box
                sx={{
                  display: "grid",
                  gap: 1,
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  alignContent: "start",
                  flex: 1,
                  minHeight: 0,
                }}
              >
                {modules.map((m) => (
                  <ModuleRow
                    key={m.key}
                    icon={m.icon}
                    title={m.label}
                    subtitle={m.desc}
                    badge={m.badge}
                    onClick={() => navigate(m.path)}
                  />
                ))}
              </Box>

              {modules.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ pt: 1 }}>
                  No modules assigned for this role.
                </Typography>
              )}
            </CardShell>
          </Box>
        </Box>

        <Box
          sx={{
            mt: { xs: 1.4, sm: 2.2 },
            color: "text.secondary",
            fontSize: 12,
            display: "flex",
            justifyContent: "space-between",
            gap: 1.2,
            flexWrap: "wrap",
            opacity: 0.9,
          }}
        >
          <div>Mode: UI Prototype + Mock Data • Shift logic synced with Plant 3 source</div>
          <div>{isSmDown ? "Next: mobile polish" : "Next: dashboard logic sync complete"}</div>
        </Box>
      </Box>

      <Dialog
        open={messagesOpen}
        onClose={handleCloseMessages}
        fullWidth
        maxWidth={false}
        fullScreen={isSmDown}
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, sm: 4 },
            background:
              "radial-gradient(1200px 700px at 10% 0%, rgba(124,92,255,0.14), transparent 55%), linear-gradient(180deg, rgba(14,16,28,0.985), rgba(8,10,18,0.985))",
            border: "1px solid rgba(255,255,255,0.08)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            width: "100%",
            m: 0,
            maxWidth: { xs: "100vw", sm: "min(1260px, calc(100vw - 32px))" },
            height: { xs: "100dvh", sm: "min(820px, 90vh)" },
            boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
          },
        }}
        BackdropProps={{
          sx: {
            backgroundColor: "rgba(2,6,18,0.74)",
            backdropFilter: "blur(7px)",
          },
        }}
      >
        <DialogTitle
          sx={{
            px: { xs: 2.2, sm: 2.7 },
            pt: { xs: 1.6, sm: 1.8 },
            pb: { xs: 1.15, sm: 1.2 },
            overflow: "hidden",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
            background: "rgba(5,7,16,0.52)",
            backdropFilter: "blur(16px)",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 1, sm: 1.1 }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", sm: "center" }}
            sx={{ minWidth: 0 }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontWeight: 950,
                  fontSize: { xs: 20, sm: 22 },
                  lineHeight: 1.15,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Internal Mail Center
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 0.38,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                Operational messaging for Plant 3 coordination
              </Typography>
            </Box>

            <Stack direction="row" spacing={0.8} sx={{ flexWrap: "wrap", rowGap: 0.8 }}>
              <EllipChip label={`${unreadCount} Unread`} />
              <EllipChip label={`${broadcastCount} Broadcast`} />
              <EllipChip label={`${directCount} Direct`} />
            </Stack>
          </Stack>
        </DialogTitle>

        {isSmDown ? (
          <>
            <Box sx={{ px: 2.1, py: 1, flexShrink: 0 }}>
              <Tabs
                value={mobileMessageTab}
                onChange={(_, next) => setMobileMessageTab(next)}
                variant="fullWidth"
                sx={{
                  minHeight: 46,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 999,
                  p: 0.35,
                  overflow: "hidden",
                  "& .MuiTabs-indicator": { display: "none" },
                  "& .MuiTab-root": {
                    minHeight: 40,
                    borderRadius: 999,
                    textTransform: "none",
                    fontWeight: 900,
                    color: "text.secondary",
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  },
                  "& .Mui-selected": {
                    color: "#fff !important",
                    background: "rgba(124,92,255,0.22)",
                  },
                }}
              >
                <Tab value="inbox" label={`Inbox (${visibleMessages.length})`} />
                <Tab value="compose" label="Compose" />
              </Tabs>
            </Box>

            <DialogContent
              dividers
              sx={{
                px: 2.1,
                py: 1.15,
                borderColor: "rgba(255,255,255,0.08)",
                overflow: "hidden",
                flex: 1,
                minHeight: 0,
              }}
            >
              <Box sx={{ minHeight: 0, height: "100%" }}>
                {mobileMessageTab === "inbox" ? renderInboxPanel() : renderComposePanel()}
              </Box>
            </DialogContent>
          </>
        ) : (
          <DialogContent
            dividers
            sx={{
              px: { xs: 2.1, sm: 2.35 },
              py: { xs: 1.2, sm: 1.28 },
              borderColor: "rgba(255,255,255,0.08)",
              overflow: "hidden",
              flex: 1,
              minHeight: 0,
            }}
          >
            <Box
              sx={{
                width: "100%",
                height: "100%",
                minWidth: 0,
                minHeight: 0,
                display: "grid",
                gap: 1.35,
                gridTemplateColumns: {
                  md: "minmax(0, 1.04fr) minmax(0, 0.96fr)",
                  lg: "minmax(0, 1.05fr) minmax(0, 0.95fr)",
                },
              }}
            >
              <Box sx={{ minWidth: 0, minHeight: 0, overflow: "hidden" }}>{renderInboxPanel()}</Box>
              <Box sx={{ minWidth: 0, minHeight: 0, overflow: "hidden" }}>{renderComposePanel()}</Box>
            </Box>
          </DialogContent>
        )}

        <DialogActions
          sx={{
            px: { xs: 2.1, sm: 2.7 },
            py: { xs: 1.05, sm: 1.15 },
            minHeight: { xs: 60, sm: 62 },
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(8,10,18,0.92)",
            backdropFilter: "blur(12px)",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              maxWidth: { xs: "100%", sm: "60%" },
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: { xs: "nowrap", sm: "normal" },
            }}
          >
            Direct messages are visible only to sender and selected user
          </Typography>

          <Stack direction="row" spacing={1} sx={{ flexShrink: 0, width: { xs: "100%", sm: "auto" } }}>
            <Button variant="outlined" onClick={handleCloseMessages} fullWidth={isSmDown}>
              Close
            </Button>
            <Button variant="contained" startIcon={<SendRoundedIcon />} onClick={handleSend} fullWidth={isSmDown}>
              Send
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        fullWidth
        maxWidth="sm"
        fullScreen={isSmDown}
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, sm: 4 },
            background:
              "radial-gradient(1000px 600px at 10% 0%, rgba(124,92,255,0.12), transparent 55%), linear-gradient(180deg, rgba(14,16,28,0.98), rgba(8,10,18,0.98))",
            border: "1px solid rgba(255,255,255,0.08)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            width: "100%",
            m: 0,
            maxWidth: { xs: "100vw", sm: "min(820px, calc(100vw - 32px))" },
            maxHeight: { xs: "100dvh", sm: "88vh" },
          },
        }}
        BackdropProps={{
          sx: {
            backgroundColor: "rgba(2,6,18,0.74)",
            backdropFilter: "blur(7px)",
          },
        }}
      >
        {selectedMessage && (
          <>
            <DialogTitle
              sx={{
                px: { xs: 2.15, sm: 2.6 },
                pt: { xs: 1.7, sm: 1.9 },
                pb: { xs: 1.15, sm: 1.2 },
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.1}>
                  <Box sx={{ minWidth: 0, flex: 1, overflow: "hidden", pr: 0.5 }}>
                    <Typography
                      sx={{
                        fontWeight: 950,
                        fontSize: { xs: 20, sm: 22 },
                        lineHeight: 1.2,
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                      }}
                    >
                      {selectedMessage.subject}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 0.48,
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                      }}
                    >
                      {selectedMessage.isSender
                        ? `To ${selectedMessage.recipientMode === "all" ? "All Users" : selectedMessage.recipientLabel}`
                        : `From ${resolveUserLabel(selectedMessage.senderEmail, selectedMessage.senderRole)}`}
                    </Typography>
                  </Box>

                  <SafeIconSlot
                    sx={{
                      width: 42,
                      height: 42,
                      minWidth: 42,
                      minHeight: 42,
                      borderRadius: 2.6,
                      background:
                        selectedMessage.recipientMode === "all"
                          ? "rgba(45,226,230,0.10)"
                          : "rgba(124,92,255,0.12)",
                      border:
                        selectedMessage.recipientMode === "all"
                          ? "1px solid rgba(45,226,230,0.22)"
                          : "1px solid rgba(124,92,255,0.24)",
                    }}
                  >
                    {selectedMessage.recipientMode === "all" ? <ForumRoundedIcon /> : <DraftsRoundedIcon />}
                  </SafeIconSlot>
                </Stack>

                <Stack direction="row" spacing={0.8} sx={{ flexWrap: "wrap", rowGap: 0.8 }}>
                  <EllipChip
                    label={selectedMessage.recipientMode === "all" ? "Broadcast" : "Direct"}
                    sx={{
                      background:
                        selectedMessage.recipientMode === "all"
                          ? "rgba(45,226,230,0.08)"
                          : "rgba(124,92,255,0.12)",
                      border:
                        selectedMessage.recipientMode === "all"
                          ? "1px solid rgba(45,226,230,0.22)"
                          : "1px solid rgba(124,92,255,0.22)",
                    }}
                  />
                  {selectedMessage.unread ? <EllipChip label="Unread" /> : <EllipChip label="Opened" />}
                  {selectedMessage.attachmentName ? <EllipChip label="Has Attachment" /> : null}
                </Stack>
              </Stack>
            </DialogTitle>

            <DialogContent
              dividers
              sx={{
                px: { xs: 2.15, sm: 2.6 },
                py: { xs: 1.3, sm: 1.45 },
                borderColor: "rgba(255,255,255,0.08)",
                overflowX: "hidden",
                overflowY: "auto",
                flex: 1,
                minHeight: 0,
              }}
            >
              <Stack spacing={1.15}>
                <Box
                  sx={{
                    display: "grid",
                    gap: 1,
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  }}
                >
                  <MessageInfoPill
                    icon={<PersonRoundedIcon />}
                    label="From"
                    value={resolveUserLabel(selectedMessage.senderEmail, selectedMessage.senderRole)}
                  />
                  <MessageInfoPill
                    icon={selectedMessage.recipientMode === "all" ? <PublicRoundedIcon /> : <DraftsRoundedIcon />}
                    label="To"
                    value={selectedMessage.recipientMode === "all" ? "All Users" : selectedMessage.recipientLabel}
                  />
                </Box>

                <MessageSectionCard title="Message Body" subtitle="Operational message content">
                  <Typography
                    variant="body2"
                    sx={{
                      lineHeight: 1.85,
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selectedMessage.body}
                  </Typography>
                </MessageSectionCard>

                {selectedMessage.attachmentName ? (
                  <MessageSectionCard title="Attachment" subtitle="Attached supporting file">
                    <ModuleStyleAttachmentRow fileName={selectedMessage.attachmentName} />
                  </MessageSectionCard>
                ) : null}
              </Stack>
            </DialogContent>

            <DialogActions
              sx={{
                px: { xs: 2.15, sm: 2.6 },
                py: { xs: 1.05, sm: 1.15 },
                minHeight: { xs: 60, sm: 62 },
                justifyContent: "space-between",
                gap: 1,
                flexWrap: "wrap",
                alignItems: "center",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(8,10,18,0.9)",
                backdropFilter: "blur(12px)",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Message detail actions
              </Typography>

              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
                {selectedMessage.recipientMode === "direct" && !selectedMessage.isSender ? (
                  <Button variant="outlined" startIcon={<ReplyRoundedIcon />} onClick={handleReplyFromDetail}>
                    Reply
                  </Button>
                ) : null}

                <Button variant="outlined" startIcon={<MarkEmailUnreadRoundedIcon />} onClick={handleMarkUnread}>
                  Mark Unread
                </Button>

                <Button variant="outlined" startIcon={<VisibilityRoundedIcon />} onClick={() => setDetailOpen(false)}>
                  Close
                </Button>

                <Button
                  color="error"
                  variant="contained"
                  startIcon={<DeleteOutlineRoundedIcon />}
                  onClick={handleDeleteSelected}
                >
                  Delete
                </Button>
              </Stack>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}