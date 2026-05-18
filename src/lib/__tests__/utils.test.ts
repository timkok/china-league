import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateShort,
  formatNumber,
  formatRelative,
  formatTime,
} from "../utils";

describe("utils", () => {
  it("formatNumber 千位分隔，使用中文 locale", () => {
    expect(formatNumber(41832)).toBe("41,832");
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(undefined)).toBe("—");
  });

  it("formatDate 固定使用 Asia/Shanghai 时区", () => {
    // UTC 2025-04-12 11:35:00 = 北京 19:35
    const utc = new Date("2025-04-12T11:35:00Z");
    expect(formatDate(utc)).toBe("2025/04/12 19:35");
  });

  it("formatDateShort 输出 YYYY/MM/DD", () => {
    const utc = new Date("2025-04-12T11:35:00Z");
    expect(formatDateShort(utc)).toBe("2025/04/12");
  });

  it("formatTime 输出 HH:mm", () => {
    const utc = new Date("2025-04-12T11:35:00Z");
    expect(formatTime(utc)).toBe("19:35");
  });

  it("formatRelative", () => {
    expect(formatRelative(new Date(Date.now() - 30_000))).toBe("刚刚");
    expect(formatRelative(new Date(Date.now() + 30_000))).toBe("稍后");
    expect(formatRelative(new Date(Date.now() - 3 * 60_000))).toMatch(/3 分钟前/);
    expect(formatRelative(new Date(Date.now() + 2 * 60 * 60_000))).toMatch(/2 小时后/);
    expect(formatRelative(null)).toBe("—");
  });

  it("formatDate 处理 null/undefined/非法日期", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
  });
});
