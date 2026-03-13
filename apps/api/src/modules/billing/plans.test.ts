import { PlanCode } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { planDefinitions } from "./plans.js";

describe("billing plan definitions", () => {
  it("defines expected limits for FREE plan", () => {
    expect(planDefinitions[PlanCode.FREE].limits.members).toBe(3);
    expect(planDefinitions[PlanCode.FREE].limits.projects).toBe(2);
  });

  it("keeps BUSINESS members/projects as unlimited", () => {
    expect(planDefinitions[PlanCode.BUSINESS].limits.members).toBeNull();
    expect(planDefinitions[PlanCode.BUSINESS].limits.projects).toBeNull();
  });

  it("enables advanced permissions only from PRO plan and above", () => {
    expect(planDefinitions[PlanCode.FREE].features.advanced_permissions).toBe(
      false,
    );
    expect(planDefinitions[PlanCode.PRO].features.advanced_permissions).toBe(
      true,
    );
    expect(
      planDefinitions[PlanCode.BUSINESS].features.advanced_permissions,
    ).toBe(true);
  });
});
