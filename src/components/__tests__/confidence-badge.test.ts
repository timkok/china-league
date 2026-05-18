import { describe, expect, it } from "vitest";
import { readableConfidence, sourceTypeText } from "../confidence-badge";

describe("readableConfidence", () => {
  it("≥0.90 高可信", () => {
    expect(readableConfidence(0.95).text).toBe("高可信");
    expect(readableConfidence(0.9).text).toBe("高可信");
  });
  it("0.70-0.89 中高可信", () => {
    expect(readableConfidence(0.75).text).toBe("中高可信");
    expect(readableConfidence(0.7).text).toBe("中高可信");
    expect(readableConfidence(0.89).text).toBe("中高可信");
  });
  it("0.50-0.69 待核验", () => {
    expect(readableConfidence(0.55).text).toBe("待核验");
    expect(readableConfidence(0.5).text).toBe("待核验");
  });
  it("<0.50 低可信", () => {
    expect(readableConfidence(0.3).text).toBe("低可信");
    expect(readableConfidence(0).text).toBe("低可信");
  });
  it("null/undefined → 未知", () => {
    expect(readableConfidence(null).text).toBe("未知");
    expect(readableConfidence(undefined).text).toBe("未知");
  });
});

describe("sourceTypeText", () => {
  it("各类型中文映射", () => {
    expect(sourceTypeText("OFFICIAL_LEAGUE")).toBe("联赛/足协官方");
    expect(sourceTypeText("OFFICIAL_CLUB")).toBe("俱乐部官方");
    expect(sourceTypeText("MEDIA")).toBe("权威媒体");
    expect(sourceTypeText("SOCIAL")).toBe("社交媒体");
    expect(sourceTypeText("MANUAL")).toBe("人工录入");
    expect(sourceTypeText("UNKNOWN")).toBe("未知来源");
  });
});
