import { Badge } from "./ui/badge";
import type { MatchStatus } from "@prisma/client";

const MAP: Record<MatchStatus, { label: string; variant: any }> = {
  SCHEDULED: { label: "未开始", variant: "muted" },
  LIVE: { label: "进行中", variant: "info" },
  FINISHED: { label: "已结束", variant: "success" },
  POSTPONED: { label: "延期", variant: "warning" },
  CANCELLED: { label: "取消", variant: "destructive" },
  ABANDONED: { label: "中断", variant: "destructive" },
};

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  const m = MAP[status] ?? MAP.SCHEDULED;
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
