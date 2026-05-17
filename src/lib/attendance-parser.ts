/**
 * 中文观众人数解析器
 *
 * 输入：一段新闻 / 战报 / 公告原文
 * 输出：候选的观众人数记录，包含 count / estimated / 是否场均 / 原文片段
 *
 * 支持表达：
 *   - 现场观众人数达 31569 人
 *   - 单场上座 39868 人
 *   - 到场观众 62330 人
 *   - 场均 25754 人
 *   - 超过 4 万人
 *   - 近 3 万人
 *   - 1.6 万
 *   - 观众人数为 29,000
 */

import { ESTIMATE_KEYWORDS, UNCERTAIN_KEYWORDS } from "./confidence";

export type ParsedAttendance = {
  count: number;
  estimated: boolean;       // 是否估算（"超过 4 万"）
  uncertain: boolean;       // 是否含"预计/或将/可能"
  isPerMatchAverage: boolean; // 是否场均，不能直接写入单场
  rawTextExcerpt: string;   // 命中片段（含上下文）
  matchedKeyword: string;   // 触发关键字
};

const ATTENDANCE_TRIGGER_KEYWORDS = [
  "现场观众",
  "到场观众",
  "上座",
  "上座人数",
  "上座率",
  "观众人数",
  "入场人数",
  "现场球迷",
  "现场人数",
  "球迷数",
  "观众",
];

const PER_MATCH_AVERAGE_KEYWORDS = ["场均", "平均上座", "平均观众"];

// 命中 trigger 后，取前后窗口
const WINDOW = 30;

// 将"3.5万"/"近 3 万"等中文数字短语转化为整数
function chineseShortNumberToInt(text: string): number | null {
  // 处理"X万""X千""X.X万"
  // 注意：避免误匹配年份等
  const wanMatch = text.match(/(\d+(?:\.\d+)?)\s*万/);
  if (wanMatch) {
    const n = parseFloat(wanMatch[1]);
    if (!isNaN(n)) return Math.round(n * 10000);
  }
  const qianMatch = text.match(/(\d+(?:\.\d+)?)\s*千/);
  if (qianMatch) {
    const n = parseFloat(qianMatch[1]);
    if (!isNaN(n)) return Math.round(n * 1000);
  }
  return null;
}

type NumberMatch = { value: number; raw: string; index: number; length: number };

// 从一段文字中提取最可能的人数数字（优先靠前的命中）
function extractNumber(snippet: string): NumberMatch | null {
  // 优先匹配带"人"的数字，例如 "31569 人" / "29,000 人" / "4 万人"
  const withRen = snippet.match(/([\d,，.\s]+(?:万|千)?)\s*人/);
  if (withRen && withRen.index != null) {
    const raw = withRen[1].trim();
    if (/万|千/.test(raw)) {
      const n = chineseShortNumberToInt(raw);
      if (n != null)
        return { value: n, raw, index: withRen.index, length: withRen[0].length };
    }
    const cleaned = raw.replace(/[,，\s]/g, "");
    const n = parseInt(cleaned, 10);
    if (!isNaN(n) && n >= 100)
      return { value: n, raw, index: withRen.index, length: withRen[0].length };
  }

  const wan = snippet.match(/(\d+(?:\.\d+)?)\s*万(?!元|吨|平|米)/);
  if (wan && wan.index != null) {
    const n = chineseShortNumberToInt(wan[0]);
    if (n != null) return { value: n, raw: wan[0], index: wan.index, length: wan[0].length };
  }
  const qian = snippet.match(/(\d+(?:\.\d+)?)\s*千(?!克|米|瓦)/);
  if (qian && qian.index != null) {
    const n = chineseShortNumberToInt(qian[0]);
    if (n != null)
      return { value: n, raw: qian[0], index: qian.index, length: qian[0].length };
  }

  const num = snippet.match(/([\d,，]{3,})/);
  if (num && num.index != null) {
    const cleaned = num[1].replace(/[,，\s]/g, "");
    const n = parseInt(cleaned, 10);
    if (!isNaN(n) && n >= 500 && n <= 200000)
      return { value: n, raw: num[1], index: num.index, length: num[0].length };
  }

  return null;
}

export function parseAttendanceFromText(text: string): ParsedAttendance[] {
  if (!text) return [];
  const results: ParsedAttendance[] = [];
  const seen = new Set<string>();

  // 同时尝试每个 trigger keyword 与 场均 keyword
  const allTriggers = [
    ...PER_MATCH_AVERAGE_KEYWORDS.map((k) => ({ keyword: k, isAvg: true })),
    ...ATTENDANCE_TRIGGER_KEYWORDS.map((k) => ({ keyword: k, isAvg: false })),
  ];

  for (const { keyword, isAvg } of allTriggers) {
    let idx = 0;
    while ((idx = text.indexOf(keyword, idx)) !== -1) {
      const start = Math.max(0, idx - 5);
      const end = Math.min(text.length, idx + keyword.length + WINDOW);
      const snippet = text.slice(start, end);

      const num = extractNumber(snippet);
      idx += keyword.length;
      if (!num) continue;

      // 上座率 是百分比，不是人数
      if (keyword === "上座率") continue;

      // 校验合理范围
      if (num.value < 500 || num.value > 200000) continue;

      const key = `${num.value}|${start + num.index}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // 关键：只在数字的"近邻窗口"内判断估算 / 不确定，避免被远处词污染
      const localStart = Math.max(0, num.index - 8);
      const localEnd = Math.min(snippet.length, num.index + num.length + 4);
      const local = snippet.slice(localStart, localEnd);
      const hasEstimate = ESTIMATE_KEYWORDS.some((kw) => local.includes(kw));
      const hasUncertain = UNCERTAIN_KEYWORDS.some((kw) => local.includes(kw));

      results.push({
        count: num.value,
        estimated: hasEstimate,
        uncertain: hasUncertain,
        isPerMatchAverage: isAvg,
        rawTextExcerpt: snippet.trim(),
        matchedKeyword: keyword,
      });
    }
  }

  return results;
}

// 选取最适合写入"单场比赛"的结果
export function pickBestSingleMatchAttendance(
  parsed: ParsedAttendance[]
): ParsedAttendance | null {
  // 排除场均、排除不确定（"预计""或将"）
  const candidates = parsed.filter((p) => !p.isPerMatchAverage && !p.uncertain);
  if (candidates.length === 0) return null;
  // 偏好非估算 + 数字较大（更具体的报道通常更可信）
  candidates.sort((a, b) => {
    if (a.estimated !== b.estimated) return a.estimated ? 1 : -1;
    return b.count - a.count;
  });
  return candidates[0];
}
