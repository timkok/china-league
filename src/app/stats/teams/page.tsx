import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import { TeamAttendanceChart, TeamTrendChart } from "./chart";

export const dynamic = "force-dynamic";

async function getTeamStats() {
  const matches = await prisma.match.findMany({
    where: { status: "FINISHED", attendance: { not: null } },
    include: { homeTeam: true },
    orderBy: { kickoffAt: "asc" },
  });
  const teamMap = new Map<
    string,
    { team: typeof matches[number]["homeTeam"]; vals: number[]; trend: { date: string; v: number }[] }
  >();
  for (const m of matches) {
    if (m.attendance == null) continue;
    const k = m.homeTeamId;
    if (!teamMap.has(k)) teamMap.set(k, { team: m.homeTeam, vals: [], trend: [] });
    const t = teamMap.get(k)!;
    t.vals.push(m.attendance);
    t.trend.push({
      date: m.kickoffAt.toISOString().slice(5, 10),
      v: m.attendance,
    });
  }
  return [...teamMap.values()]
    .map((t) => ({
      team: t.team,
      avg: t.vals.reduce((s, v) => s + v, 0) / t.vals.length,
      max: Math.max(...t.vals),
      min: Math.min(...t.vals),
      count: t.vals.length,
      trend: t.trend,
    }))
    .sort((a, b) => b.avg - a.avg);
}

export default async function TeamStatsPage() {
  const rows = await getTeamStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">⚽ 球队主场上座统计</h1>
        <p className="text-sm text-muted-foreground">仅统计已结束的主场比赛</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>主场场均观众排行</CardTitle>
          <CardDescription>Top {Math.min(rows.length, 10)} 球队</CardDescription>
        </CardHeader>
        <CardContent>
          <TeamAttendanceChart
            data={rows
              .slice(0, 10)
              .map((r) => ({ name: r.team.shortName, avg: Math.round(r.avg) }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>明细</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>球队</TableHead>
                <TableHead className="text-right">主场场次</TableHead>
                <TableHead className="text-right">场均</TableHead>
                <TableHead className="text-right">最高</TableHead>
                <TableHead className="text-right">最低</TableHead>
                <TableHead>趋势</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.team.id}>
                  <TableCell className="font-medium">
                    {r.team.shortName}
                    <div className="text-xs text-muted-foreground">{r.team.name}</div>
                  </TableCell>
                  <TableCell className="text-right font-mono">{r.count}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(Math.round(r.avg))}
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatNumber(r.max)}</TableCell>
                  <TableCell className="text-right font-mono">{formatNumber(r.min)}</TableCell>
                  <TableCell style={{ width: 220 }}>
                    <TeamTrendChart data={r.trend} />
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                    暂无可统计数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
