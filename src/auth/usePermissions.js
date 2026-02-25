// src/auth/usePermissions.js
import { useMemo } from "react";
import useAuth from "./useAuth";
import {
  PAGE_ACCESS,
  ROLE_DEFINITIONS,
  evaluatePermission,
  evaluatePolicy,
} from "../utils/access.model";

function pickPrimaryRole(user) {
  return user?.roles?.[0] || "";
}

function normalizeRoleKey(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";

  if (ROLE_DEFINITIONS?.[s]) return s;

  const upper = s
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (ROLE_DEFINITIONS?.[upper]) return upper;

  const noPrefix = upper.replace(/^ROLE_/, "");
  if (ROLE_DEFINITIONS?.[noPrefix]) return noPrefix;

  return "";
}

function normalizePagesList(x) {
  if (!Array.isArray(x)) return [];
  return x.map((s) => String(s || "").trim()).filter(Boolean);
}

function shouldUseUserPages(pages) {
  // Prevent accidental lockout when permissions is only ["dashboard"]
  if (!pages || pages.length === 0) return false;
  if (pages.length === 1 && pages[0] === "dashboard") return false;
  return true;
}

export default function usePermissions() {
  const { user, isAuthed, role } = useAuth();

  const roleKey = useMemo(() => {
    const raw = role || pickPrimaryRole(user) || "";
    const normalized = normalizeRoleKey(raw);
    return normalized || "OPERATOR";
  }, [role, user]);

  const userPages = useMemo(() => normalizePagesList(user?.permissions), [user]);
  const useUserPages = useMemo(() => shouldUseUserPages(userPages), [userPages]);

  const hasPermission = useMemo(() => {
    return (permission, context) => {
      if (!isAuthed) return false;

      const ok = evaluatePermission(roleKey, permission);
      if (!ok) return false;

      const pol = evaluatePolicy({ roleKey, permission, context });
      return Boolean(pol?.ok);
    };
  }, [isAuthed, roleKey]);

  const canAccessPage = useMemo(() => {
    return (pageKey) => {
      if (!isAuthed) return false;

      const key = String(pageKey || "").trim();
      if (!key) return false;

      // Primary path only when it is a real pages list (not just ["dashboard"])
      if (useUserPages) {
        return userPages.includes(key);
      }

      // Fallback path: permission model
      const required = PAGE_ACCESS?.[key] || [];
      return required.every((p) => hasPermission(p));
    };
  }, [isAuthed, useUserPages, userPages, hasPermission]);

  const hasAccess = useMemo(() => canAccessPage, [canAccessPage]);

  const firstAllowedPage = useMemo(() => {
    if (useUserPages) {
      return userPages.find((k) => canAccessPage(k)) || "";
    }

    const keys = Object.keys(PAGE_ACCESS || {});
    for (const k of keys) {
      if (canAccessPage(k)) return k;
    }
    return "";
  }, [useUserPages, userPages, canAccessPage]);

  return {
    isAuthed,
    user,
    role: roleKey,

    hasPermission,
    canAccessPage,
    firstAllowedPage,

    // legacy
    hasAccess,
  };
}