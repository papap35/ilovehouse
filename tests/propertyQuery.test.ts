import { describe, expect, it } from "vitest";
import { computeStats, filterProperties, paginate, summarizeByArea } from "../lib/propertyQuery";
import type { PropertyRecord } from "../lib/types";

function makeRecord(overrides: Partial<PropertyRecord>): PropertyRecord {
  return {
    id: "id",
    dealType: "buy",
    city: "台北市",
    district: "大安區",
    address: "測試路1號",
    buildingType: "住宅大樓",
    mainUse: "住家用",
    transactionDate: "2024-06-01",
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

describe("filterProperties", () => {
  const records = [
    makeRecord({ id: "1", city: "台北市", district: "大安區", dealType: "buy", totalPrice: 20_000_000, unitPricePerPing: 900_000 }),
    makeRecord({ id: "2", city: "台北市", district: "萬華區", dealType: "buy", totalPrice: 8_000_000, unitPricePerPing: 400_000 }),
    makeRecord({ id: "3", city: "新北市", district: "板橋區", dealType: "rent", totalPrice: 25_000, unitPricePerPing: 1_200 }),
  ];

  it("filters by city and dealType", () => {
    const result = filterProperties(records, { city: "台北市", dealType: "buy" });
    expect(result.map((r) => r.id)).toEqual(["1", "2"]);
  });

  it("filters by price range", () => {
    const result = filterProperties(records, { minTotalPrice: 10_000_000 });
    expect(result.map((r) => r.id)).toEqual(["1"]);
  });

  it("filters by keyword against address or district", () => {
    const result = filterProperties(records, { keyword: "萬華" });
    expect(result.map((r) => r.id)).toEqual(["2"]);
  });

  it("returns all records when filter is empty", () => {
    expect(filterProperties(records, {})).toHaveLength(3);
  });
});

describe("computeStats", () => {
  it("returns zeroed stats for an empty list", () => {
    expect(computeStats([])).toEqual({
      count: 0,
      avgTotalPrice: 0,
      avgUnitPricePerPing: 0,
      medianUnitPricePerPing: 0,
      minUnitPricePerPing: 0,
      maxUnitPricePerPing: 0,
    });
  });

  it("computes average, median, min and max unit price", () => {
    const records = [
      makeRecord({ unitPricePerPing: 100 }),
      makeRecord({ unitPricePerPing: 200 }),
      makeRecord({ unitPricePerPing: 300 }),
    ];
    const stats = computeStats(records);
    expect(stats.count).toBe(3);
    expect(stats.avgUnitPricePerPing).toBe(200);
    expect(stats.medianUnitPricePerPing).toBe(200);
    expect(stats.minUnitPricePerPing).toBe(100);
    expect(stats.maxUnitPricePerPing).toBe(300);
  });
});

describe("paginate", () => {
  it("slices items according to page and pageSize", () => {
    const items = [1, 2, 3, 4, 5];
    expect(paginate(items, 1, 2)).toEqual([1, 2]);
    expect(paginate(items, 2, 2)).toEqual([3, 4]);
    expect(paginate(items, 3, 2)).toEqual([5]);
  });
});

describe("summarizeByArea", () => {
  it("groups by city+district and computes average unit price", () => {
    const records = [
      makeRecord({ city: "台北市", district: "大安區", unitPricePerPing: 900_000, dealType: "buy" }),
      makeRecord({ city: "台北市", district: "大安區", unitPricePerPing: 1_100_000, dealType: "buy" }),
      makeRecord({ city: "台北市", district: "萬華區", unitPricePerPing: 400_000, dealType: "buy" }),
      makeRecord({ city: "台北市", district: "萬華區", unitPricePerPing: 400_000, dealType: "rent" }),
    ];

    const summaries = summarizeByArea(records, "buy");
    expect(summaries).toHaveLength(2);

    const daan = summaries.find((s) => s.district === "大安區");
    expect(daan?.sampleCount).toBe(2);
    expect(daan?.avgUnitPricePerPing).toBe(1_000_000);

    const wanhua = summaries.find((s) => s.district === "萬華區");
    expect(wanhua?.sampleCount).toBe(1);
  });

  it("sorts ascending by average unit price", () => {
    const records = [
      makeRecord({ city: "台北市", district: "A", unitPricePerPing: 900_000 }),
      makeRecord({ city: "台北市", district: "B", unitPricePerPing: 300_000 }),
    ];
    const summaries = summarizeByArea(records, "buy");
    expect(summaries[0].district).toBe("B");
    expect(summaries[1].district).toBe("A");
  });
});
