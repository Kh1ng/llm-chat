import { describe, it, expect } from "vitest";
import { isValidAddress, isValidMacAddress } from "../../src/utils/validation";

describe("Validation Functions", () => {
  describe("isValidAddress", () => {
    it("should return true for valid IP address with port", () => {
      expect(isValidAddress("192.168.1.1:8080")).toBe(true);
    });

    it("should return false for invalid IP address", () => {
      expect(isValidAddress("999.999.999.999")).toBe(false);
    });

    it("should return true for valid domain with optional port", () => {
      expect(isValidAddress("example.com:3000")).toBe(true);
      expect(isValidAddress("example.com")).toBe(true);
    });

    it("should return false for empty input", () => {
      expect(isValidAddress("")).toBe(false);
    });
  });

  describe("isValidMacAddress", () => {
    it("should return true for valid MAC address", () => {
      expect(isValidMacAddress("AA:BB:CC:DD:EE:FF")).toBe(true);
    });

    it("should return false for invalid MAC address", () => {
      expect(isValidMacAddress("ZZ:ZZ:ZZ:ZZ:ZZ:ZZ")).toBe(false);
    });

    it("should return false for empty input", () => {
      expect(isValidMacAddress("")).toBe(false);
    });
  });
});
