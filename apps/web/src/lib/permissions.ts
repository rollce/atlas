import type { AtlasRole } from "./types";

const roleWeight: Record<AtlasRole, number> = {
  OWNER: 400,
  ADMIN: 300,
  MANAGER: 200,
  MEMBER: 100,
};

export function hasRequiredRole(
  role: AtlasRole | null,
  allowedRoles: AtlasRole[],
): boolean {
  if (!role) {
    return false;
  }

  const requiredWeight = Math.min(
    ...allowedRoles.map((item) => roleWeight[item]),
  );
  return roleWeight[role] >= requiredWeight;
}

export function canManageMembers(role: AtlasRole | null): boolean {
  return hasRequiredRole(role, ["OWNER", "ADMIN"]);
}

export function canManageOrganization(role: AtlasRole | null): boolean {
  return hasRequiredRole(role, ["OWNER", "ADMIN"]);
}

export function canDeleteOrganization(role: AtlasRole | null): boolean {
  return hasRequiredRole(role, ["OWNER"]);
}

export function canManageWorkItems(role: AtlasRole | null): boolean {
  return hasRequiredRole(role, ["OWNER", "ADMIN", "MANAGER"]);
}
