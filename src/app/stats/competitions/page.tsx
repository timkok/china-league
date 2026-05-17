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
import { CompetitionAttendanceChart } from "./chart";

export const dynamic = "force-dynamic";

async function getCompetitionStats() {
  const comps = await prisma.competition.findMany();
  const rows = await Promise.all(
    comps.map(async (c) => {
      const matches = await prisma.match.findMany({
        where: {
          competitionId: c.id,
          status: "FINISHED",
        },
        select: { attendance: true },
      });
      const withAtt = matches.filter((m) => m.attendance != null) as { attendance: number }[];
      const total = withAtt.reduce((s, m) => s + m.attendance, 0);
      const avg = withAtt.length ? total / withAtt.length : 0;
      const max = withAtt.reduce((m, x) => Math.max(m, x.attendance), 0);
      const min = withAtt.length
        ? withAtt.reduce((m, x) => Math.min(m, x.attendance), Number.POSITIVE_INFINITY)
        : 0;
      const missing = matches.length - withAtt.length;
      return {
        id: c.id,
        name: c.shortName,
        fullName: c.name,
        finishedCount: matches.length,
        withAttendance: withAtt.length,
        total,
        avg,
        max,
        min: withAtt.length ? min : 0,
        missing,
      };
    })
  );
  return rows.sort((a, b) => b.avg - a.avg);
}

export default async function CompetitionStatsPage() {
  const rows = await getCompetitionStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">📈 联赛上座统计</h1>
        <p className="text-sm text-muted-foreground">
          基于已结束的比赛与展示中的上座数据
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>各联赛场均观众对比</CardTitle>
          <CardDescription>越高代表平均上座越好</CardDescription>
        </CardHeader>
        <CardContent>
          <CompetitionAttendanceChart
            data={rows.map((r) => ({ name: r.name, avg: Math.round(r.avg) }))}
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
                <TableHead>联赛</TableHead>
                <TableHead className="text-right">已结束</TableHead>
                <TableHead className="text-right">含上座</TableHead>
                <TableHead className="text-right">缺失</TableHead>
                <TableHead className="text-right">场均</TableHead>
                <TableHead className="text-right">最高</TableHead>
                <TableHead className="text-right">最低</TableHead>
                <TableHead className="text-right">总观众</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.name}
                    <div className="text-xs text-muted-foreground">{r.fullName}</div>
                  </TableCell>
                  <TableCell className="text-right font-mono">{r.finishedCount}</TableCell>
                  <TableCell className="text-right font-mono">{r.withAttendance}</TableCell>
                  <TableCell className="text-right font-mono">{r.missing}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(Math.round(r.avg))}
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatNumber(r.max)}</TableCell>
                  <TableCell className="text-right font-mono">{formatNumber(r.min)}</TableCell>
                  <TableCell className="text-right font-mono">{formatNumber(r.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
