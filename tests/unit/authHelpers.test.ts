import { describe, it, expect } from "vitest";
import { 
  resolveAuthHeaderName, 
  resolveAuthHeaderValue, 
  buildAuthHeader 
} from "../../src/utils/authHelpers";
import { Profile } from "../../src/types/types";

describe("authHelpers", () => {
  describe("resolveAuthHeaderName", () => {
    it("returns empty string for no auth", () => {
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
      const auth = { type: "custom" as const, value: "value", headerName: "X-API-Key" };
      expect(resolveAuthHeaderName(auth)).toBe("X-API-Key");
    });

    it("returns Authorization when custom auth has no header name", () => {
      const auth = { type: "custom" as const, value: "value" };
      expect(resolveAuthHeaderName(auth)).toBe("Authorization");
    });
  });

  describe("resolveAuthHeaderValue", () => {
    it("returns empty string for no auth", () => {
      expect(resolveAuthHeaderValue(undefined)).toBe("");
    });

    it("returns Bearer prefixed value for bearer auth", () => {
      const auth = { type: "bearer" as const, value: "token123" };
      expect(resolveAuthHeaderValue(auth)).toBe("Bearer token123");
    });

    it("returns Basic encoded value for basic auth", () => {
      const auth = { type: "basic" as const, value: "user:pass" };
      expect(resolveAuthHeaderValue(auth)).toBe("Basic " + btoa("user:pass"));
    });

    it("returns raw value for custom auth", () => {
      const auth = { type: "custom" as const, value: "custom-value" };
      expect(resolveAuthHeaderValue(auth)).toBe("custom-value");
    });

    it("returns raw value for undefined type", () => {
      const auth = { type: undefined as any, value: "some-value" };
      expect(resolveAuthHeaderValue(auth)).toBe("some-value");
    });
  });

  describe("buildAuthHeader", () => {
    it("returns empty object for profile with no auth", () => {
      const profile: Profile = { name: "test", address: "localhost", port: 8080, models: [] };
      expect(buildAuthHeader(profile)).toEqual({});
    });

    it("returns empty object for profile with auth but no value", () => {
      const profile: Profile = { 
        name: "test", 
        address: "localhost", 
        port: 8080, 
        models: [],
        auth: { type: "bearer", value: "" }
      };
      expect(buildAuthHeader(profile)).toEqual({});
    });

    it("builds proper header for bearer auth", () => {
      const profile: Profile = { 
        name: "test", 
        address: "localhost", 
        port: 8080, 
        models: [],
        auth: { type: "bearer", value: "token123" }
      };
      expect(buildAuthHeader(profile)).toEqual({
        "Authorization": "Bearer token123"
      });
    });

    it("builds proper header for custom auth", () => {
      const profile: Profile = { 
        name: "test", 
        address: "localhost", 
        port: 8080, 
        models: [],
        auth: { type: "custom", value: "api-key-value", headerName: "X-API-Key" }
      };
      expect(buildAuthHeader(profile)).toEqual({
        "X-API-Key": "api-key-value"
      });
    });
  });
});