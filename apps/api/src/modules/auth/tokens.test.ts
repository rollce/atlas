import { describe, expect, it } from "vitest";
import {
  getRefreshTokenExpiryDate,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "./tokens.js";

describe("auth tokens", () => {
  it("signs and verifies access token", () => {
    const token = signAccessToken("user-1", "session-1");
    const claims = verifyAccessToken(token);

    expect(claims.sub).toBe("user-1");
    expect(claims.sid).toBe("session-1");
    expect(claims.typ).toBe("access");
  });

  it("signs and verifies refresh token", () => {
    const token = signRefreshToken("user-2", "session-2");
    const claims = verifyRefreshToken(token);

    expect(claims.sub).toBe("user-2");
    expect(claims.sid).toBe("session-2");
    expect(claims.typ).toBe("refresh");
  });

  it("returns refresh expiry date in the future", () => {
    const expiresAt = getRefreshTokenExpiryDate();
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
