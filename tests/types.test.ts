import { describe, it, expect } from "vitest";
import { deriveRiskLevel } from "@/lib/types";

describe("deriveRiskLevel", () => {
  it("returns 'safe' for riskScore 0", () => {
    expect(deriveRiskLevel(0)).toBe("safe");
  });

  it("returns 'safe' for riskScore exactly 20", () => {
    expect(deriveRiskLevel(20)).toBe("safe");
  });

  it("returns 'warning' for riskScore 21", () => {
    expect(deriveRiskLevel(21)).toBe("warning");
  });

  it("returns 'warning' for riskScore exactly 60", () => {
    expect(deriveRiskLevel(60)).toBe("warning");
  });

  it("returns 'critical' for riskScore 61", () => {
    expect(deriveRiskLevel(61)).toBe("critical");
  });

  it("returns 'critical' for riskScore 100", () => {
    expect(deriveRiskLevel(100)).toBe("critical");
  });

  it("returns 'safe' for negative riskScore", () => {
    expect(deriveRiskLevel(-5)).toBe("safe");
  });
});
