import { describe, expect, it } from "vitest";
import {
  assertLoginAllowed,
  clearLoginFailures,
  recordLoginFailure,
} from "./brute-force.js";

describe("brute-force protection", () => {
  it("blocks after too many attempts", () => {
    const key = `tester-${Date.now()}`;

    for (let i = 0; i < 5; i += 1) {
      recordLoginFailure(key);
    }

    expect(() => assertLoginAllowed(key)).toThrowError(
      /Too many login attempts/i,
    );
    clearLoginFailures(key);
  });

  it("allows once failures are cleared", () => {
    const key = `tester-clear-${Date.now()}`;

    recordLoginFailure(key);
    clearLoginFailures(key);

    expect(() => assertLoginAllowed(key)).not.toThrow();
  });
});
