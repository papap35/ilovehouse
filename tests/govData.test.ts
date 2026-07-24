import { describe, expect, it } from "vitest";
import {
  getCurrentSeason,
  getPreviousSeason,
  minguoDateToISO,
  normalizeGovRows,
  parseCsv,
} from "../lib/govData";

describe("parseCsv", () => {
  it("parses simple comma-separated rows", () => {
    const csv = "a,b,c\n1,2,3\n4,5,6";
    expect(parseCsv(csv)).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
      ["4", "5", "6"],
    ]);
  });

  it("handles quoted fields containing commas and newlines", () => {
    const csv = 'name,note\n"忠孝東路, 三段","備註內容\n第二行"';
    const rows = parseCsv(csv);
    expect(rows).toEqual([
      ["name", "note"],
      ["忠孝東路, 三段", "備註內容\n第二行"],
    ]);
  });

  it("skips blank trailing lines", () => {
    const csv = "a,b\n1,2\n\n";
    expect(parseCsv(csv)).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("minguoDateToISO", () => {
  it("converts 7-digit minguo date", () => {
    expect(minguoDateToISO("1130615")).toBe("2024-06-15");
  });

  it("converts slash-separated minguo date", () => {
    expect(minguoDateToISO("113/06/15")).toBe("2024-06-15");
  });

  it("returns empty string for invalid input", () => {
    expect(minguoDateToISO("")).toBe("");
    expect(minguoDateToISO(undefined)).toBe("");
    expect(minguoDateToISO("abc")).toBe("");
  });
});

describe("season helpers", () => {
  it("computes current season from a given date", () => {
    expect(getCurrentSeason(new Date("2024-02-15"))).toBe("113S1");
    expect(getCurrentSeason(new Date("2024-07-01"))).toBe("113S3");
    expect(getCurrentSeason(new Date("2024-12-31"))).toBe("113S4");
  });

  it("computes previous season, rolling back the year at Q1", () => {
    expect(getPreviousSeason("113S2")).toBe("113S1");
    expect(getPreviousSeason("113S1")).toBe("112S4");
  });
});

describe("normalizeGovRows", () => {
  const header = [
    "鄉鎮市區",
    "土地位置建物門牌",
    "交易年月日",
    "建物型態",
    "主要用途",
    "總樓層數",
    "移轉層次",
    "建築完成年月",
    "建物移轉總面積平方公尺",
    "總價元",
    "單價元平方公尺",
    "建物現況格局-房",
    "建物現況格局-廳",
    "建物現況格局-衛",
    "有無管理組織",
    "備註",
  ];

  it("maps a well-formed government row to a PropertyRecord", () => {
    const row = [
      "大安區",
      "忠孝東路四段1號",
      "1130615",
      "住宅大樓",
      "住家用",
      "12層",
      "5樓",
      "1050101",
      "99.17", // ~30 坪
      "30000000",
      "302700", // 元/平方公尺 -> 約 100 萬/坪
      "3",
      "2",
      "2",
      "有",
      "",
    ];

    const [record] = normalizeGovRows([header, row], "台北市", "buy");

    expect(record.city).toBe("台北市");
    expect(record.district).toBe("大安區");
    expect(record.dealType).toBe("buy");
    expect(record.areaPing).toBeCloseTo(30, 0);
    expect(record.totalPrice).toBe(30000000);
    expect(record.unitPricePerPing).toBeGreaterThan(900000);
    expect(record.transactionDate).toBe("2024-06-15");
    expect(record.buildYear).toBe(2016);
    expect(record.hasManagement).toBe(true);
    expect(record.source).toBe("gov_open_data");
  });

  it("skips rows missing price or area", () => {
    const incomplete = [...header].map(() => "");
    const rows = normalizeGovRows([header, incomplete], "台北市", "buy");
    expect(rows).toHaveLength(0);
  });

  it("returns empty array when there is no data row", () => {
    expect(normalizeGovRows([header], "台北市", "buy")).toEqual([]);
  });
});
