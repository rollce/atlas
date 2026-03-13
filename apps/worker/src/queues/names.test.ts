import { describe, expect, it } from "vitest";
import { queueNames } from "./names.js";

describe("queue names", () => {
  it("contains core queues", () => {
    expect(queueNames).toMatchObject({
      email: "email",
      invitations: "invitations",
      audit: "audit",
      reports: "reports",
      cleanup: "cleanup",
      deadLetter: "dead-letter",
    });
  });
});
