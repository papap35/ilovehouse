import { describe, expect, it } from "vitest";
import { findDistrictsWithinRadius, haversineDistanceKm } from "../lib/geo";
import type { DistrictCentroid } from "../lib/districtGeo";

describe("haversineDistanceKm", () => {
  it("returns 0 for identical points", () => {
    expect(haversineDistanceKm([25.03, 121.56], [25.03, 121.56])).toBe(0);
  });

  it("computes a plausible distance between Taipei 101 area and Banqiao", () => {
    // 大安區 -> 板橋區，實際距離約 7~9 公里
    const d = haversineDistanceKm([25.0263, 121.5436], [25.0117, 121.459]);
    expect(d).toBeGreaterThan(5);
    expect(d).toBeLessThan(12);
  });

  it("is symmetric", () => {
    const a: [number, number] = [25.03, 121.5];
    const b: [number, number] = [24.9, 121.3];
    expect(haversineDistanceKm(a, b)).toBeCloseTo(haversineDistanceKm(b, a), 6);
  });
});

describe("findDistrictsWithinRadius", () => {
  const centroids: DistrictCentroid[] = [
    { city: "台北市", district: "大安區", lat: 25.0263, lng: 121.5436 },
    { city: "台北市", district: "信義區", lat: 25.033, lng: 121.5654 },
    { city: "新北市", district: "板橋區", lat: 25.0117, lng: 121.459 },
    { city: "台中市", district: "西屯區", lat: 24.1799, lng: 120.6402 },
  ];

  it("only returns districts within the given radius", () => {
    const result = findDistrictsWithinRadius([25.0263, 121.5436], 3, centroids);
    const keys = result.map((r) => `${r.city}::${r.district}`);
    expect(keys).toContain("台北市::大安區");
    expect(keys).toContain("台北市::信義區");
    expect(keys).not.toContain("新北市::板橋區");
    expect(keys).not.toContain("台中市::西屯區");
  });

  it("can match districts across city boundaries with a larger radius", () => {
    const result = findDistrictsWithinRadius([25.0263, 121.5436], 15, centroids);
    const keys = result.map((r) => `${r.city}::${r.district}`);
    expect(keys).toContain("新北市::板橋區");
    expect(keys).not.toContain("台中市::西屯區");
  });

  it("sorts results by ascending distance", () => {
    const result = findDistrictsWithinRadius([25.0263, 121.5436], 15, centroids);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].distanceKm).toBeGreaterThanOrEqual(result[i - 1].distanceKm);
    }
  });

  it("returns an empty array when nothing is within radius", () => {
    expect(findDistrictsWithinRadius([0, 0], 1, centroids)).toEqual([]);
  });
});
