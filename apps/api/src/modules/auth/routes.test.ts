import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildServer } from "../../index.js";
import { registerSecurityPlugins } from "../../plugins/security.js";
import { authRoutes } from "./routes.js";

const app = buildServer();

beforeAll(async () => {
  await registerSecurityPlugins(app);
  await authRoutes(app);
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("auth route validation", () => {
  it("returns altcha challenge payload", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/auth/altcha",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      algorithm: expect.any(String),
      challenge: expect.any(String),
      salt: expect.any(String),
      signature: expect.any(String),
    });
  });

  it("rejects invalid login payload", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "broken" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("VALIDATION_ERROR");
  });

  it("rejects invalid refresh payload", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: { refreshToken: "short" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("VALIDATION_ERROR");
  });

  it("rejects sessions endpoint without auth token", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/auth/sessions",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe("UNAUTHORIZED");
  });
});
