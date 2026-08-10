import { describe, expect, it } from "vitest";
import { buildIndividualMarkers, readGeocodeCache, writeGeocodeCache } from "../lib/geocode";
import type { GeocodeCacheEntry, GeocodeResult } from "../lib/geocode";
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

describe("readGeocodeCache / writeGeocodeCache", () => {
  it("returns undefined for an address that was never cached", () => {
    const cache = new Map<string, GeocodeCacheEntry>();
    expect(readGeocodeCache(cache, "台北市大安區忠孝東路四段1號")).toBeUndefined();
  });

  it("round-trips a successful geocode result", () => {
    const cache = new Map<string, GeocodeCacheEntry>();
    const address = "台北市大安區忠孝東路四段1號";
    writeGeocodeCache(cache, address, { lat: 25.04, lng: 121.56 }, 1000);
    expect(readGeocodeCache(cache, address, 1500)).toEqual({ lat: 25.04, lng: 121.56 });
  });

  it("distinguishes a known-not-found result (null) from never-cached (undefined)", () => {
    const cache = new Map<string, GeocodeCacheEntry>();
    const address = "查不到的地址";
    writeGeocodeCache(cache, address, null, 1000);
    expect(readGeocodeCache(cache, address, 1500)).toBeNull();
    expect(readGeocodeCache(cache, "從沒查過的地址", 1500)).toBeUndefined();
  });

  it("treats an expired cache entry as a miss (undefined)", () => {
    const cache = new Map<string, GeocodeCacheEntry>();
    const address = "台北市大安區忠孝東路四段1號";
    const TTL_MS = 1000 * 60 * 60 * 24;
    writeGeocodeCache(cache, address, { lat: 25.04, lng: 121.56 }, 1000);
    expect(readGeocodeCache(cache, address, 1000 + TTL_MS - 1)).toEqual({
      lat: 25.04,
      lng: 121.56,
    });
    expect(readGeocodeCache(cache, address, 1000 + TTL_MS + 1)).toBeUndefined();
  });
});

describe("buildIndividualMarkers", () => {
  it("builds a marker for each item with a resolved geocode result", () => {
    const items = [
      makeRecord({ id: "1", address: "忠孝東路四段1號" }),
      makeRecord({ id: "2", address: "敦化南路二段2號" }),
    ];
    const results = new Map<string, GeocodeResult | null>([
      ["忠孝東路四段1號", { lat: 25.04, lng: 121.56 }],
      ["敦化南路二段2號", { lat: 25.03, lng: 121.55 }],
    ]);

    const { markers, unresolvedCount } = buildIndividualMarkers(items, results);

    expect(markers).toHaveLength(2);
    expect(markers[0]).toMatchObject({ id: "1", lat: 25.04, lng: 121.56 });
    expect(unresolvedCount).toBe(0);
  });

  it("skips items whose address failed to geocode (null) and counts them", () => {
    const items = [
      makeRecord({ id: "1", address: "查得到的地址" }),
      makeRecord({ id: "2", address: "查不到的地址" }),
    ];
    const results = new Map<string, GeocodeResult | null>([
      ["查得到的地址", { lat: 25.04, lng: 121.56 }],
      ["查不到的地址", null],
    ]);

    const { markers, unresolvedCount } = buildIndividualMarkers(items, results);

    expect(markers).toHaveLength(1);
    expect(markers[0].id).toBe("1");
    expect(unresolvedCount).toBe(1);
  });

  it("treats an item missing from the results map (not yet geocoded) as unresolved too", () => {
    const items = [makeRecord({ id: "1", address: "還沒查過的地址" })];
    const results = new Map<string, GeocodeResult | null>();

    const { markers, unresolvedCount } = buildIndividualMarkers(items, results);

    expect(markers).toHaveLength(0);
    expect(unresolvedCount).toBe(1);
  });
});
