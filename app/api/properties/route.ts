import { NextRequest, NextResponse } from "next/server";
import { getProperties } from "@/lib/govData";
import { computeStats, filterProperties, paginate, summarizeByArea } from "@/lib/propertyQuery";
import type { CityDistrict, DealType, PropertyFilter, PropertySearchResult } from "@/lib/types";

function parseNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** 解析地圖畫圈搜尋傳來的 areas（JSON 字串），格式不符時忽略而非整個請求失敗 */
function parseAreas(raw: string | null): CityDistrict[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return undefined;
    const areas = parsed.filter(
      (a): a is CityDistrict =>
        a && typeof a.city === "string" && typeof a.district === "string"
    );
    return areas.length > 0 ? areas : undefined;
  } catch {
    return undefined;
  }
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const dealType = (params.get("dealType") as DealType | null) ?? undefined;
  const city = params.get("city") ?? undefined;
  const areas = parseAreas(params.get("areas"));

  const filter: PropertyFilter = {
    dealType,
    city,
    district: params.get("district") ?? undefined,
    areas,
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
    const cities = areas ? Array.from(new Set(areas.map((a) => a.city))) : undefined;
    const { records, dataSource } = await getProperties({ city, cities, dealType });
    const filtered = filterProperties(records, filter);
    const stats = computeStats(filtered);
    const items = paginate(filtered, page, pageSize);
    const areaBreakdown = [
      ...summarizeByArea(filtered, "buy"),
      ...summarizeByArea(filtered, "rent"),
    ];

    const result: PropertySearchResult = {
      items,
      stats,
      total: filtered.length,
      page,
      pageSize,
      dataSource,
      areaBreakdown,
    };

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "查詢實價登錄資料時發生錯誤", detail: String(err) },
      { status: 500 }
    );
  }
}
