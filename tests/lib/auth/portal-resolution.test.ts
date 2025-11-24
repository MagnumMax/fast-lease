import { describe, expect, it } from "vitest";

import {
  heuristicPortalsForEmail,
  inferPortalForEmail,
  resolvePortalFromAuthUser,
  resolveRedirectPathForPortal,
} from "@/lib/auth/portal-resolution";

describe("heuristicPortalsForEmail / inferPortalForEmail", () => {
  it("prioritizes internal domains for the app portal", () => {
    expect(heuristicPortalsForEmail("ops@fastlease.ae")).toEqual(["app"]);
    expect(inferPortalForEmail("ops@fastlease.ae")).toBe("app");
  });

  it("routes known client e2e emails to the client portal", () => {
    expect(inferPortalForEmail("client@fastlease.ae")).toBe("client");
    expect(heuristicPortalsForEmail("client@fastlease.ae")).toEqual(["client"]);
  });

  it("routes investor hints to the investor portal", () => {
    expect(inferPortalForEmail("ceo@investor-holdings.com")).toBe("investor");
  });

  it("defaults to the client portal for unknown domains", () => {
    expect(inferPortalForEmail("driver@example.com")).toBe("client");
    expect(heuristicPortalsForEmail("driver@example.com")).toEqual(["client"]);
  });
});

describe("resolvePortalFromAuthUser", () => {
  it("selects portal based on metadata roles when available", () => {
    const resolution = resolvePortalFromAuthUser({
      email: "client@example.com",
      app_metadata: { roles: ["CLIENT"] },
      user_metadata: {},
    } as Parameters<typeof resolvePortalFromAuthUser>[0]);

    expect(resolution.portal).toBe("client");
    expect(resolution.roles).toEqual(["CLIENT"]);
    expect(resolution.preferredRole).toBe("CLIENT");
  });

  it("falls back to email heuristics when metadata lacks roles", () => {
    const resolution = resolvePortalFromAuthUser(
      {
        email: "ops@fastlease.ae",
        app_metadata: {},
        user_metadata: {},
      } as Parameters<typeof resolvePortalFromAuthUser>[0],
      "ops@fastlease.ae",
    );

    expect(resolution.portal).toBe("app");
    expect(resolution.roles).toEqual([]);
    expect(resolution.preferredRole).toBeNull();
  });
});

describe("resolveRedirectPathForPortal", () => {
  it("honours explicit next path when provided", () => {
    const redirect = resolveRedirectPathForPortal("client", {
      nextPath: "/client/documents",
    });

    expect(redirect).toBe("/client/documents");
  });

  it("uses preferred role mapping before role arrays", () => {
    const redirect = resolveRedirectPathForPortal("client", {
      preferredRole: "INVESTOR",
    });

    expect(redirect).toBe("/investor/dashboard");
  });

  it("falls back to role-based home path when preferred role is missing", () => {
    const redirect = resolveRedirectPathForPortal("client", {
      roles: ["CLIENT"],
    });

    expect(redirect).toBe("/client/dashboard");
  });

  it("falls back to portal home path when no roles exist", () => {
    expect(resolveRedirectPathForPortal("client")).toBe("/client/dashboard");
  });
});
