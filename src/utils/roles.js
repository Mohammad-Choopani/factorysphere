/**
 * FactorySphere – Role Definitions
 * Phase A (UI & Visibility only)
 * Single Source of Truth for roles
 */

export const ROLES = {
  PLANT_MANAGER: "PlantManager",
  PRODUCTION_MANAGER: "ProductionManager",
  MAINTENANCE_MANAGER: "MaintenanceManager",
  QUALITY_MANAGER: "QualityManager",
  ENGINEERING_MANAGER: "EngineeringManager",
  SUPERVISOR: "Supervisor",
  TEAM_LEADER: "TeamLeader",
};

/**
 * Helpers
 */
export const ALL_ROLES = Object.values(ROLES);

export const ROLE_LABELS = {
  [ROLES.PLANT_MANAGER]: "Plant Manager",
  [ROLES.PRODUCTION_MANAGER]: "Production Manager",
  [ROLES.MAINTENANCE_MANAGER]: "Maintenance Manager",
  [ROLES.QUALITY_MANAGER]: "Quality Manager",
  [ROLES.ENGINEERING_MANAGER]: "Engineering Manager",
  [ROLES.SUPERVISOR]: "Supervisor",
  [ROLES.TEAM_LEADER]: "Team Leader",
};
