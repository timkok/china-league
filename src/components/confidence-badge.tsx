import { Badge } from "./ui/badge";
import type { ConfidenceLabel, SourceType } from "@prisma/client";

const LABEL_VARIANT: Record<ConfidenceLabel, any> = {
  OFFICIAL: "success",
  MEDIA: "info",
  SOCIAL: "warning",
  MANUAL: "secondary",
  UNKNOWN: "muted",
};

const LABEL_TEXT: Record<ConfidenceLabel, string> = {
  OFFICIAL: "官方",
  MEDIA: "媒体",
  SOCIAL: "社交",
  MANUAL: "人工",
  UNKNOWN: "未知",
};

const SOURCE_TEXT: Record<SourceType, string> = {
  OFFICIAL_LEAGUE: "联赛/足协官方",
  OFFICIAL_CLUB: "俱乐部官方",
  MEDIA: "权威媒体",
  SOCIAL: "社交媒体",
  MANUAL: "人工录入",
  UNKNOWN: "未知来源",
};

export function ConfidenceBadge({
  label,
  score,
}: {
  label: ConfidenceLabel;
  score?: number | null;
}) {
  const v = LABEL_VARIANT[label] ?? "muted";
  return (
    <Badge variant={v}>
      {LABEL_TEXT[label]} {score != null ? `· ${(score * 100).toFixed(0)}` : ""}
    </Badge>
  );
}

export function SourceTypeText({ type }: { type: SourceType }) {
  return <span>{SOURCE_TEXT[type] ?? type}</span>;
}
