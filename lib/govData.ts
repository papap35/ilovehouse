import { CITY_CODE } from "./regions";
import { getSampleData } from "./sampleData";
import type { DealType, PropertyRecord } from "./types";

const SQM_PER_PING = 3.305785;

/**
 * 內政部不動產交易實價查詢服務網開放資料下載端點。
 * 檔名格式：{縣市代碼}_LVR_LAND_{A|B|C}.CSV
 *   A = 成屋買賣、B = 預售屋買賣、C = 租賃
 * 文件： https://plvr.land.moi.gov.tw/DownloadOpenData
 */
const GOV_DATA_BASE_URL = "https://plvr.land.moi.gov.tw/DownloadSeason";

function dealTypeToFileCode(dealType: DealType): "A" | "C" {
  return dealType === "buy" ? "A" : "C";
}

/** 將西元日期換算為目前所在的民國「season」字串，例如 114S1 */
export function getCurrentSeason(date = new Date()): string {
  const rocYear = date.getFullYear() - 1911;
  const month = date.getMonth() + 1;
  const quarter = Math.ceil(month / 3);
  return `${rocYear}S${quarter}`;
}

/** 取得目前 season 之前一季，供查無資料時往回嘗試 */
export function getPreviousSeason(season: string): string {
  const match = /^(\d+)S(\d)$/.exec(season);
  if (!match) return season;
  let year = Number(match[1]);
  let quarter = Number(match[2]) - 1;
  if (quarter < 1) {
    quarter = 4;
    year -= 1;
  }
  return `${year}S${quarter}`;
}

