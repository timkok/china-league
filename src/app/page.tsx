import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateShort, formatNumber } from "@/lib/utils";
import { StatCard } from "@/components/stat-card";
import { SectionHeader } from "@/components/section-header";
import { EmptyState } from "@/components/empty-state";
import { MatchCard } from "@/components/match-card";
import { Top10List, type Top10Row } from "@/components/top10-list";
import {
  LeagueAverageBlock,
  type LeagueAverageRow,
} from "@/components/league-average-block";

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

  const [
    todayMatches,
    recentMatchesCount,
    missingCount,
    competitions,
    perCompMatches,
    top10Raw,
    latestCollectedAt,
  ] = await Promise.all([
    prisma.match.findMany({
      where: { kickoffAt: { gte: todayStart, lt: todayEnd } },
      include: { homeTeam: true, awayTeam: true, venue: true, competition: true },
      orderBy: { kickoffAt: "asc" },
    }),
    prisma.match.count({
      where: { kickoffAt: { gte: weekStart, lt: weekEnd } },
    }),
    prisma.match.count({
      where: { status: "FINISHED", attendance: null },
    }),
    prisma.competition.findMany(),
    prisma.match.findMany({
      where: { status: "FINISHED", attendance: { not: null } },
      select: { competitionId: true, attendance: true },
    }),
    prisma.match.findMany({
      where: { attendance: { not: null } },
      orderBy: { attendance: "desc" },
      take: 30,
      include: {
        homeTeam: true,
        awayTeam: true,
        competition: true,
        venue: true,
        attendanceRecords: {
          where: { isSelected: true },
          take: 1,
        },
      },
    }),
    prisma.attendanceRecord.findFirst({
      orderBy: { collectedAt: "desc" },
      select: { collectedAt: true },
    }),
  ]);

  const compById = new Map(competitions.map((c) => [c.id, c]));
  const aggMap = new Map<string, { total: number; count: number }>();
  for (const m of perCompMatches) {
    if (m.attendance == null) continue;
    const a = aggMap.get(m.competitionId) ?? { total: 0, count: 0 };
    a.total += m.attendance;
    a.count += 1;
    aggMap.set(m.competitionId, a);
  }
  const leagueAverages: LeagueAverageRow[] = [...aggMap.entries()]
    .map(([id, v]) => ({
      competitionShort: compById.get(id)?.shortName ?? "未知",
      avg: v.total / v.count,
      sampleCount: v.count,
    }))
    .sort((a, b) => b.avg - a.avg);

  const top10: Top10Row[] = top10Raw.map((m) => {
    const r = m.attendanceRecords[0];
    return {
      id: m.id,
      homeShort: m.homeTeam.shortName,
      awayShort: m.awayTeam.shortName,
      homeGoals: m.homeGoals,
      awayGoals: m.awayGoals,
      competitionShort: m.competition.shortName,
      venueName: m.venue?.name ?? null,
      kickoffAt: m.kickoffAt.toISOString(),
      attendance: m.attendance,
      confidence: m.attendanceConfidence ?? null,
      selectedSourceType: r?.sourceType ?? null,
      selectedSourceName: r?.sourceName ?? null,
      selectedSourceUrl: r?.sourceUrl ?? null,
      estimated: !!r?.estimated,
    };
  });

  return {
    todayMatches,
    recentMatchesCount,
    missingCount,
    coveredLeagueCount: leagueAverages.length,
    leagueAverages,
    top10,
    latestCollectedAt: latestCollectedAt?.collectedAt ?? null,
  };
}

