import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { refreshSelectedAttendance } from "@/lib/scrapers";

export const dynamic = "force-dynamic";

export async function PATCH(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rec = await prisma.attendanceRecord.findUnique({ where: { id } });
  if (!rec) return NextResponse.json({ error: "记录不存在" }, { status: 404 });

  await prisma.$transaction([
    prisma.attendanceRecord.updateMany({
      where: { matchId: rec.matchId },
      data: { isSelected: false },
    }),
    prisma.attendanceRecord.update({
      where: { id },
      data: { isSelected: true },
    }),
    prisma.match.update({
      where: { id: rec.matchId },
      data: {
        attendance: rec.attendanceCount,
        attendanceConfidence: rec.confidenceScore,
      },
    }),
    prisma.auditLog.create({
      data: {
        matchId: rec.matchId,
        entity: "AttendanceRecord",
        entityId: rec.id,
        action: "select",
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
