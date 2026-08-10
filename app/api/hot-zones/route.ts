import { NextRequest, NextResponse } from "next/server";
import { getProperties } from "@/lib/govData";
import { computeHotZoneScores, mergeHotZoneScoresByDistrict } from "@/lib/propertyQuery";
import type { DealType } from "@/lib/types";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const city = params.get("city") ?? undefined;
  const dealType = (params.get("dealType") as DealType | null) ?? undefined;

  try {
    const { records, dataSource } = await getProperties({ city, dealType });
    const dealTypes: DealType[] = dealType ? [dealType] : ["buy", "rent"];
    const scores = dealTypes.flatMap((dt) => computeHotZoneScores(records, dt));
    const merged = mergeHotZoneScoresByDistrict(scores);

    return NextResponse.json({ scores: merged, dataSource });
  } catch (err) {
    return NextResponse.json(
      { error: "計算發展熱度分數時發生錯誤", detail: String(err) },
      { status: 500 }
    );
  }
}
