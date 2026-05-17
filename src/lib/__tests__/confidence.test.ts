import { describe, expect, it } from "vitest";
import {
  classifyConfidence,
  computeConfidenceScore,
  isEstimateText,
  isUncertainText,
  sourceTypeRank,
} from "../confidence";

describe("confidence", () => {
  it("官方联赛 0.95，估算扣 0.1，不确定扣 0.25", () => {
    expect(computeConfidenceScore({ sourceType: "OFFICIAL_LEAGUE" })).toBeCloseTo(0.95, 2);
    expect(
      computeConfidenceScore({ sourceType: "OFFICIAL_LEAGUE", isEstimate: true })
    ).toBeCloseTo(0.85, 2);
    expect(
      computeConfidenceScore({
        sourceType: "OFFICIAL_LEAGUE",
        hasUncertaintyWords: true,
      })
    ).toBeCloseTo(0.7, 2);
  });

  it("人工录入默认 0.5；verified 时被拉到 ≥0.9", () => {
    expect(computeConfidenceScore({ sourceType: "MANUAL" })).toBeCloseTo(0.5, 2);
    expect(computeConfidenceScore({ sourceType: "MANUAL", verified: true })).toBeGreaterThanOrEqual(
      0.9
    );
  });

  it("classifyConfidence 范围正确", () => {
    expect(classifyConfidence(0.95)).toBe("OFFICIAL");
    expect(classifyConfidence(0.8)).toBe("MEDIA");
    expect(classifyConfidence(0.6)).toBe("SOCIAL");
    expect(classifyConfidence(0.45)).toBe("MANUAL");
    expect(classifyConfidence(0.1)).toBe("UNKNOWN");
  });

  it("isUncertainText / isEstimateText", () => {
    expect(isUncertainText("预计现场观众 5 万")).toBe(true);
    expect(isUncertainText("现场观众 5 万")).toBe(false);
    expect(isEstimateText("超过 4 万人")).toBe(true);
    expect(isEstimateText("近 3 万人")).toBe(true);
    expect(isEstimateText("31569 人")).toBe(false);
  });

  it("sourceTypeRank: 官方 < 媒体 < 社交", () => {
    expect(sourceTypeRank("OFFICIAL_LEAGUE")).toBeLessThan(sourceTypeRank("MEDIA"));
    expect(sourceTypeRank("MEDIA")).toBeLessThan(sourceTypeRank("SOCIAL"));
    expect(sourceTypeRank("SOCIAL")).toBeLessThan(sourceTypeRank("MANUAL"));
  });
});
