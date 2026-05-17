import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  competition: z.string().optional(),
  team: z.string().optional(),
  city: z.string().optional(),
  status: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const q = parsed.data;
  const where: any = {};
  if (q.competition) where.competition = { shortName: q.competition };
  if (q.status) where.status = q.status;
  if (q.from || q.to) {
    where.kickoffAt = {};
    if (q.from) where.kickoffAt.gte = new Date(q.from);
    if (q.to) {
      const t = new Date(q.to);
      t.setDate(t.getDate() + 1);
      where.kickoffAt.lt = t;
    }
  }
  if (q.team) {
    where.OR = [
      { homeTeam: { OR: [{ name: { contains: q.team } }, { shortName: { contains: q.team } }] } },
      { awayTeam: { OR: [{ name: { contains: q.team } }, { shortName: { contains: q.team } }] } },
    ];
  }
  if (q.city) where.venue = { city: { contains: q.city } };

  const [items, total] = await Promise.all([
    prisma.match.findMany({
      where,
      include: {
        homeTeam: { select: { id: true, name: true, shortName: true } },
        awayTeam: { select: { id: true, name: true, shortName: true } },
        venue: { select: { id: true, name: true, city: true } },
        competition: { select: { id: true, shortName: true, level: true } },
      },
      orderBy: { kickoffAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.match.count({ where }),
  ]);
  return NextResponse.json({ items, total, page: q.page, pageSize: q.pageSize });
}

const createSchema = z.object({
  competitionId: z.string(),
  seasonId: z.string(),
  homeTeamId: z.string(),
  awayTeamId: z.string(),
  venueId: z.string().optional(),
  kickoffAt: z.string(),
  round: z.string().optional(),
  matchday: z.number().int().optional(),
  status: z.enum(["SCHEDULED", "LIVE", "FINISHED", "POSTPONED", "CANCELLED", "ABANDONED"]).optional(),
  homeGoals: z.number().int().optional(),
  awayGoals: z.number().int().optional(),
  externalId: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;
  try {
    const created = await prisma.match.create({
      data: {
        ...data,
        kickoffAt: new Date(data.kickoffAt),
      },
    });
    await prisma.auditLog.create({
      data: {
        entity: "Match",
        entityId: created.id,
        action: "create",
        diff: data as any,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "创建失败" },
      { status: 500 }
    );
  }
}
