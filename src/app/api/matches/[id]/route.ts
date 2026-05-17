import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await prisma.match.findUnique({
    where: { id },
    include: {
      homeTeam: true,
      awayTeam: true,
      venue: true,
      competition: true,
      season: true,
      attendanceRecords: {
        orderBy: [{ isSelected: "desc" }, { confidenceScore: "desc" }],
      },
    },
  });
  if (!m) return NextResponse.json({ error: "未找到比赛" }, { status: 404 });
  return NextResponse.json(m);
}

const patchSchema = z.object({
  status: z.enum(["SCHEDULED", "LIVE", "FINISHED", "POSTPONED", "CANCELLED", "ABANDONED"]).optional(),
  homeGoals: z.number().int().nullable().optional(),
  awayGoals: z.number().int().nullable().optional(),
  kickoffAt: z.string().optional(),
  venueId: z.string().nullable().optional(),
  round: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const data: any = { ...parsed.data };
  if (data.kickoffAt) data.kickoffAt = new Date(data.kickoffAt);

  try {
    const updated = await prisma.match.update({ where: { id }, data });
    await prisma.auditLog.create({
      data: {
        entity: "Match",
        entityId: id,
        action: "update",
        diff: parsed.data as any,
      },
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "更新失败" }, { status: 500 });
  }
}
