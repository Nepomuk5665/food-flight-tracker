import { describe, it, expect } from "vitest";
import { parseGS1, type GS1Data } from "@/lib/scanner/gs1-parser";

describe("parseGS1", () => {
  describe("empty / whitespace input", () => {
    it("returns empty object for empty string", () => {
      expect(parseGS1("")).toEqual({});
    });

    it("returns empty object for whitespace-only input", () => {
      expect(parseGS1("   ")).toEqual({});
    });
  });

  describe("parenthesized format", () => {
    it("parses GTIN from (01)", () => {
      const result = parseGS1("(01)04012345678901");
      expect(result.gtin).toBe("04012345678901");
    });

    it("parses batch from (10)", () => {
      const result = parseGS1("(10)LOT123");
      expect(result.batch).toBe("LOT123");
    });

    it("parses expiry date from (17)", () => {
      const result = parseGS1("(17)261231");
      expect(result.expiryDate).toBe("261231");
    });

    it("parses serial from (21)", () => {
      const result = parseGS1("(21)SN456789");
      expect(result.serial).toBe("SN456789");
    });

    it("parses all four AIs together", () => {
      const raw = "(01)04012345678901(17)261231(10)BATCH42(21)SER001";
      const result = parseGS1(raw);
      expect(result).toEqual({
        gtin: "04012345678901",
        expiryDate: "261231",
        batch: "BATCH42",
        serial: "SER001",
      });
    });

    it("trims whitespace around values", () => {
      const result = parseGS1("(01) 04012345678901 (10) LOT ");
      expect(result.gtin).toBe("04012345678901");
      expect(result.batch).toBe("LOT");
    });

    it("ignores unknown AIs", () => {
      const result = parseGS1("(99)UNKNOWN(01)04012345678901");
      expect(result.gtin).toBe("04012345678901");
      expect(result).not.toHaveProperty("99");
    });
  });

  describe("raw AI string format (no parentheses)", () => {
    it("parses GTIN with fixed-length AI 01", () => {
      const result = parseGS1("0104012345678901");
      expect(result.gtin).toBe("04012345678901");
    });

    it("parses expiry date with fixed-length AI 17", () => {
      const result = parseGS1("1726123110BATCH42");
      expect(result.expiryDate).toBe("261231");
      expect(result.batch).toBe("BATCH42");
    });

    it("parses GTIN + batch together", () => {
      const result = parseGS1("010401234567890110LOT123");
      expect(result.gtin).toBe("04012345678901");
      expect(result.batch).toBe("LOT123");
    });

    it("parses GTIN + expiry + batch with GS delimiters", () => {
      const result = parseGS1("0104012345678901172612311\u001d0BATCH42");
      expect(result.gtin).toBe("04012345678901");
      expect(result.expiryDate).toBe("261231");
      expect(result.batch).toBe("BATCH42");
    });

    it("strips GS1 group separator characters", () => {
      const result = parseGS1("010401234567890110LOT\u001d21SER");
      expect(result.gtin).toBe("04012345678901");
      expect(result.batch).toBe("LOT");
      expect(result.serial).toBe("SER");
    });

    it("returns empty for string with no recognizable AI structure", () => {
      const result = parseGS1("ABCDEF");
      expect(result).toEqual({});
    });
  });

  describe("fallback behavior", () => {
    it("returns empty when no known AIs are found", () => {
      const result = parseGS1("ABCDEF");
      expect(result).toEqual({});
    });

    it("prefers parenthesized format when both could match", () => {
      const raw = "(01)04012345678901";
      const result = parseGS1(raw);
      expect(result.gtin).toBe("04012345678901");
    });
  });
});
