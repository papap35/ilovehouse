import type {
  AreaSummary,
  PropertyFilter,
  PropertyRecord,
  PropertyStats,
} from "./types";

export function filterProperties(
  records: PropertyRecord[],
  filter: PropertyFilter
): PropertyRecord[] {
  return records.filter((r) => {
    if (filter.dealType && r.dealType !== filter.dealType) return false;
    if (filter.city && r.city !== filter.city) return false;
    if (filter.district && r.district !== filter.district) return false;
    if (filter.buildingType && r.buildingType !== filter.buildingType)
      return false;
    if (filter.minTotalPrice !== undefined && r.totalPrice < filter.minTotalPrice)
      return false;
    if (filter.maxTotalPrice !== undefined && r.totalPrice > filter.maxTotalPrice)
      return false;
    if (filter.minAreaPing !== undefined && r.areaPing < filter.minAreaPing)
      return false;
    if (filter.maxAreaPing !== undefined && r.areaPing > filter.maxAreaPing)
      return false;
    if (
      filter.minUnitPrice !== undefined &&
      r.unitPricePerPing < filter.minUnitPrice
    )
      return false;
    if (
      filter.maxUnitPrice !== undefined &&
      r.unitPricePerPing > filter.maxUnitPrice
    )
      return false;
    if (filter.keyword) {
      const kw = filter.keyword.trim();
      if (kw && !r.address.includes(kw) && !r.district.includes(kw))
        return false;
    }
    return true;
  });
}

export function computeStats(records: PropertyRecord[]): PropertyStats {
  if (records.length === 0) {
    return {
      count: 0,
      avgTotalPrice: 0,
      avgUnitPricePerPing: 0,
      medianUnitPricePerPing: 0,
      minUnitPricePerPing: 0,
      maxUnitPricePerPing: 0,
    };
  }

  const totalPrices = records.map((r) => r.totalPrice);
  const unitPrices = records.map((r) => r.unitPricePerPing).sort((a, b) => a - b);

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const mid = Math.floor(unitPrices.length / 2);
  const median =
    unitPrices.length % 2 === 0
      ? (unitPrices[mid - 1] + unitPrices[mid]) / 2
      : unitPrices[mid];

  return {
    count: records.length,
    avgTotalPrice: Math.round(sum(totalPrices) / records.length),
    avgUnitPricePerPing: Math.round(sum(unitPrices) / records.length),
    medianUnitPricePerPing: Math.round(median),
    minUnitPricePerPing: unitPrices[0],
    maxUnitPricePerPing: unitPrices[unitPrices.length - 1],
  };
}

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number
): T[] {
  const start = (Math.max(page, 1) - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

/** 依縣市+行政區彙總，供 AI 選屋規劃使用的區域摘要統計 */
export function summarizeByArea(
  records: PropertyRecord[],
  dealType: "buy" | "rent"
): AreaSummary[] {
  const groups = new Map<string, PropertyRecord[]>();
  for (const r of records) {
    if (r.dealType !== dealType) continue;
    const key = `${r.city}::${r.district}`;
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }

  const summaries: AreaSummary[] = [];
  for (const [key, arr] of groups.entries()) {
    const [city, district] = key.split("::");
    const stats = computeStats(arr);
    summaries.push({
      city,
      district,
      dealType,
      sampleCount: stats.count,
      avgUnitPricePerPing: stats.avgUnitPricePerPing,
      avgTotalPrice: stats.avgTotalPrice,
    });
  }
  return summaries.sort((a, b) => a.avgUnitPricePerPing - b.avgUnitPricePerPing);
}
