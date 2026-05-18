import Link from "next/link";
import { Badge } from "./ui/badge";
import { MatchStatusBadge } from "./match-status-badge";
import { formatTime, formatNumber, formatDateShort } from "@/lib/utils";
import type { MatchStatus } from "@prisma/client";

type Props = {
  id: string;
  competitionShortName: string;
  status: MatchStatus;
  round?: string | null;
  homeTeamShortName: string;
  awayTeamShortName: string;
  kickoffAt: Date | string;
  venueName?: string | null;
  venueCity?: string | null;
  attendance?: number | null;
  homeGoals?: number | null;
  awayGoals?: number | null;
  showDate?: boolean;
};

export function MatchCard(props: Props) {
  const score =
    (props.status === "FINISHED" || props.status === "LIVE")
      ? `${props.homeGoals ?? "-"} : ${props.awayGoals ?? "-"}`
      : "vs";

  return (
    <Link
      href={`/matches/${props.id}`}
      className="group block rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
      aria-label={`查看 ${props.homeTeamShortName} 对阵 ${props.awayTeamShortName} 的比赛详情`}
    >
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{props.competitionShortName}</Badge>
          {props.round && <span className="text-muted-foreground">{props.round}</span>}
        </div>
        <MatchStatusBadge status={props.status} />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1 truncate text-right font-medium">
          {props.homeTeamShortName}
        </div>
        <div className="rounded-md bg-muted px-3 py-1 font-mono text-base font-semibold tabular-nums">
          {score}
        </div>
        <div className="flex-1 truncate font-medium">{props.awayTeamShortName}</div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span aria-hidden>🕒</span>
          <span>
            {props.showDate ? `${formatDateShort(props.kickoffAt)} ` : ""}
            {formatTime(props.kickoffAt)}
          </span>
          {props.venueName && (
            <>
              <span aria-hidden className="mx-1">·</span>
              <span aria-hidden>🏟</span>
              <span>{props.venueName}</span>
            </>
          )}
          {props.venueCity && <span className="text-muted-foreground/70">（{props.venueCity}）</span>}
        </div>
        <div className="text-right">
          {props.attendance != null ? (
            <span className="font-mono tabular-nums" aria-label={`观众 ${props.attendance} 人`}>
              👥 {formatNumber(props.attendance)} 人
            </span>
          ) : (
            <Badge variant="warning">上座待补</Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
