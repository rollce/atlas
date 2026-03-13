import { Role } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../lib/prisma.js";
import { requireTenant } from "./middleware.js";

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

function makeMembership(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: "mem_1",
    userId: "user_1",
    organizationId: "org_1",
    role: Role.ADMIN,
    createdAt: new Date(),
    organization: {
      id: "org_1",
      name: "Atlas Org",
      slug: "atlas-org",
      createdAt: new Date(),
      updatedAt: new Date(),
      billingEmail: null,
    },
    ...overrides,
  };
}

describe("requireTenant middleware", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves tenant using explicit x-organization-id header", async () => {
    vi.spyOn(prisma.membership, "findFirst").mockResolvedValue(
      makeMembership() as never,
    );

    const request = {
      auth: { userId: "user_1", sessionId: "session_1" },
      headers: { "x-organization-id": "org_1" },
    } as unknown as Parameters<typeof requireTenant>[0];
    const { reply } = createReplyMock();

    await requireTenant(
      request,
      reply as unknown as Parameters<typeof requireTenant>[1],
    );

    expect(request.tenant).toMatchObject({
      organizationId: "org_1",
      organizationName: "Atlas Org",
      organizationSlug: "atlas-org",
      role: Role.ADMIN,
    });
    expect(reply.status).not.toHaveBeenCalled();
  });

  it("returns 403 when explicit tenant is inaccessible", async () => {
    vi.spyOn(prisma.membership, "findFirst").mockResolvedValue(null);

    const request = {
      auth: { userId: "user_1", sessionId: "session_1" },
      headers: { "x-organization-id": "org_404" },
    } as unknown as Parameters<typeof requireTenant>[0];
    const { reply, state } = createReplyMock();

    await requireTenant(
      request,
      reply as unknown as Parameters<typeof requireTenant>[1],
    );

    expect(state.statusCode).toBe(403);
    expect(state.payload).toMatchObject({ code: "TENANT_ACCESS_DENIED" });
  });

  it("returns 400 when user belongs to multiple orgs without header", async () => {
    vi.spyOn(prisma.membership, "findMany").mockResolvedValue([
      makeMembership(),
      makeMembership({
        id: "mem_2",
        organizationId: "org_2",
        organization: {
          id: "org_2",
          name: "Northline",
          slug: "northline",
          createdAt: new Date(),
          updatedAt: new Date(),
          billingEmail: null,
        },
      }),
    ] as never);

    const request = {
      auth: { userId: "user_1", sessionId: "session_1" },
      headers: {},
    } as unknown as Parameters<typeof requireTenant>[0];
    const { reply, state } = createReplyMock();

    await requireTenant(
      request,
      reply as unknown as Parameters<typeof requireTenant>[1],
    );

    expect(state.statusCode).toBe(400);
    expect(state.payload).toMatchObject({ code: "TENANT_REQUIRED" });
  });

  it("returns 403 when user has no memberships", async () => {
    vi.spyOn(prisma.membership, "findMany").mockResolvedValue([]);

    const request = {
      auth: { userId: "user_1", sessionId: "session_1" },
      headers: {},
    } as unknown as Parameters<typeof requireTenant>[0];
    const { reply, state } = createReplyMock();

    await requireTenant(
      request,
      reply as unknown as Parameters<typeof requireTenant>[1],
    );

    expect(state.statusCode).toBe(403);
    expect(state.payload).toMatchObject({ code: "TENANT_ACCESS_DENIED" });
  });
});
