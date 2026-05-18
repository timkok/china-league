import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";

export type LeagueAverageRow = {
  competitionShort: string;
  avg: number;
  sampleCount: number;
};

/**
 * 横向 CSS 条形图：联赛场均观众。
 *   - 纯 SSR 友好（无客户端 JS），在 GitHub Pages 静态快照中也能展示
 *   - 样本数 < 3 标记"小样本，仅供参考"
 */
export function LeagueAverageBlock({ rows }: { rows: LeagueAverageRow[] }) {
  const sorted = rows.slice().sort((a, b) => b.avg - a.avg);
  const max = Math.max(1, ...sorted.map((r) => r.avg));

  if (sorted.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
        暂无可统计的联赛数据
      </div>
    );
  }

  return (
    <ul className="space-y-3" aria-label="各级联赛场均观众对比">
      {sorted.map((r, i) => {
        const pct = Math.max(2, Math.round((r.avg / max) * 100));
        return (
          <li key={r.competitionShort} className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                <Badge variant="outline">{r.competitionShort}</Badge>
                <span className="text-xs text-muted-foreground">
                  {r.sampleCount} 场样本
                </span>
                {r.sampleCount < 3 && (
                  <Badge variant="warning" aria-label="样本数过少">
                    小样本
                  </Badge>
                )}
              </div>
              <span className="font-mono font-semibold tabular-nums">
                {formatNumber(r.avg)} 人
              </span>
            </div>
            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={max}
              aria-valuenow={r.avg}
              aria-label={`${r.competitionShort} 场均 ${r.avg} 人`}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