/** 民國年月日 (例："1130615" 或 "113/06/15") 轉 ISO yyyy-mm-dd，解析失敗回傳空字串 */
export function minguoDateToISO(raw: string | undefined | null): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 5) return "";
  const yearLen = digits.length - 4;
  const rocYear = Number(digits.slice(0, yearLen));
  const month = digits.slice(yearLen, yearLen + 2);
  const day = digits.slice(yearLen + 2, yearLen + 4);
  if (!rocYear || !month || !day) return "";
  const westernYear = rocYear + 1911;
  return `${westernYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/** 解析 CSV 文字為二維字串陣列，支援雙引號包覆與跳脫逗號/換行 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.length > 0)) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((f) => f.length > 0)) rows.push(row);
  }
  return rows;
}

const HEADER_ALIASES = {
  district: ["鄉鎮市區"],
  address: ["土地位置建物門牌"],
  transactionDate: ["交易年月日", "租賃年月日"],
  buildingType: ["建物型態"],
  mainUse: ["主要用途"],
  totalFloors: ["總樓層數"],
  floor: ["移轉層次", "租賃層次"],
  buildDate: ["建築完成年月"],
  areaSqm: ["建物移轉總面積平方公尺", "建物總面積平方公尺"],
  totalPrice: ["總價元", "總額元"],
  unitPricePerSqm: ["單價元平方公尺", "單價（元/平方公尺）", "單價(元/平方公尺)"],
  rooms: ["建物現況格局-房"],
  livingRooms: ["建物現況格局-廳"],
  bathrooms: ["建物現況格局-衛"],
  hasManagement: ["有無管理組織"],
  note: ["備註"],
} as const;

function buildHeaderIndex(headerRow: string[]): Record<string, number> {
  const index: Record<string, number> = {};
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const alias of aliases) {
      const found = headerRow.findIndex((h) => h.trim() === alias);
      if (found >= 0) {
        index[key] = found;
        break;
      }
    }
  }
  return index;
}

function parseIntSafe(value: string | undefined): number | null {
  if (!value) return null;
  const digits = value.match(/\d+/)?.[0];
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

function parseFloorNumber(value: string | undefined): number {
  const n = parseIntSafe(value);
  return n ?? 1;
}

/**
 * 將政府開放資料的原始 CSV 資料列（含表頭）轉換為內部標準化的 PropertyRecord。
 * 用 header 名稱動態對應欄位索引，能容忍買賣(A)/租賃(C) 檔案欄位順序與細節差異。
 */
export function normalizeGovRows(
  rows: string[][],
  city: string,
  dealType: DealType
): PropertyRecord[] {
  if (rows.length < 2) return [];
  const headerIndex = buildHeaderIndex(rows[0]);
  const dataRows = rows.slice(1);
  const records: PropertyRecord[] = [];

  dataRows.forEach((r, i) => {
    const get = (key: keyof typeof HEADER_ALIASES) => {
      const idx = headerIndex[key];
      return idx === undefined ? undefined : r[idx];
    };

    const areaSqm = Number(get("areaSqm")) || 0;
    const areaPing = Math.round((areaSqm / SQM_PER_PING) * 10) / 10;
    const totalPrice = Number(get("totalPrice")) || 0;
    const unitPricePerSqm = Number(get("unitPricePerSqm")) || 0;
    const unitPricePerPing = unitPricePerSqm
      ? Math.round(unitPricePerSqm * SQM_PER_PING)
      : areaPing > 0
        ? Math.round(totalPrice / areaPing)
        : 0;

    if (!totalPrice || !areaPing) return; // 略過資料不完整的列

    const buildDateRaw = get("buildDate");
    const buildIso = minguoDateToISO(buildDateRaw);

    records.push({
      id: `gov-${city}-${dealType}-${i}`,
      dealType,
      city,
      district: (get("district") ?? "").trim(),
      address: (get("address") ?? "").trim(),
      buildingType: (get("buildingType") ?? "其他").trim() || "其他",
      mainUse: (get("mainUse") ?? "").trim(),
      transactionDate: minguoDateToISO(get("transactionDate")),
      totalPrice,
      areaPing,
      unitPricePerPing,
      floor: (get("floor") ?? "").trim(),
      totalFloors: parseFloorNumber(get("totalFloors")),
      buildYear: buildIso ? Number(buildIso.slice(0, 4)) : null,
      rooms: parseIntSafe(get("rooms")),
      livingRooms: parseIntSafe(get("livingRooms")),
      bathrooms: parseIntSafe(get("bathrooms")),
      hasManagement: get("hasManagement")
        ? get("hasManagement") === "有"
        : null,
      note: (get("note") ?? "").trim(),
      source: "gov_open_data",
    });
  });

  return records;
}

const liveCache = new Map<string, { fetchedAt: number; records: PropertyRecord[] }>();
const LIVE_CACHE_TTL_MS = 1000 * 60 * 60; // 1 小時

async function fetchGovCsv(city: string, dealType: DealType): Promise<PropertyRecord[]> {
  const cityCode = CITY_CODE[city];
  if (!cityCode) return [];

  const cacheKey = `${city}:${dealType}`;
  const cached = liveCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < LIVE_CACHE_TTL_MS) {
    return cached.records;
  }

  const fileCode = dealTypeToFileCode(dealType);
  const fileName = `${cityCode}_LVR_LAND_${fileCode}.CSV`;
  let season = getCurrentSeason();

  // 政府資料通常會落後一季，最多往回嘗試兩季
  for (let attempt = 0; attempt < 3; attempt++) {
    const url = `${GOV_DATA_BASE_URL}?season=${season}&fileName=${fileName}`;
    try {
      const res = await fetch(url, {
        headers: { Accept: "text/csv,*/*" },
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const text = await res.text();
        const rows = parseCsv(text);
        const records = normalizeGovRows(rows, city, dealType);
        if (records.length > 0) {
          liveCache.set(cacheKey, { fetchedAt: Date.now(), records });
          return records;
        }
      }
    } catch {
      // 連線失敗（本地開發或無外部網路環境），往回一季或最終交由呼叫端 fallback
    }
    season = getPreviousSeason(season);
  }

  return [];
}

export interface GetPropertiesOptions {
  city?: string;
  dealType?: DealType;
}

export interface GetPropertiesResult {
  records: PropertyRecord[];
  dataSource: "gov_open_data" | "sample";
}

/**
 * 取得實價登錄資料。若有指定縣市，會嘗試即時向內政部開放資料下載並解析；
 * 若連線失敗、找不到資料，或未指定縣市（避免一次對 21 個縣市發送請求），
 * 則退回使用內建示範資料集，讓查詢與 AI 規劃流程在離線環境下仍可運作。
 */
export async function getProperties(
  options: GetPropertiesOptions = {}
): Promise<GetPropertiesResult> {
  const { city, dealType } = options;

  if (city && CITY_CODE[city]) {
    const dealTypes: DealType[] = dealType ? [dealType] : ["buy", "rent"];
    const results = await Promise.all(
      dealTypes.map((dt) => fetchGovCsv(city, dt))
    );
    const combined = results.flat();
    if (combined.length > 0) {
      return { records: combined, dataSource: "gov_open_data" };
    }
  }

  const sample = getSampleData().filter((r) => {
    if (city && r.city !== city) return false;
    if (dealType && r.dealType !== dealType) return false;
    return true;
  });
  return { records: sample, dataSource: "sample" };
}
