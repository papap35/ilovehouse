import { describe, expect, it } from "vitest";
import { computeHotZoneScores, mergeHotZoneScoresByDistrict } from "../lib/propertyQuery";
import type { HotZoneScore, PropertyRecord } from "../lib/types";

function makeRecord(overrides: Partial<PropertyRecord>): PropertyRecord {
  return {
    id: "id",
    dealType: "buy",
    city: "台北市",
    district: "信義區",
    address: "測試路1號",
    buildingType: "住宅大樓",
    mainUse: "住家用",
    transactionDate: "2025-01-01",
    totalPrice: 10_000_000,
    areaPing: 20,
    unitPricePerPing: 500_000,
    floor: "5樓",
    totalFloors: 12,
    buildYear: 2010,
    rooms: 2,
    livingRooms: 1,
    bathrooms: 1,
    hasManagement: true,
    note: "",
    source: "sample",
    ...overrides,
  };
}

describe("computeHotZoneScores", () => {
  it("scores a district with clear price and volume growth", () => {
    // 先前期（2 筆，1月）：均價 1,000,000
    // 近期（4 筆，6月）：均價 1,200,000、筆數是先前期的兩倍
    // priceGrowthPct = (1,200,000-1,000,000)/1,000,000 = 0.2
    // volumeGrowthPct = (4-2)/2 = 1.0
    // score = 0.5 * scaled(0.2) + 0.5 * scaled(1.0)
    //       = 0.5 * ((0.2+0.5)/1.5*100) + 0.5 * ((1.0+0.5)/1.5*100)
    //       = 0.5 * 46.666... + 0.5 * 100 = 73.33... -> round to 73
    const records: PropertyRecord[] = [
      makeRecord({ id: "e1", transactionDate: "2025-01-01", unitPricePerPing: 1_000_000 }),
      makeRecord({ id: "e2", transactionDate: "2025-01-10", unitPricePerPing: 1_000_000 }),
      makeRecord({ id: "r1", transactionDate: "2025-06-01", unitPricePerPing: 1_200_000 }),
      makeRecord({ id: "r2", transactionDate: "2025-06-10", unitPricePerPing: 1_200_000 }),
      makeRecord({ id: "r3", transactionDate: "2025-06-15", unitPricePerPing: 1_200_000 }),
      makeRecord({ id: "r4", transactionDate: "2025-06-20", unitPricePerPing: 1_200_000 }),
    ];

    const scores = computeHotZoneScores(records, "buy");
    expect(scores).toHaveLength(1);
    expect(scores[0].city).toBe("台北市");
    expect(scores[0].district).toBe("信義區");
    expect(scores[0].priceGrowthPct).toBeCloseTo(0.2, 5);
    expect(scores[0].volumeGrowthPct).toBeCloseTo(1.0, 5);
    expect(scores[0].score).toBe(73);
  });

  it("excludes a district with fewer than 4 records — too few to trust a trend", () => {
    const records: PropertyRecord[] = [
      makeRecord({ id: "a", transactionDate: "2025-01-01" }),
      makeRecord({ id: "b", transactionDate: "2025-06-01" }),
      makeRecord({ id: "c", transactionDate: "2025-06-10" }),
    ];
    expect(computeHotZoneScores(records, "buy")).toEqual([]);
  });

  it("excludes a district where every record shares the same transaction date", () => {
    const records: PropertyRecord[] = [
      makeRecord({ id: "a", transactionDate: "2025-06-01" }),
      makeRecord({ id: "b", transactionDate: "2025-06-01" }),
      makeRecord({ id: "c", transactionDate: "2025-06-01" }),
      makeRecord({ id: "d", transactionDate: "2025-06-01" }),
    ];
    expect(computeHotZoneScores(records, "buy")).toEqual([]);
  });
});

describe("mergeHotZoneScoresByDistrict", () => {
  const score = (over: Partial<HotZoneScore>): HotZoneScore => ({
    city: "台北市",
    district: "信義區",
    dealType: "buy",
    score: 50,
    priceGrowthPct: 0,
    volumeGrowthPct: 0,
    earlierCount: 2,
    recentCount: 2,
    ...over,
  });

  it("prefers the buy score when both buy and rent scores exist for a district", () => {
    const merged = mergeHotZoneScoresByDistrict([
      score({ dealType: "buy", score: 80 }),
      score({ dealType: "rent", score: 20 }),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].score).toBe(80);
    expect(merged[0].dealType).toBe("buy");
  });

  it("falls back to the rent score when no buy score exists for the district", () => {
    const merged = mergeHotZoneScoresByDistrict([score({ dealType: "rent", score: 35 })]);
    expect(merged[0].score).toBe(35);
    expect(merged[0].dealType).toBe("rent");
  });

  it("keeps different districts separate", () => {
    const merged = mergeHotZoneScoresByDistrict([
      score({ district: "信義區" }),
      score({ district: "大安區" }),
    ]);
    expect(merged.map((m) => m.district).sort()).toEqual(["信義區", "大安區"].sort());
  });
});
