import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const matches = await prisma.match.findMany({
    where: { status: "FINISHED", attendance: { not: null } },
    include: { homeTeam: { select: { id: true, name: true, shortName: true } } },
  });
  const map = new Map<string, { team: any; vals: number[] }>();
  for (const m of matches) {
    if (m.attendance == null) continue;
    if (!map.has(m.homeTeamId)) map.set(m.homeTeamId, { team: m.homeTeam, vals: [] });
    map.get(m.homeTeamId)!.vals.push(m.attendance);
  }
  const items = [...map.values()]
    .map(({ team, vals }) => ({
      team,
      homeMatches: vals.length,
      averageAttendance: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
      maxAttendance: Math.max(...vals),
      minAttendance: Math.min(...vals),
    }))
    .sort((a, b) => b.averageAttendance - a.averageAttendance);
  return NextResponse.json({ items });
}
