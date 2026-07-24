import { describe, expect, it } from "vitest";
import { buildListingSearchLinks } from "../lib/listingLinks";

describe("buildListingSearchLinks", () => {
  it("returns one link per platform", () => {
    const links = buildListingSearchLinks("台北市", "大安區", "buy");
    expect(links.length).toBeGreaterThan(0);
    expect(links.every((l) => l.label && l.url)).toBe(true);
  });

  it("encodes a site-restricted Google search query per platform", () => {
    const links = buildListingSearchLinks("台北市", "大安區", "buy");
    const url = new URL(links[0].url);
    expect(url.hostname).toBe("www.google.com");
    const q = url.searchParams.get("q") ?? "";
    expect(q).toContain("site:");
    expect(q).toContain("台北市大安區");
    expect(q).toContain("買賣");
  });

  it("uses 租屋 keyword for rent deal type", () => {
    const links = buildListingSearchLinks("新北市", "板橋區", "rent");
    const url = new URL(links[0].url);
    expect(url.searchParams.get("q")).toContain("租屋");
  });

  it("produces valid, distinct URLs across platforms", () => {
    const links = buildListingSearchLinks("台中市", "西屯區", "buy");
    const urls = links.map((l) => l.url);
    expect(new Set(urls).size).toBe(urls.length);
  });
});
