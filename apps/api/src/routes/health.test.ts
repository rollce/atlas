import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildServer } from "../index.js";
import { registerSecurityPlugins } from "../plugins/security.js";
import { healthRoutes } from "./health.js";
import { v1Routes } from "./v1.js";

const app = buildServer();

beforeAll(async () => {
  await registerSecurityPlugins(app);
  await healthRoutes(app);
  await v1Routes(app);
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("health routes", () => {
  it("GET /health should return ok", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("GET /ready should return ready", async () => {
    const response = await app.inject({ method: "GET", url: "/ready" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ready" });
  });
});
