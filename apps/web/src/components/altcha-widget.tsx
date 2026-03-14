"use client";

import React, { useEffect } from "react";
import { API_BASE } from "@/lib/api";

export function AltchaWidget({ name = "altcha" }: { name?: string }) {
  useEffect(() => {
    void import("altcha");
  }, []);

  return React.createElement("altcha-widget", {
    challengeurl: `${API_BASE}/auth/altcha`,
    auto: "onsubmit",
    hidefooter: true,
    workers: "4",
    name,
    style: {
      display: "block",
      marginTop: "6px",
    },
  });
}
