import Link from "next/link";
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
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getMissing() {
  return prisma.match.findMany({
    where: { status: "FINISHED", attendance: null },
    include: {
      homeTeam: true,
      awayTeam: true,
      venue: true,
      competition: true,
    },
    orderBy: { kickoffAt: "desc" },
    take: 200,
  });
}

export default async function MissingAttendancePage() {
  const list = await getMissing();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">📥 缺失上座队列</h1>
        <p className="text-sm text-muted-foreground">
          这里列出已结束但尚无上座数据的比赛，等待人工补录或后续抓取
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>共 {list.length} 场</CardTitle>
          <CardDescription>按比赛时间倒序，最多 200 条</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>联赛</TableHead>
                <TableHead>主队</TableHead>
                <TableHead className="text-center">比分</TableHead>
                <TableHead>客队</TableHead>
                <TableHead>球场</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs">{formatDate(m.kickoffAt)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{m.competition.shortName}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{m.homeTeam.shortName}</TableCell>
                  <TableCell className="text-center font-mono">
                    {m.homeGoals ?? "-"} : {m.awayGoals ?? "-"}
                  </TableCell>
                  <TableCell className="font-medium">{m.awayTeam.shortName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {m.venue?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/matches/${m.id}`}
                      className="text-sm underline-offset-2 hover:underline"
                    >
                      补录 →
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">
                    🎉 全部已结束比赛都已有上座数据
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
