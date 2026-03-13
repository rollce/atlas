import { Role } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { canPerformTenantAction, requirePolicy } from "./policy.js";

function createReplyMock() {
  const state: { statusCode?: number; payload?: unknown } = {};
  const reply = {
    status: vi.fn().mockImplementation((code: number) => {
      state.statusCode = code;
      return reply;
    }),
    send: vi.fn().mockImplementation((payload: unknown) => {
      state.payload = payload;
      return reply;
    }),
  };

  return {
    state,
    reply,
  };
}

describe("policy rules", () => {
  it("allows manager to perform task writes", () => {
    expect(canPerformTenantAction(Role.MANAGER, "task:write")).toBe(true);
  });

  it("denies member from deleting a project", () => {
    expect(canPerformTenantAction(Role.MEMBER, "project:delete")).toBe(false);
  });
});

describe("requirePolicy guard", () => {
  it("returns 401 when tenant context is missing", async () => {
    const guard = requirePolicy("workspace:write");
    const request = {} as Parameters<ReturnType<typeof requirePolicy>>[0];
    const { reply, state } = createReplyMock();

    await guard(
      request,
      reply as unknown as Parameters<ReturnType<typeof requirePolicy>>[1],
    );

    expect(state.statusCode).toBe(401);
    expect(state.payload).toMatchObject({ code: "TENANT_CONTEXT_MISSING" });
  });

  it("returns 403 when role is insufficient", async () => {
    const guard = requirePolicy("organization:delete");
    const request = {
      tenant: {
        organizationId: "org_1",
        organizationName: "Atlas",
        organizationSlug: "atlas",
        role: Role.ADMIN,
        membershipId: "mem_1",
      },
    } as Parameters<ReturnType<typeof requirePolicy>>[0];
    const { reply, state } = createReplyMock();

    await guard(
      request,
      reply as unknown as Parameters<ReturnType<typeof requirePolicy>>[1],
    );

    expect(state.statusCode).toBe(403);
    expect(state.payload).toMatchObject({ code: "FORBIDDEN_POLICY" });
  });

  it("runs custom checks and forwards denial metadata", async () => {
    const guard = requirePolicy("workspace:write", {
      check: () => ({
        allowed: false,
        statusCode: 404,
        code: "WORKSPACE_NOT_FOUND",
        message: "Workspace does not belong to the tenant",
      }),
    });
    const request = {
      tenant: {
        organizationId: "org_1",
        organizationName: "Atlas",
        organizationSlug: "atlas",
        role: Role.ADMIN,
        membershipId: "mem_1",
      },
    } as Parameters<ReturnType<typeof requirePolicy>>[0];
    const { reply, state } = createReplyMock();

    await guard(
      request,
      reply as unknown as Parameters<ReturnType<typeof requirePolicy>>[1],
    );

    expect(state.statusCode).toBe(404);
    expect(state.payload).toMatchObject({ code: "WORKSPACE_NOT_FOUND" });
  });
});
