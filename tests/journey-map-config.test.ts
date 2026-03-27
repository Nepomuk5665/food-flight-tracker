import { describe, it, expect } from "vitest";
import {
  MAP_INTERACTION_CONFIG,
  INITIAL_VIEW_STATE,
} from "@/components/journey/journey-map-config";

describe("JourneyMap interaction configuration", () => {
  describe("globe zoom constraints", () => {
    it("should enforce a minimum zoom of 1.5 to prevent globe instability", () => {
      expect(INITIAL_VIEW_STATE.minZoom).toBe(1.5);
    });

    it("should allow zooming in to at least level 16 for street-level detail", () => {
      expect(INITIAL_VIEW_STATE.maxZoom).toBeGreaterThanOrEqual(16);
    });
  });

  describe("touch pitch prevention", () => {
    it("should disable touch-initiated pitch changes to prevent viewport jumps", () => {
      expect(MAP_INTERACTION_CONFIG.touchPitch).toBe(false);
    });
  });

  describe("pitch constraints", () => {
    it("should cap max pitch to prevent extreme angles during flyTo", () => {
      expect(MAP_INTERACTION_CONFIG.maxPitch).toBeLessThanOrEqual(60);
      expect(MAP_INTERACTION_CONFIG.maxPitch).toBeGreaterThan(0);
    });
  });
});
