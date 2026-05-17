import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, formatNumber } from "@/lib/utils";
import { MatchStatusBadge } from "@/components/match-status-badge";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

async function getDashboard() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 3);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 4);

  const [todayMatches, recentMatches, missingCount, top10, byComp] = await Promise.all([
    prisma.match.findMany({
      where: { kickoffAt: { gte: todayStart, lt: todayEnd } },
      include: { homeTeam: true, awayTeam: true, venue: true, competition: true },
      orderBy: { kickoffAt: "asc" },
    }),
    prisma.match.findMany({
      where: { kickoffAt: { gte: weekStart, lt: weekEnd } },
      include: { homeTeam: true, awayTeam: true, competition: true },
      orderBy: { kickoffAt: "asc" },
    }),
    prisma.match.count({
      where: {
        status: "FINISHED",
        attendance: null,
      },
    }),
    prisma.match.findMany({
      where: { attendance: { not: null } },
      orderBy: { attendance: "desc" },
      take: 10,
      include: { homeTeam: true, awayTeam: true, competition: true, venue: true },
    }),
    prisma.match.groupBy({
      by: ["competitionId"],
      where: { attendance: { not: null }, status: "FINISHED" },
      _avg: { attendance: true },
      _count: { _all: true },
    }),
  ]);

  const compIds = byComp.map((b) => b.competitionId);
  const comps = await prisma.competition.findMany({
    where: { id: { in: compIds } },
  });

  return {
    todayMatches,
    recentMatches,
    missingCount,
    top10,
    perComp: byComp
      .map((b) => ({
        competition: comps.find((c) => c.id === b.competitionId)!,
        avg: b._avg.attendance ?? 0,
        count: b._count._all,
      }))
      .sort((a, b) => b.avg - a.avg),
  };
}

export default async function HomePage() {
  const data = await getDashboard();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">📊 数据看板</h1>
        <p className="text-sm text-muted-foreground">
          关注中超、中甲、中乙、足协杯等各级赛事的赛果与现场上座
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="今日比赛" value={data.todayMatches.length} hint="按开球时间统计" />
        <StatCard label="最近 7 天" value={data.recentMatches.length} hint="向前 3 天向后 4 天" />
        <StatCard
          label="缺失上座的已结束比赛"
          value={data.missingCount}
          hint="待人工补录或抓取"
          highlight
        />
        <StatCard
          label="覆盖联赛数"
          value={data.perComp.length}
          hint="已有上座统计的联赛"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>今日比赛</CardTitle>
            <CardDescription>{formatDate(new Date())} 的安排</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.todayMatches.length === 0 && (
              <p className="text-sm text-muted-foreground">今日暂无比赛</p>
            )}
            {data.todayMatches.map((m) => (
              <Link
                key={m.id}
                href={`/matches/${m.id}`}
                className="block rounded-md border p-3 hover:bg-accent"
              >
                <div className="flex items-center justify-between text-sm">
                  <Badge variant="outline">{m.competition.shortName}</Badge>
                  <MatchStatusBadge status={m.status} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-medium">{m.homeTeam.shortName}</span>
                  <span className="text-muted-foreground">vs</span>
                  <span className="font-medium">{m.awayTeam.shortName}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatDate(m.kickoffAt)} · {m.venue?.name ?? "未知球场"}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>各级联赛场均观众</CardTitle>
            <CardDescription>基于已结束比赛与已确认上座数据</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.perComp.length === 0 && (
              <p className="text-sm text-muted-foreground">暂无可统计数据</p>
            )}
            {data.perComp.map((c) => (
              <div key={c.competition.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Badge variant="outline">{c.competition.shortName}</Badge>
                  <span className="text-muted-foreground">
                    {c.count} 场样本
                  </span>
                </span>
                <span className="font-mono font-medium">
                  {formatNumber(Math.round(c.avg))} 人
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>🏆 单场上座 Top 10</CardTitle>
          <CardDescription>所有联赛合并排名</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {data.top10.length === 0 && (
            <p className="text-sm text-muted-foreground">暂无上座数据</p>
          )}
          {data.top10.map((m, i) => (
            <Link
              key={m.id}
              href={`/matches/${m.id}`}
              className="flex items-center justify-between py-3 hover:bg-accent rounded px-2"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-muted-foreground w-6">{i + 1}</span>
                <div>
                  <div className="font-medium">
                    {m.homeTeam.shortName} {m.homeGoals ?? "-"} :{" "}
                    {m.awayGoals ?? "-"} {m.awayTeam.shortName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <Badge variant="outline" className="mr-1">
                      {m.competition.shortName}
                    </Badge>
                    {m.venue?.name ?? ""} · {formatDate(m.kickoffAt)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-lg font-semibold">
                  {formatNumber(m.attendance)}
                </div>
                <div className="text-xs text-muted-foreground">
                  可信度 {m.attendanceConfidence != null ? Math.round(m.attendanceConfidence * 100) : "—"}
                </div>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: number;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight && value > 0 ? "border-amber-300" : undefined}>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-bold tabular-nums">
          {formatNumber(value)}
        </CardTitle>
      </CardHeader>
      {hint && <CardContent className="pt-0 text-xs text-muted-foreground">{hint}</CardContent>}
    </Card>
  );
}
