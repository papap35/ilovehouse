import { describe, expect, it } from "vitest";
import { DISTRICTS_BY_CITY } from "../lib/regions";
import { getDistrictCentroid, listAllDistrictCentroids } from "../lib/districtGeo";

describe("districtGeo", () => {
  it("has a centroid for every district listed in DISTRICTS_BY_CITY", () => {
    const missing: string[] = [];
    for (const [city, districts] of Object.entries(DISTRICTS_BY_CITY)) {
      for (const district of districts) {
        if (!getDistrictCentroid(city, district)) missing.push(`${city}${district}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("returns coordinates within Taiwan's rough bounding box", () => {
    for (const c of listAllDistrictCentroids()) {
      expect(c.lat).toBeGreaterThan(21.5);
      expect(c.lat).toBeLessThan(25.5);
      expect(c.lng).toBeGreaterThan(119.5);
      expect(c.lng).toBeLessThan(122.5);
    }
  });

  it("returns null for an unknown district", () => {
    expect(getDistrictCentroid("台北市", "不存在區")).toBeNull();
  });

  it("listAllDistrictCentroids count matches the total number of districts", () => {
    const total = Object.values(DISTRICTS_BY_CITY).reduce((sum, ds) => sum + ds.length, 0);
    expect(listAllDistrictCentroids()).toHaveLength(total);
  });
});
