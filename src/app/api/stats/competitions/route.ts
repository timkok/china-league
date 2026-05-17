import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const comps = await prisma.competition.findMany();
  const rows = await Promise.all(
    comps.map(async (c) => {
      const ms = await prisma.match.findMany({
        where: { competitionId: c.id, status: "FINISHED" },
        select: { attendance: true },
      });
      const withAtt = ms.filter((m) => m.attendance != null) as { attendance: number }[];
      const total = withAtt.reduce((s, m) => s + m.attendance, 0);
      const avg = withAtt.length ? total / withAtt.length : 0;
      return {
        competitionId: c.id,
        name: c.shortName,
        fullName: c.name,
        finishedMatches: ms.length,
        matchesWithAttendance: withAtt.length,
        totalAttendance: total,
        averageAttendance: Math.round(avg),
        maxAttendance: withAtt.length ? Math.max(...withAtt.map((m) => m.attendance)) : 0,
        minAttendance: withAtt.length ? Math.min(...withAtt.map((m) => m.attendance)) : 0,
      };
    })
  );
  return NextResponse.json({ items: rows.sort((a, b) => b.averageAttendance - a.averageAttendance) });
}
