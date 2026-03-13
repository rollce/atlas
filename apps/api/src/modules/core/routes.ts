import { Prisma } from "@prisma/client";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { enforceUsageLimit, requireFeature } from "../billing/middleware.js";
import { requireAuth } from "../auth/middleware.js";
import { requireTenant } from "../tenancy/middleware.js";
import { requirePolicy } from "../tenancy/policy.js";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const workspaceListQuerySchema = paginationSchema.extend({
  search: z.string().trim().min(1).optional(),
});

const workspaceCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  key: z.string().trim().min(2).max(64).optional(),
});

const workspaceUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  key: z.string().trim().min(2).max(64).optional(),
});

const clientListQuerySchema = paginationSchema.extend({
  search: z.string().trim().min(1).optional(),
});

const clientCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().email().optional(),
});

const clientUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  contactEmail: z.string().trim().email().nullable().optional(),
});

const projectListQuerySchema = paginationSchema.extend({
  search: z.string().trim().min(1).optional(),
  workspaceId: z.string().cuid().optional(),
  clientId: z.string().cuid().optional(),
  status: z.string().trim().min(1).max(40).optional(),
  sortBy: z
    .enum(["createdAt", "updatedAt", "name", "status"])
    .default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const projectCreateSchema = z.object({
  name: z.string().trim().min(2).max(200),
  workspaceId: z.string().cuid(),
  clientId: z.string().cuid().nullable().optional(),
  status: z.string().trim().min(1).max(40).default("active"),
});

const projectUpdateSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  workspaceId: z.string().cuid().optional(),
  clientId: z.string().cuid().nullable().optional(),
  status: z.string().trim().min(1).max(40).optional(),
});

const taskListQuerySchema = paginationSchema.extend({
  search: z.string().trim().min(1).optional(),
  projectId: z.string().cuid().optional(),
  status: z.string().trim().min(1).max(40).optional(),
  dueFrom: z.coerce.date().optional(),
  dueTo: z.coerce.date().optional(),
  sortBy: z
    .enum(["createdAt", "updatedAt", "dueDate", "status"])
    .default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const taskCreateSchema = z.object({
  projectId: z.string().cuid(),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(1).max(4000).optional(),
  status: z.string().trim().min(1).max(40).default("todo"),
  dueDate: z.coerce.date().optional(),
});

const taskUpdateSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().min(1).max(4000).nullable().optional(),
  status: z.string().trim().min(1).max(40).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  expectedVersion: z.coerce.number().int().positive().optional(),
});

const idParamsSchema = z.object({
  id: z.string().cuid(),
});

const auditLogQuerySchema = paginationSchema.extend({
  action: z.string().trim().min(1).optional(),
  entityType: z.string().trim().min(1).optional(),
});

function parseInput<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  value: unknown,
  reply: FastifyReply,
  source: "payload" | "query" | "params" = "payload",
): z.infer<TSchema> | null {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    reply.status(400).send({
      code: "VALIDATION_ERROR",
      message: `Invalid ${source}`,
    });
    return null;
  }

  return parsed.data;
}

function toPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

function normalizeKey(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);

  return normalized || "workspace";
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function appendAuditLog(params: {
  organizationId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata,
    },
  });
}

async function ensureWorkspaceBelongsToTenant(
  organizationId: string,
  workspaceId: string,
) {
  return prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      organizationId,
    },
    select: { id: true },
  });
}

async function ensureClientBelongsToTenant(
  organizationId: string,
  clientId: string,
) {
  return prisma.client.findFirst({
    where: {
      id: clientId,
      organizationId,
    },
    select: { id: true },
  });
}

async function ensureProjectBelongsToTenant(
  organizationId: string,
  projectId: string,
) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId,
    },
    select: { id: true },
  });
}

