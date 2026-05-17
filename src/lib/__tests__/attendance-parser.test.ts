import { describe, expect, it } from "vitest";
import {
  parseAttendanceFromText,
  pickBestSingleMatchAttendance,
} from "../attendance-parser";

describe("parseAttendanceFromText", () => {
  it("解析 现场观众人数达 31569 人", () => {
    const r = parseAttendanceFromText("本场比赛现场观众人数达 31569 人。");
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].count).toBe(31569);
    expect(r[0].estimated).toBe(false);
    expect(r[0].isPerMatchAverage).toBe(false);
  });

  it("解析 单场上座 39868 人", () => {
    const r = parseAttendanceFromText("数据显示，单场上座 39868 人，再创新高。");
    expect(r.some((x) => x.count === 39868)).toBe(true);
  });

  it("解析 到场观众 62330 人", () => {
    const r = parseAttendanceFromText("到场观众 62330 人，气氛热烈。");
    expect(r.some((x) => x.count === 62330)).toBe(true);
  });

  it("场均 25754 人 应标记为 per-match-average", () => {
    const r = parseAttendanceFromText("本赛季场均 25754 人，位列联赛第一。");
    const avg = r.find((x) => x.count === 25754);
    expect(avg).toBeDefined();
    expect(avg!.isPerMatchAverage).toBe(true);
    // 应被排除在 best single match 之外
    expect(pickBestSingleMatchAttendance(r)).toBeNull();
  });

  it("超过 4 万人 -> 40000 estimated=true", () => {
    const r = parseAttendanceFromText("现场观众超过 4 万人。");
    const e = r.find((x) => x.count === 40000);
    expect(e).toBeDefined();
    expect(e!.estimated).toBe(true);
  });

  it("近 3 万人 -> 30000 estimated=true", () => {
    const r = parseAttendanceFromText("据估计现场观众近 3 万人到场。");
    const e = r.find((x) => x.count === 30000);
    expect(e).toBeDefined();
    expect(e!.estimated).toBe(true);
  });

  it("1.6 万 -> 16000", () => {
    const r = parseAttendanceFromText("现场观众约 1.6 万");
    const e = r.find((x) => x.count === 16000);
    expect(e).toBeDefined();
    expect(e!.estimated).toBe(true);
  });

  it("观众人数为 29,000", () => {
    const r = parseAttendanceFromText("观众人数为 29,000，比赛精彩。");
    const e = r.find((x) => x.count === 29000);
    expect(e).toBeDefined();
  });

  it("预计吸引数万观众 不能写入单场（uncertain 或无有效数字）", () => {
    const r = parseAttendanceFromText("赛前预计吸引数万观众到场。");
    // 没有具体数字
    const best = pickBestSingleMatchAttendance(r);
    expect(best).toBeNull();
  });

  it("含 \"预计 5 万人\" 时 uncertain=true", () => {
    const r = parseAttendanceFromText("现场观众预计 5 万人。");
    const e = r.find((x) => x.count === 50000);
    expect(e).toBeDefined();
    expect(e!.uncertain).toBe(true);
    expect(pickBestSingleMatchAttendance(r)).toBeNull();
  });

  it("上座率 不应被识别为人数", () => {
    const r = parseAttendanceFromText("上座率 78%，气氛热烈。");
    expect(r.some((x) => x.matchedKeyword === "上座率")).toBe(false);
  });

  it("pickBestSingleMatchAttendance 选非估算优先", () => {
    const parsed = parseAttendanceFromText(
      "现场观众人数达 31569 人，赛前预计超过 4 万人到场。"
    );
    const best = pickBestSingleMatchAttendance(parsed);
    expect(best?.count).toBe(31569);
  });
});
