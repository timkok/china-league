import { Badge } from "./ui/badge";
import type { ConfidenceLabel, SourceType } from "@prisma/client";

const SOURCE_TEXT: Record<SourceType, string> = {
  OFFICIAL_LEAGUE: "联赛/足协官方",
  OFFICIAL_CLUB: "俱乐部官方",
  MEDIA: "权威媒体",
  SOCIAL: "社交媒体",
  MANUAL: "人工录入",
  UNKNOWN: "未知来源",
};

const SOURCE_VARIANT: Record<SourceType, Parameters<typeof Badge>[0]["variant"]> = {
  OFFICIAL_LEAGUE: "success",
  OFFICIAL_CLUB: "success",
  MEDIA: "info",
  SOCIAL: "warning",
  MANUAL: "secondary",
  UNKNOWN: "muted",
};

const LABEL_TEXT: Record<ConfidenceLabel, string> = {
  OFFICIAL: "高可信",
  MEDIA: "中高可信",
  SOCIAL: "待核验",
  MANUAL: "人工",
  UNKNOWN: "低可信",
};

const LABEL_VARIANT: Record<ConfidenceLabel, Parameters<typeof Badge>[0]["variant"]> = {
  OFFICIAL: "success",
  MEDIA: "info",
  SOCIAL: "warning",
  MANUAL: "secondary",
  UNKNOWN: "muted",
};

/**
 * 把 0..1 的 confidenceScore 转成中文可读的可信度等级标签。
 *  ≥0.90 高可信
 *  0.70–0.89 中高可信
 *  0.50–0.69 待核验
 *  <0.50 低可信
 */
export function readableConfidence(score: number | null | undefined): {
  text: string;
  variant: Parameters<typeof Badge>[0]["variant"];
} {
  if (score == null) return { text: "未知", variant: "muted" };
  if (score >= 0.9) return { text: "高可信", variant: "success" };
  if (score >= 0.7) return { text: "中高可信", variant: "info" };
  if (score >= 0.5) return { text: "待核验", variant: "warning" };
  return { text: "低可信", variant: "muted" };
}

export function ConfidenceBadge({
  label,
  score,
}: {
  label?: ConfidenceLabel;
  score?: number | null;
}) {
  const r = readableConfidence(score ?? null);
  const text = label ? `${LABEL_TEXT[label]}` : r.text;
  const variant = label ? LABEL_VARIANT[label] : r.variant;
  return (
    <Badge
      variant={variant}
      aria-label={`可信度等级：${text}${score != null ? `，分数 ${Math.round(score * 100)}` : ""}`}
    >
      {text}
      {score != null ? ` · ${Math.round(score * 100)}` : ""}
    </Badge>
  );
}

export function SourceTypeBadge({ type }: { type: SourceType }) {
  return (
    <Badge variant={SOURCE_VARIANT[type] ?? "muted"} aria-label={`来源类型：${SOURCE_TEXT[type]}`}>
      {SOURCE_TEXT[type] ?? type}
    </Badge>
  );
}

export function SourceTypeText({ type }: { type: SourceType }) {
  return <span>{SOURCE_TEXT[type] ?? type}</span>;
}

export function sourceTypeText(type: SourceType): string {
  return SOURCE_TEXT[type] ?? type;
}

export function AttendanceBadge({ estimated }: { estimated: boolean }) {
  return estimated ? (
    <Badge variant="warning" aria-label="估算数据">估算</Badge>
  ) : (
    <Badge variant="success" aria-label="确认数据">确认</Badge>
  );
}
