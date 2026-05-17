import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  classifyConfidence,
  computeConfidenceScore,
  isEstimateText,
  isUncertainText,
} from "@/lib/confidence";
import { refreshSelectedAttendance } from "@/lib/scrapers";

export const dynamic = "force-dynamic";

const schema = z.object({
  matchId: z.string(),
  attendanceCount: z.number().int().positive().nullable().optional(),
  estimated: z.boolean().optional(),
  sourceType: z
    .enum(["OFFICIAL_LEAGUE", "OFFICIAL_CLUB", "MEDIA", "SOCIAL", "MANUAL", "UNKNOWN"])
    .optional(),
  sourceName: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  rawTextExcerpt: z.string().optional(),
  note: z.string().optional(),
  createdBy: z.string().optional(),
  verified: z.boolean().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;
  const sourceType = data.sourceType ?? "MANUAL";

  // 推断 estimated / uncertain（如未显式传入）
  const isUncertain = isUncertainText(data.rawTextExcerpt);
  const isEstimate = data.estimated ?? isEstimateText(data.rawTextExcerpt);

  // 含"预计""或将"等不能作为 confirmed —— 记 note 并降权
  const noteParts: string[] = [];
  if (data.note) noteParts.push(data.note);
  if (isUncertain) noteParts.push("原文含不确定描述（预计/或将/可能），仅作参考");

  const score = computeConfidenceScore({
    sourceType,
    isEstimate,
    hasUncertaintyWords: isUncertain,
    verified: data.verified,
  });
  const label = classifyConfidence(score);

  try {
    const match = await prisma.match.findUnique({ where: { id: data.matchId } });
    if (!match) return NextResponse.json({ error: "比赛不存在" }, { status: 404 });

    const rec = await prisma.attendanceRecord.create({
      data: {
        matchId: data.matchId,
        attendanceCount: data.attendanceCount ?? null,
        estimated: isEstimate,
        confidenceScore: score,
        confidenceLabel: label,
        sourceType,
        sourceName: data.sourceName,
        sourceUrl: data.sourceUrl,
        rawTextExcerpt: data.rawTextExcerpt,
        note: noteParts.length ? noteParts.join("；") : null,
        createdBy: data.createdBy,
        verified: data.verified ?? false,
      },
    });
    await refreshSelectedAttendance(data.matchId);
    await prisma.auditLog.create({
      data: {
        matchId: data.matchId,
        entity: "AttendanceRecord",
        entityId: rec.id,
        action: "create",
        diff: parsed.data as any,
        actor: data.createdBy,
      },
    });
    return NextResponse.json(rec, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "创建失败" }, { status: 500 });
  }
}
