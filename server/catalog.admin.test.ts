import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function nonAdminContext(): TrpcContext {
  return {
    user: {
      id: 7,
      openId: "catalog-viewer",
      name: "Catalog Viewer",
      email: "viewer@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function adminContext(): TrpcContext {
  return {
    ...nonAdminContext(),
    user: {
      ...nonAdminContext().user!,
      id: 1,
      openId: "catalog-admin",
      role: "admin",
    },
  };
}

describe("catalog administration", () => {
  it("rejects Firebase health checks from non-admin users", async () => {
    const caller = appRouter.createCaller(nonAdminContext());
    await expect(caller.catalog.firebaseStatus()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.catalog.adminList()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns management-safe record readiness data to admins", async () => {
    const caller = appRouter.createCaller(adminContext());
    const records = await caller.catalog.adminList();

    expect(records.length).toBeGreaterThan(0);
    expect(records[0]).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      affiliateReady: expect.any(Boolean),
    });
    expect(Object.keys(records[0] || {})).not.toContain("affiliateUrl");
    expect(JSON.stringify(records)).not.toContain("affiliate_link");
  }, 15_000);
});
