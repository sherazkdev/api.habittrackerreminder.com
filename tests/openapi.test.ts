import { describe, expect, it } from "vitest";
import { buildOpenApiSpec } from "@/lib/openapi";

describe("OpenAPI mobile spec", () => {
  const spec = buildOpenApiSpec("full");

  it("documents FCM-token auth and no x-user-id", () => {
    expect(spec.components.securitySchemes.fcmTokenAuth).toMatchObject({
      name: "x-fcm-token",
      in: "header",
    });
    expect(spec.info.description).toContain("x-fcm-token");
    expect(spec.info.description).toContain("x-user-id");
  });

  it("requires x-fcm-token on reminder routes", () => {
    const create = spec.paths["/api/v1/habits/reminder"].post;
    expect(create.security).toEqual([{ apiKeyAuth: [], fcmTokenAuth: [] }]);
    expect(create.parameters).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "x-fcm-token", required: true })]),
    );
  });

  it("registers devices with api key only", () => {
    const register = spec.paths["/api/v1/devices"].post;
    expect(register.security).toEqual([{ apiKeyAuth: [] }]);
    expect(register.requestBody.content["application/json"].schema.properties.fcmToken).toBeDefined();
  });
});
