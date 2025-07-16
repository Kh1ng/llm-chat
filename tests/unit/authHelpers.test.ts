import { describe, it, expect } from "vitest";
import {
  resolveAuthHeaderName,
  resolveAuthHeaderValue,
  buildAuthHeader,
} from "../../src/utils/authHelpers";
import { Profile } from "../../src/types/types";

describe("authHelpers", () => {
  describe("resolveAuthHeaderName", () => {
    it("returns empty string for undefined auth", () => {
      expect(resolveAuthHeaderName(undefined)).toBe("");
    });

    it("returns Authorization for bearer auth", () => {
      const auth = { type: "bearer" as const, value: "token123" };
      expect(resolveAuthHeaderName(auth)).toBe("Authorization");
    });

    it("returns Authorization for basic auth", () => {
      const auth = { type: "basic" as const, value: "user:pass" };
      expect(resolveAuthHeaderName(auth)).toBe("Authorization");
    });

    it("returns custom header name for custom auth", () => {
      const auth = { type: "custom" as const, value: "token123", headerName: "X-API-Key" };
      expect(resolveAuthHeaderName(auth)).toBe("X-API-Key");
    });

    it("returns default Authorization for custom auth without headerName", () => {
      const auth = { type: "custom" as const, value: "token123" };
      expect(resolveAuthHeaderName(auth)).toBe("Authorization");
    });
  });

  describe("resolveAuthHeaderValue", () => {
    it("returns empty string for undefined auth", () => {
      expect(resolveAuthHeaderValue(undefined)).toBe("");
    });

    it("returns Bearer token for bearer auth", () => {
      const auth = { type: "bearer" as const, value: "token123" };
      expect(resolveAuthHeaderValue(auth)).toBe("Bearer token123");
    });

    it("returns Basic encoded credentials for basic auth", () => {
      const auth = { type: "basic" as const, value: "user:pass" };
      const expectedEncoded = btoa("user:pass");
      expect(resolveAuthHeaderValue(auth)).toBe(`Basic ${expectedEncoded}`);
    });

    it("returns raw value for custom auth", () => {
      const auth = { type: "custom" as const, value: "secret-api-key", headerName: "X-API-Key" };
      expect(resolveAuthHeaderValue(auth)).toBe("secret-api-key");
    });
  });

  describe("buildAuthHeader", () => {
    it("returns empty object for profile without auth", () => {
      const profile: Profile = { name: "test", address: "localhost", models: [] };
      expect(buildAuthHeader(profile)).toEqual({});
    });

    it("returns empty object for profile with auth but no value", () => {
      const profile: Profile = {
        name: "test",
        address: "localhost",
        models: [],
        auth: { type: "bearer", value: "" },
      };
      expect(buildAuthHeader(profile)).toEqual({});
    });

    it("builds header for bearer auth", () => {
      const profile: Profile = {
        name: "test",
        address: "localhost",
        models: [],
        auth: { type: "bearer", value: "token123" },
      };
      expect(buildAuthHeader(profile)).toEqual({
        Authorization: "Bearer token123",
      });
    });

    it("builds header for basic auth", () => {
      const profile: Profile = {
        name: "test",
        address: "localhost",
        models: [],
        auth: { type: "basic", value: "user:pass" },
      };
      const expectedEncoded = btoa("user:pass");
      expect(buildAuthHeader(profile)).toEqual({
        Authorization: `Basic ${expectedEncoded}`,
      });
    });

    it("builds header for custom auth", () => {
      const profile: Profile = {
        name: "test",
        address: "localhost",
        models: [],
        auth: { type: "custom", value: "secret-key", headerName: "X-API-Key" },
      };
      expect(buildAuthHeader(profile)).toEqual({
        "X-API-Key": "secret-key",
      });
    });
  });
});