export async function coreRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/api/v1/tenant/workspaces",
    { preHandler: [requireAuth, requireTenant] },
    async (request, reply) => {
      if (!request.tenant) {
        reply.status(401).send({
          code: "TENANT_CONTEXT_MISSING",
          message: "Tenant context is required",
        });
        return;
      }

      const query = parseInput(
        workspaceListQuerySchema,
        request.query,
        reply,
        "query",
      );
      if (!query) {
        return;
      }

      const where: Prisma.WorkspaceWhereInput = {
        organizationId: request.tenant.organizationId,
      };

      if (query.search) {
        where.OR = [
          { name: { contains: query.search, mode: "insensitive" } },
          { key: { contains: query.search, mode: "insensitive" } },
        ];
      }

      const skip = (query.page - 1) * query.limit;
      const [workspaces, total] = await prisma.$transaction([
        prisma.workspace.findMany({
          where,
          skip,
          take: query.limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.workspace.count({ where }),
      ]);

      reply.send({
        workspaces,
        pagination: toPagination(query.page, query.limit, total),
      });
    },
  );

  app.post(
    "/api/v1/tenant/workspaces",
    {
      preHandler: [
        requireAuth,
        requireTenant,
        requirePolicy("workspace:write"),
      ],
    },
    async (request, reply) => {
      if (!request.auth || !request.tenant) {
        reply.status(401).send({
          code: "TENANT_CONTEXT_MISSING",
          message: "Tenant context is required",
        });
        return;
      }

      const body = parseInput(workspaceCreateSchema, request.body, reply);
      if (!body) {
        return;
      }

      const workspaceKey = normalizeKey(body.key ?? body.name);

      try {
        const workspace = await prisma.workspace.create({
          data: {
            organizationId: request.tenant.organizationId,
            name: body.name,
            key: workspaceKey,
          },
        });

        await appendAuditLog({
          organizationId: request.tenant.organizationId,
          actorId: request.auth.userId,
          action: "workspace.created",
          entityType: "workspace",
          entityId: workspace.id,
          metadata: { key: workspace.key, name: workspace.name },
        });

        reply.status(201).send({ workspace });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          reply.status(409).send({
            code: "WORKSPACE_KEY_CONFLICT",
            message: "Workspace key already exists for this organization",
          });
          return;
        }

        throw error;
      }
    },
  );

  app.patch(
    "/api/v1/tenant/workspaces/:id",
    {
      preHandler: [
        requireAuth,
        requireTenant,
        requirePolicy("workspace:write"),
      ],
    },
    async (request, reply) => {
      if (!request.auth || !request.tenant) {
        reply.status(401).send({
          code: "TENANT_CONTEXT_MISSING",
          message: "Tenant context is required",
        });
        return;
      }

      const params = parseInput(
        idParamsSchema,
        request.params,
        reply,
        "params",
      );
      if (!params) {
        return;
      }

      const body = parseInput(workspaceUpdateSchema, request.body, reply);
      if (!body) {
        return;
      }

      const existing = await prisma.workspace.findFirst({
        where: {
          id: params.id,
          organizationId: request.tenant.organizationId,
        },
      });

      if (!existing) {
        reply.status(404).send({
          code: "WORKSPACE_NOT_FOUND",
          message: "Workspace not found in tenant scope",
        });
        return;
      }

      try {
        const workspace = await prisma.workspace.update({
          where: { id: existing.id },
          data: {
            name: body.name ?? existing.name,
            key: body.key ? normalizeKey(body.key) : existing.key,
          },
        });

        await appendAuditLog({
          organizationId: request.tenant.organizationId,
          actorId: request.auth.userId,
          action: "workspace.updated",
          entityType: "workspace",
          entityId: workspace.id,
          metadata: { key: workspace.key, name: workspace.name },
        });

        reply.send({ workspace });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          reply.status(409).send({
            code: "WORKSPACE_KEY_CONFLICT",
            message: "Workspace key already exists for this organization",
          });
          return;
        }

        throw error;
      }
    },
  );

  app.delete(
    "/api/v1/tenant/workspaces/:id",
    {
      preHandler: [
        requireAuth,
        requireTenant,
        requirePolicy("workspace:delete"),
      ],
    },
    async (request, reply) => {
      if (!request.auth || !request.tenant) {
        reply.status(401).send({
          code: "TENANT_CONTEXT_MISSING",
          message: "Tenant context is required",
        });
        return;
      }

      const params = parseInput(
        idParamsSchema,
        request.params,
        reply,
        "params",
      );
      if (!params) {
        return;
      }

      const target = await prisma.workspace.findFirst({
        where: {
          id: params.id,
          organizationId: request.tenant.organizationId,
        },
        select: { id: true },
      });

      if (!target) {
        reply.status(404).send({
          code: "WORKSPACE_NOT_FOUND",
          message: "Workspace not found in tenant scope",
        });
        return;
      }

      await prisma.workspace.delete({ where: { id: target.id } });
      await appendAuditLog({
        organizationId: request.tenant.organizationId,
        actorId: request.auth.userId,
        action: "workspace.deleted",
        entityType: "workspace",
        entityId: target.id,
      });

      reply.send({ success: true });
    },
  );

  app.get(
    "/api/v1/tenant/clients",
    { preHandler: [requireAuth, requireTenant] },
    async (request, reply) => {
      if (!request.tenant) {
        reply.status(401).send({
          code: "TENANT_CONTEXT_MISSING",
          message: "Tenant context is required",
        });
        return;
      }

      const query = parseInput(
        clientListQuerySchema,
        request.query,
        reply,
        "query",
      );
      if (!query) {
        return;
      }

      const where: Prisma.ClientWhereInput = {
        organizationId: request.tenant.organizationId,
      };

      if (query.search) {
        where.OR = [
          { name: { contains: query.search, mode: "insensitive" } },
          { contactEmail: { contains: query.search, mode: "insensitive" } },
        ];
      }

      const skip = (query.page - 1) * query.limit;
      const [clients, total] = await prisma.$transaction([
        prisma.client.findMany({
          where,
          skip,
          take: query.limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.client.count({ where }),
      ]);

      reply.send({
        clients,
        pagination: toPagination(query.page, query.limit, total),
      });
    },
  );

  app.post(
    "/api/v1/tenant/clients",
    {
      preHandler: [requireAuth, requireTenant, requirePolicy("client:write")],
    },
    async (request, reply) => {
      if (!request.auth || !request.tenant) {
        reply.status(401).send({
          code: "TENANT_CONTEXT_MISSING",
          message: "Tenant context is required",
        });
        return;
      }

      const body = parseInput(clientCreateSchema, request.body, reply);
      if (!body) {
        return;
      }

      const client = await prisma.client.create({
        data: {
          organizationId: request.tenant.organizationId,
          name: body.name,
          contactEmail: body.contactEmail,
        },
      });

      await appendAuditLog({
        organizationId: request.tenant.organizationId,
        actorId: request.auth.userId,
        action: "client.created",
        entityType: "client",
        entityId: client.id,
        metadata: { name: client.name },
      });

      reply.status(201).send({ client });
    },
  );

  app.patch(
    "/api/v1/tenant/clients/:id",
    {
      preHandler: [requireAuth, requireTenant, requirePolicy("client:write")],
    },
    async (request, reply) => {
      if (!request.auth || !request.tenant) {
        reply.status(401).send({
          code: "TENANT_CONTEXT_MISSING",
          message: "Tenant context is required",
        });
        return;
      }

      const params = parseInput(
        idParamsSchema,
        request.params,
        reply,
        "params",
      );
      if (!params) {
        return;
      }
      const body = parseInput(clientUpdateSchema, request.body, reply);
      if (!body) {
        return;
      }

      const existing = await prisma.client.findFirst({
        where: {
          id: params.id,
          organizationId: request.tenant.organizationId,
        },
      });

      if (!existing) {
        reply.status(404).send({
          code: "CLIENT_NOT_FOUND",
          message: "Client not found in tenant scope",
        });
        return;
      }

      const client = await prisma.client.update({
        where: { id: existing.id },
        data: {
          name: body.name ?? existing.name,
          contactEmail:
            body.contactEmail === undefined
              ? existing.contactEmail
              : body.contactEmail,
        },
      });

      await appendAuditLog({
        organizationId: request.tenant.organizationId,
        actorId: request.auth.userId,
        action: "client.updated",
        entityType: "client",
        entityId: client.id,
        metadata: { name: client.name },
      });

      reply.send({ client });
    },
  );

  app.delete(
    "/api/v1/tenant/clients/:id",
    {
      preHandler: [requireAuth, requireTenant, requirePolicy("client:delete")],
    },
    async (request, reply) => {
      if (!request.auth || !request.tenant) {
        reply.status(401).send({
          code: "TENANT_CONTEXT_MISSING",
          message: "Tenant context is required",
        });
        return;
      }

      const params = parseInput(
        idParamsSchema,
        request.params,
        reply,
        "params",
      );
      if (!params) {
        return;
      }

      const target = await prisma.client.findFirst({
        where: {
          id: params.id,
          organizationId: request.tenant.organizationId,
        },
        select: { id: true },
      });

      if (!target) {
        reply.status(404).send({
          code: "CLIENT_NOT_FOUND",
          message: "Client not found in tenant scope",
        });
        return;
      }

      await prisma.client.delete({ where: { id: target.id } });
      await appendAuditLog({
        organizationId: request.tenant.organizationId,
        actorId: request.auth.userId,
        action: "client.deleted",
        entityType: "client",
        entityId: target.id,
      });

      reply.send({ success: true });
    },
  );

  app.get(
    "/api/v1/tenant/projects",
    { preHandler: [requireAuth, requireTenant] },
    async (request, reply) => {
      if (!request.tenant) {
        reply.status(401).send({
          code: "TENANT_CONTEXT_MISSING",
          message: "Tenant context is required",
        });
        return;
      }

      const query = parseInput(
        projectListQuerySchema,
        request.query,
        reply,
        "query",
      );
      if (!query) {
        return;
      }

      const where: Prisma.ProjectWhereInput = {
        organizationId: request.tenant.organizationId,
      };

      if (query.workspaceId) {
        where.workspaceId = query.workspaceId;
      }
      if (query.clientId) {
        where.clientId = query.clientId;
      }
      if (query.status) {
        where.status = query.status;
      }
      if (query.search) {
        where.name = { contains: query.search, mode: "insensitive" };
      }

      const skip = (query.page - 1) * query.limit;
      const [projects, total] = await prisma.$transaction([
        prisma.project.findMany({
          where,
          skip,
          take: query.limit,
          orderBy: {
            [query.sortBy]: query.sortOrder,
          },
          include: {
            workspace: {
              select: { id: true, name: true, key: true },
            },
            client: {
              select: { id: true, name: true },
            },
            _count: {
              select: { tasks: true },
            },
          },
        }),
        prisma.project.count({ where }),
      ]);

      reply.send({
        projects,
        pagination: toPagination(query.page, query.limit, total),
      });
    },
  );

  app.post(
    "/api/v1/tenant/projects",
    {
      preHandler: [
        requireAuth,
        requireTenant,
        requirePolicy("project:write"),
        enforceUsageLimit("projects"),
      ],
    },
    async (request, reply) => {
      if (!request.auth || !request.tenant) {
        reply.status(401).send({
          code: "TENANT_CONTEXT_MISSING",
          message: "Tenant context is required",
        });
        return;
      }

      const body = parseInput(projectCreateSchema, request.body, reply);
      if (!body) {
        return;
      }

      const workspace = await ensureWorkspaceBelongsToTenant(
        request.tenant.organizationId,
        body.workspaceId,
      );
      if (!workspace) {
        reply.status(404).send({
          code: "WORKSPACE_NOT_FOUND",
          message: "Workspace not found in tenant scope",
        });
        return;
      }

      if (body.clientId) {
        const client = await ensureClientBelongsToTenant(
          request.tenant.organizationId,
          body.clientId,
        );
        if (!client) {
          reply.status(404).send({
            code: "CLIENT_NOT_FOUND",
            message: "Client not found in tenant scope",
          });
          return;
        }
      }

      const project = await prisma.project.create({
        data: {
          organizationId: request.tenant.organizationId,
          workspaceId: body.workspaceId,
          clientId: body.clientId ?? null,
          name: body.name,
          status: body.status,
        },
      });

      await appendAuditLog({
        organizationId: request.tenant.organizationId,
        actorId: request.auth.userId,
        action: "project.created",
        entityType: "project",
        entityId: project.id,
        metadata: { status: project.status, name: project.name },
      });

      reply.status(201).send({ project });
    },
  );

  app.get(
    "/api/v1/tenant/projects/:id",
    { preHandler: [requireAuth, requireTenant] },
    async (request, reply) => {
      if (!request.tenant) {
        reply.status(401).send({
          code: "TENANT_CONTEXT_MISSING",
          message: "Tenant context is required",
        });
        return;
      }

      const params = parseInput(
        idParamsSchema,
        request.params,
        reply,
        "params",
      );
      if (!params) {
        return;
      }

      const project = await prisma.project.findFirst({
        where: {
          id: params.id,
          organizationId: request.tenant.organizationId,
        },
        include: {
          workspace: true,
          client: true,
          tasks: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });

      if (!project) {
        reply.status(404).send({
          code: "PROJECT_NOT_FOUND",
          message: "Project not found in tenant scope",
        });
        return;
      }

      reply.send({ project });
    },
  );

  app.patch(
    "/api/v1/tenant/projects/:id",
    {
      preHandler: [requireAuth, requireTenant, requirePolicy("project:write")],
    },
    async (request, reply) => {
      if (!request.auth || !request.tenant) {
        reply.status(401).send({
          code: "TENANT_CONTEXT_MISSING",
          message: "Tenant context is required",
        });
        return;
      }

      const params = parseInput(
        idParamsSchema,
        request.params,
        reply,
        "params",
      );
      if (!params) {
        return;
      }
      const body = parseInput(projectUpdateSchema, request.body, reply);
      if (!body) {
        return;
      }

      const existing = await prisma.project.findFirst({
        where: {
          id: params.id,
          organizationId: request.tenant.organizationId,
        },
      });

      if (!existing) {
        reply.status(404).send({
          code: "PROJECT_NOT_FOUND",
          message: "Project not found in tenant scope",
        });
        return;
      }

      if (body.workspaceId) {
        const workspace = await ensureWorkspaceBelongsToTenant(
          request.tenant.organizationId,
          body.workspaceId,
        );
        if (!workspace) {
          reply.status(404).send({
            code: "WORKSPACE_NOT_FOUND",
            message: "Workspace not found in tenant scope",
          });
          return;
        }
      }

      if (body.clientId) {
        const client = await ensureClientBelongsToTenant(
          request.tenant.organizationId,
          body.clientId,
        );
        if (!client) {
          reply.status(404).send({
            code: "CLIENT_NOT_FOUND",
            message: "Client not found in tenant scope",
          });
          return;
        }
      }

      const project = await prisma.project.update({
        where: { id: existing.id },
        data: {
          name: body.name ?? existing.name,
          status: body.status ?? existing.status,
          workspaceId: body.workspaceId ?? existing.workspaceId,
          clientId:
            body.clientId === undefined ? existing.clientId : body.clientId,
        },
      });

      await appendAuditLog({
        organizationId: request.tenant.organizationId,
        actorId: request.auth.userId,
        action: "project.updated",
        entityType: "project",
        entityId: project.id,
        metadata: { status: project.status, name: project.name },
      });

      reply.send({ project });
    },
  );

  app.delete(
    "/api/v1/tenant/projects/:id",
    {
      preHandler: [requireAuth, requireTenant, requirePolicy("project:delete")],
    },
    async (request, reply) => {
      if (!request.auth || !request.tenant) {
        reply.status(401).send({
          code: "TENANT_CONTEXT_MISSING",
          message: "Tenant context is required",
        });
        return;
      }

      const params = parseInput(
        idParamsSchema,
        request.params,
        reply,
        "params",
      );
      if (!params) {
        return;
      }

      const target = await prisma.project.findFirst({
        where: {
          id: params.id,
          organizationId: request.tenant.organizationId,
        },
        select: { id: true },
      });

      if (!target) {
        reply.status(404).send({
          code: "PROJECT_NOT_FOUND",
          message: "Project not found in tenant scope",
        });
        return;
      }

      await prisma.project.delete({ where: { id: target.id } });
      await appendAuditLog({
        organizationId: request.tenant.organizationId,
        actorId: request.auth.userId,
        action: "project.deleted",
        entityType: "project",
        entityId: target.id,
      });

      reply.send({ success: true });
    },
  );

  app.get(
    "/api/v1/tenant/tasks",
    { preHandler: [requireAuth, requireTenant] },
    async (request, reply) => {
      if (!request.tenant) {
        reply.status(401).send({
          code: "TENANT_CONTEXT_MISSING",
          message: "Tenant context is required",
        });
        return;
      }

      const query = parseInput(
        taskListQuerySchema,
        request.query,
        reply,
        "query",
      );
      if (!query) {
        return;
      }

      const where: Prisma.TaskWhereInput = {
        organizationId: request.tenant.organizationId,
      };

      if (query.projectId) {
        where.projectId = query.projectId;
      }
      if (query.status) {
        where.status = query.status;
      }
      if (query.search) {
        where.OR = [
          { title: { contains: query.search, mode: "insensitive" } },
          { description: { contains: query.search, mode: "insensitive" } },
        ];
      }
      if (query.dueFrom || query.dueTo) {
        where.dueDate = {};
        if (query.dueFrom) {
          where.dueDate.gte = query.dueFrom;
        }
        if (query.dueTo) {
          where.dueDate.lte = query.dueTo;
        }
      }

      const skip = (query.page - 1) * query.limit;
      const [tasks, total] = await prisma.$transaction([
        prisma.task.findMany({
          where,
          skip,
          take: query.limit,
          orderBy: {
            [query.sortBy]: query.sortOrder,
          },
          include: {
            project: {
              select: { id: true, name: true, status: true },
            },
          },
        }),
        prisma.task.count({ where }),
      ]);

      reply.send({
        tasks,
        pagination: toPagination(query.page, query.limit, total),
      });
    },
  );

  app.post(
    "/api/v1/tenant/tasks",
    {
      preHandler: [requireAuth, requireTenant, requirePolicy("task:write")],
    },
    async (request, reply) => {
      if (!request.auth || !request.tenant) {
        reply.status(401).send({
          code: "TENANT_CONTEXT_MISSING",
          message: "Tenant context is required",
        });
        return;
      }

      const body = parseInput(taskCreateSchema, request.body, reply);
      if (!body) {
        return;
      }

      const project = await ensureProjectBelongsToTenant(
        request.tenant.organizationId,
        body.projectId,
      );
      if (!project) {
        reply.status(404).send({
          code: "PROJECT_NOT_FOUND",
          message: "Project not found in tenant scope",
        });
        return;
      }

      const task = await prisma.task.create({
        data: {
          organizationId: request.tenant.organizationId,
          projectId: body.projectId,
          title: body.title,
          description: body.description,
          status: body.status,
          dueDate: body.dueDate,
        },
      });

      await appendAuditLog({
        organizationId: request.tenant.organizationId,
        actorId: request.auth.userId,
        action: "task.created",
        entityType: "task",
        entityId: task.id,
        metadata: { status: task.status, title: task.title },
      });

      reply.status(201).send({ task });
    },
  );

  app.patch(
    "/api/v1/tenant/tasks/:id",
    {
      preHandler: [requireAuth, requireTenant, requirePolicy("task:write")],
    },
    async (request, reply) => {
      if (!request.auth || !request.tenant) {
        reply.status(401).send({
          code: "TENANT_CONTEXT_MISSING",
          message: "Tenant context is required",
        });
        return;
      }

      const params = parseInput(
        idParamsSchema,
        request.params,
        reply,
        "params",
      );
      if (!params) {
        return;
      }
      const body = parseInput(taskUpdateSchema, request.body, reply);
      if (!body) {
        return;
      }

      const existing = await prisma.task.findFirst({
        where: {
          id: params.id,
          organizationId: request.tenant.organizationId,
        },
      });

      if (!existing) {
        reply.status(404).send({
          code: "TASK_NOT_FOUND",
          message: "Task not found in tenant scope",
        });
        return;
      }

      const whereForUpdate: Prisma.TaskWhereInput = {
        id: existing.id,
        organizationId: request.tenant.organizationId,
      };

      if (body.expectedVersion !== undefined) {
        whereForUpdate.version = body.expectedVersion;
      }

      const updateResult = await prisma.task.updateMany({
        where: whereForUpdate,
        data: {
          title: body.title ?? existing.title,
          description:
            body.description === undefined
              ? existing.description
              : body.description,
          status: body.status ?? existing.status,
          dueDate: body.dueDate === undefined ? existing.dueDate : body.dueDate,
          version: {
            increment: 1,
          },
        },
      });

      if (updateResult.count === 0) {
        reply.status(409).send({
          code: "VERSION_CONFLICT",
          message:
            "Task was modified by another operation. Refresh and retry with latest version.",
        });
        return;
      }

      const task = await prisma.task.findUnique({ where: { id: existing.id } });
      if (!task) {
        reply.status(404).send({
          code: "TASK_NOT_FOUND",
          message: "Task not found",
        });
        return;
      }

      await appendAuditLog({
        organizationId: request.tenant.organizationId,
        actorId: request.auth.userId,
        action: "task.updated",
        entityType: "task",
        entityId: task.id,
        metadata: {
          status: task.status,
          title: task.title,
          version: task.version,
        },
      });

      reply.send({ task });
    },
  );

  app.delete(
    "/api/v1/tenant/tasks/:id",
    {
      preHandler: [requireAuth, requireTenant, requirePolicy("task:delete")],
    },
    async (request, reply) => {
      if (!request.auth || !request.tenant) {
        reply.status(401).send({
          code: "TENANT_CONTEXT_MISSING",
          message: "Tenant context is required",
        });
        return;
      }

      const params = parseInput(
        idParamsSchema,
        request.params,
        reply,
        "params",
      );
      if (!params) {
        return;
      }

      const target = await prisma.task.findFirst({
        where: {
          id: params.id,
          organizationId: request.tenant.organizationId,
        },
        select: { id: true },
      });

      if (!target) {
        reply.status(404).send({
          code: "TASK_NOT_FOUND",
          message: "Task not found in tenant scope",
        });
        return;
      }

      await prisma.task.delete({ where: { id: target.id } });
      await appendAuditLog({
        organizationId: request.tenant.organizationId,
        actorId: request.auth.userId,
        action: "task.deleted",
        entityType: "task",
        entityId: target.id,
      });

      reply.send({ success: true });
    },
  );

  app.get(
    "/api/v1/tenant/audit-logs",
    {
      preHandler: [requireAuth, requireTenant, requireFeature("audit_logs")],
    },
    async (request, reply) => {
      if (!request.tenant) {
        reply.status(401).send({
          code: "TENANT_CONTEXT_MISSING",
          message: "Tenant context is required",
        });
        return;
      }

      const query = parseInput(
        auditLogQuerySchema,
        request.query,
        reply,
        "query",
      );
      if (!query) {
        return;
      }

      const where: Prisma.AuditLogWhereInput = {
        organizationId: request.tenant.organizationId,
      };

      if (query.action) {
        where.action = query.action;
      }
      if (query.entityType) {
        where.entityType = query.entityType;
      }

      const skip = (query.page - 1) * query.limit;
      const [logs, total] = await prisma.$transaction([
        prisma.auditLog.findMany({
          where,
          skip,
          take: query.limit,
          orderBy: { createdAt: "desc" },
          include: {
            actor: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
          },
        }),
        prisma.auditLog.count({ where }),
      ]);

      reply.send({
        logs,
        pagination: toPagination(query.page, query.limit, total),
      });
    },
  );
}
