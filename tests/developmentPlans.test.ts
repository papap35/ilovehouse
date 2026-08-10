import { describe, expect, it } from "vitest";
import { getDevelopmentPlans } from "../lib/developmentPlans";

describe("getDevelopmentPlans", () => {
  it("returns records that are all marked as demo data", () => {
    const plans = getDevelopmentPlans();
    expect(plans.length).toBeGreaterThan(0);
    expect(plans.every((p) => p.source === "demo")).toBe(true);
  });

  it("filters by city, excluding records from other cities", () => {
    const plans = getDevelopmentPlans({ city: "台北市" });
    expect(plans.length).toBeGreaterThan(0);
    expect(plans.every((p) => p.city === "台北市")).toBe(true);
    expect(getDevelopmentPlans().some((p) => p.city !== "台北市")).toBe(true);
  });

  it("filters by city and district together", () => {
    const plans = getDevelopmentPlans({ city: "新北市", district: "板橋區" });
    expect(plans.length).toBeGreaterThan(0);
    expect(plans.every((p) => p.city === "新北市" && p.district === "板橋區")).toBe(true);
  });
});
