import { NextResponse } from "next/server";
import { z } from "zod";
import { runAdapterAndPersist } from "@/lib/scrapers";

export const dynamic = "force-dynamic";
// scraper 可能慢一点
export const maxDuration = 60;

const schema = z.object({
  adapterKey: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  try {
    const result = await runAdapterAndPersist(parsed.data.adapterKey, "manual");
    return NextResponse.json({
      jobId: result.jobId,
      saved: result.saved,
      found: result.result.matches.length + result.result.attendance.length,
      warnings: result.result.warnings ?? [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "抓取失败" }, { status: 500 });
  }
}
