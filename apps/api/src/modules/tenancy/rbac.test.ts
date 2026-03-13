import { Role } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { hasRequiredRole } from "./rbac.js";

describe("tenancy rbac", () => {
  it("grants owner/admin access to manager-level operations", () => {
    expect(hasRequiredRole(Role.OWNER, [Role.MANAGER])).toBe(true);
    expect(hasRequiredRole(Role.ADMIN, [Role.MANAGER])).toBe(true);
    expect(hasRequiredRole(Role.MANAGER, [Role.MANAGER])).toBe(true);
  });

  it("rejects member access to admin-level operations", () => {
    expect(hasRequiredRole(Role.MEMBER, [Role.ADMIN])).toBe(false);
  });

  it("grants access when one of required roles has lower threshold", () => {
    expect(hasRequiredRole(Role.MANAGER, [Role.ADMIN, Role.MEMBER])).toBe(true);
  });
});
