import { NextRequest, NextResponse } from "next/server";
import { getProperties } from "@/lib/govData";
import { computeStats, filterProperties, paginate } from "@/lib/propertyQuery";
import type { DealType, PropertyFilter, PropertySearchResult } from "@/lib/types";

function parseNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const dealType = (params.get("dealType") as DealType | null) ?? undefined;
  const city = params.get("city") ?? undefined;

  const filter: PropertyFilter = {
    dealType,
    city,
    district: params.get("district") ?? undefined,
    buildingType: params.get("buildingType") ?? undefined,
    minTotalPrice: parseNumber(params.get("minTotalPrice")),
    maxTotalPrice: parseNumber(params.get("maxTotalPrice")),
    minAreaPing: parseNumber(params.get("minAreaPing")),
    maxAreaPing: parseNumber(params.get("maxAreaPing")),
    minUnitPrice: parseNumber(params.get("minUnitPrice")),
    maxUnitPrice: parseNumber(params.get("maxUnitPrice")),
    keyword: params.get("keyword") ?? undefined,
  };

  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.get("pageSize")) || 20));

  try {
    const { records, dataSource } = await getProperties({ city, dealType });
    const filtered = filterProperties(records, filter);
    const stats = computeStats(filtered);
    const items = paginate(filtered, page, pageSize);

    const result: PropertySearchResult = {
      items,
      stats,
      total: filtered.length,
      page,
      pageSize,
      dataSource,
    };

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "查詢實價登錄資料時發生錯誤", detail: String(err) },
      { status: 500 }
    );
  }
}
