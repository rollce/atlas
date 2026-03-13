import { Role } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { requireTenantRole } from "./rbac.js";

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

describe("requireTenantRole guard", () => {
  it("allows request when tenant role satisfies policy", async () => {
    const guard = requireTenantRole([Role.MANAGER]);
    const request = {
      tenant: {
        organizationId: "org_1",
        organizationName: "Atlas",
        organizationSlug: "atlas",
        role: Role.ADMIN,
        membershipId: "mem_1",
      },
    } as unknown as Parameters<ReturnType<typeof requireTenantRole>>[0];
    const { reply, state } = createReplyMock();

    await guard(
      request,
      reply as unknown as Parameters<ReturnType<typeof requireTenantRole>>[1],
    );

    expect(state.statusCode).toBeUndefined();
  });

  it("returns 403 when role is insufficient", async () => {
    const guard = requireTenantRole([Role.ADMIN]);
    const request = {
      tenant: {
        organizationId: "org_1",
        organizationName: "Atlas",
        organizationSlug: "atlas",
        role: Role.MEMBER,
        membershipId: "mem_1",
      },
    } as unknown as Parameters<ReturnType<typeof requireTenantRole>>[0];
    const { reply, state } = createReplyMock();

    await guard(
      request,
      reply as unknown as Parameters<ReturnType<typeof requireTenantRole>>[1],
    );

    expect(state.statusCode).toBe(403);
    expect(state.payload).toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns 401 when tenant context is missing", async () => {
    const guard = requireTenantRole([Role.ADMIN]);
    const request = {} as unknown as Parameters<
      ReturnType<typeof requireTenantRole>
    >[0];
    const { reply, state } = createReplyMock();

    await guard(
      request,
      reply as unknown as Parameters<ReturnType<typeof requireTenantRole>>[1],
    );

    expect(state.statusCode).toBe(401);
    expect(state.payload).toMatchObject({ code: "TENANT_CONTEXT_MISSING" });
  });
});