export default async function HomePage() {
  const data = await getDashboard();

  return (
    <div className="space-y-8">
      {/* 标题区 */}
      <section className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              📊 中国足球比赛监测
            </h1>
            <p className="text-sm text-muted-foreground md:text-base">
              中超 · 中甲 · 中乙 · 足协杯 — 持续追踪赛程、赛果与现场上座
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>数据更新：{formatDate(data.latestCollectedAt)}</div>
            <div className="mt-0.5">
              来源优先级：联赛/足协 &gt; 俱乐部 &gt; 媒体 &gt; 社交 &gt; 人工
            </div>
          </div>
        </div>
      </section>

      {/* KPI 区 */}
      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="核心指标"
      >
        <StatCard
          label="今日比赛"
          value={data.todayMatches.length}
          hint="按 Asia/Shanghai 时区统计"
          href="/matches"
          tone={data.todayMatches.length > 0 ? "info" : "default"}
        />
        <StatCard
          label="最近 7 天比赛"
          value={data.recentMatchesCount}
          hint="向前 3 天、向后 4 天"
          href="/matches"
        />
        <StatCard
          label="缺失上座的已结束比赛"
          value={data.missingCount}
          hint="点击进入补录队列"
          href="/attendance/missing"
          tone={data.missingCount > 0 ? "warn" : "success"}
        />
        <StatCard
          label="已覆盖联赛"
          value={data.coveredLeagueCount}
          hint="已有可统计的上座样本"
          href="/stats/competitions"
        />
      </section>

      {/* 今日比赛 */}
      <section className="space-y-3" aria-label="今日比赛">
        <SectionHeader
          title="🎯 今日比赛"
          subtitle={`${formatDateShort(new Date())} 的安排（${data.todayMatches.length} 场）`}
          actionHref="/matches"
          actionLabel="查看全部比赛 →"
        />
        {data.todayMatches.length === 0 ? (
          <EmptyState
            icon="🛌"
            title="今天没有安排比赛"
            description="可以先看看最近 7 天的赛程，或前往缺失上座队列补录历史数据。"
            actionHref="/matches"
            actionLabel="查看比赛列表"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.todayMatches.map((m) => (
              <MatchCard
                key={m.id}
                id={m.id}
                competitionShortName={m.competition.shortName}
                status={m.status}
                round={m.round}
                homeTeamShortName={m.homeTeam.shortName}
                awayTeamShortName={m.awayTeam.shortName}
                kickoffAt={m.kickoffAt}
                venueName={m.venue?.name}
                venueCity={m.venue?.city}
                homeGoals={m.homeGoals}
                awayGoals={m.awayGoals}
                attendance={m.attendance}
              />
            ))}
          </div>
        )}
      </section>

      {/* 联赛场均 */}
      <section className="space-y-3" aria-label="各联赛场均观众">
        <SectionHeader
          title="📈 各级联赛场均观众"
          subtitle="基于已结束比赛中已选中的上座数据；样本不足 3 场会标记"
          actionHref="/stats/competitions"
          actionLabel="完整联赛统计 →"
        />
        <div className="rounded-lg border bg-card p-4">
          <LeagueAverageBlock rows={data.leagueAverages} />
        </div>
      </section>

      {/* Top 10 */}
      <section className="space-y-3" aria-label="单场上座 Top 10">
        <SectionHeader
          title="🏆 单场上座 Top 10"
          subtitle="按联赛筛选；每条记录展示来源类型与可信度"
        />
        {data.top10.length === 0 ? (
          <EmptyState
            icon="📭"
            title="暂无上座数据"
            description="可以前往数据源管理页手动触发抓取，或在比赛详情页人工录入。"
            actionHref="/sources"
            actionLabel="管理数据源"
          />
        ) : (
          <Top10List rows={data.top10} />
        )}
      </section>

      {/* 帮助卡片 */}
      <section className="rounded-lg border bg-card p-4 text-sm">
        <h3 className="mb-2 font-semibold">📘 关于上座数据可信度</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            <b>高可信（≥ 90）</b>：联赛/足协官方、人工已核验
          </li>
          <li>
            <b>中高可信（70–89）</b>：俱乐部官方、权威媒体报道
          </li>
          <li>
            <b>待核验（50–69）</b>：社交媒体、社区来源
          </li>
          <li>
            <b>低可信（&lt; 50）</b>：未知或质量不明的来源
          </li>
          <li>
            <b>估算数据</b>（如"超过 4 万人"、"近 3 万人"）会单独标记，避免被当成精确值。
          </li>
        </ul>
        <div className="mt-3 text-xs text-muted-foreground">
          想补充某场比赛？前往{" "}
          <Link href="/attendance/missing" className="text-primary underline-offset-2 hover:underline">
            缺失上座队列
          </Link>{" "}
          或打开比赛详情页人工录入。
        </div>
      </section>
    </div>
  );
}
