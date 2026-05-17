import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const competition = url.searchParams.get("competition") ?? undefined;
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100", 10), 500);

  const where: any = { status: "FINISHED", attendance: null };
  if (competition) where.competition = { shortName: competition };

  const items = await prisma.match.findMany({
    where,
    include: {
      homeTeam: { select: { id: true, name: true, shortName: true } },
      awayTeam: { select: { id: true, name: true, shortName: true } },
      venue: { select: { name: true, city: true } },
      competition: { select: { shortName: true, level: true } },
    },
    orderBy: { kickoffAt: "desc" },
    take: limit,
  });
  return NextResponse.json({ items, total: items.length });
}
