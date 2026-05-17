import type { ConfidenceLabel, SourceType } from "@prisma/client";

// 来源类型 -> 默认置信度
export const SOURCE_BASE_SCORE: Record<SourceType, number> = {
  OFFICIAL_LEAGUE: 0.95,
  OFFICIAL_CLUB: 0.85,
  MEDIA: 0.75,
  SOCIAL: 0.55,
  MANUAL: 0.5,
  UNKNOWN: 0.3,
};

// 不确定描述词，命中后视为不可作为 confirmed attendance
export const UNCERTAIN_KEYWORDS = [
  "预计",
  "或将",
  "可能",
  "拟",
  "据悉",
  "传言",
];

// 估算性描述词，提示 attendance 应该标记 estimated=true
export const ESTIMATE_KEYWORDS = ["超过", "近", "约", "大概", "左右", "上下", "突破"];

export function classifyConfidence(score: number): ConfidenceLabel {
  if (score >= 0.9) return "OFFICIAL";
  if (score >= 0.7) return "MEDIA";
  if (score >= 0.5) return "SOCIAL";
  if (score >= 0.4) return "MANUAL";
  return "UNKNOWN";
}

export function isUncertainText(text: string | null | undefined): boolean {
  if (!text) return false;
  return UNCERTAIN_KEYWORDS.some((kw) => text.includes(kw));
}

export function isEstimateText(text: string | null | undefined): boolean {
  if (!text) return false;
  return ESTIMATE_KEYWORDS.some((kw) => text.includes(kw));
}

// 计算最终 confidence 分：基础分 - 不确定性折扣 + 人工核验加分
export function computeConfidenceScore(opts: {
  sourceType: SourceType;
  hasUncertaintyWords?: boolean;
  isEstimate?: boolean;
  verified?: boolean;
}): number {
  let score = SOURCE_BASE_SCORE[opts.sourceType] ?? 0.3;
  if (opts.hasUncertaintyWords) score -= 0.25;
  if (opts.isEstimate) score -= 0.1;
  if (opts.verified) score = Math.max(score, 0.9);
  return Math.min(1, Math.max(0, Number(score.toFixed(2))));
}

// 来源优先级排序：官方 > 联赛战报 > 权威媒体 > 球队公告 > 社交媒体 > 人工录入
export function sourceTypeRank(t: SourceType): number {
  const order: SourceType[] = [
    "OFFICIAL_LEAGUE",
    "OFFICIAL_CLUB",
    "MEDIA",
    "SOCIAL",
    "MANUAL",
    "UNKNOWN",
  ];
  return order.indexOf(t);
}
