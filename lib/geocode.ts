import type { DealType, PropertyRecord } from "./types";

export interface GeocodeResult {
  lat: number;
  lng: number;
}

export interface GeocodeCacheEntry {
  result: GeocodeResult | null; // null = 已知查不到（不是還沒查過）
  cachedAt: number;
}

// 地址對應的座標不太會變，用較長的 TTL，減少對 Nominatim 的重複請求
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

/**
 * 讀取地理編碼快取。回傳三種情況：
 * - GeocodeResult：曾經查到座標
 * - null：曾經查過但查不到（已知失敗，不需要再查一次）
 * - undefined：從未查過，或快取已過期，視同未快取
 */
export function readGeocodeCache(
  cache: Map<string, GeocodeCacheEntry>,
  address: string,
  now: number = Date.now()
): GeocodeResult | null | undefined {
  const entry = cache.get(address);
  if (!entry) return undefined;
  if (now - entry.cachedAt > CACHE_TTL_MS) return undefined;
  return entry.result;
}

export function writeGeocodeCache(
  cache: Map<string, GeocodeCacheEntry>,
  address: string,
  result: GeocodeResult | null,
  now: number = Date.now()
): void {
  cache.set(address, { result, cachedAt: now });
}

export interface IndividualMarker {
  id: string;
  lat: number;
  lng: number;
  dealType: DealType;
  address: string;
  city: string;
  district: string;
  totalPrice: number;
  areaPing: number;
  unitPricePerPing: number;
}

/**
 * 把目前頁面的物件轉成個別物件地圖標記。地址在 results 裡缺少（還沒查過）
 * 或值為 null（查過但查不到）都視為未定位，略過不顯示、計入 unresolvedCount，
 * 不退回聚合的行政區中心點（避免大量物件疊在同一點造成誤導）。
 */
export function buildIndividualMarkers(
  items: PropertyRecord[],
  results: Map<string, GeocodeResult | null>
): { markers: IndividualMarker[]; unresolvedCount: number } {
  const markers: IndividualMarker[] = [];
  let unresolvedCount = 0;

  for (const item of items) {
    const result = results.get(item.address);
    if (!result) {
      unresolvedCount++;
      continue;
    }
    markers.push({
      id: item.id,
      lat: result.lat,
      lng: result.lng,
      dealType: item.dealType,
      address: item.address,
      city: item.city,
      district: item.district,
      totalPrice: item.totalPrice,
      areaPing: item.areaPing,
      unitPricePerPing: item.unitPricePerPing,
    });
  }

  return { markers, unresolvedCount };
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
// Nominatim 使用政策要求帶上能識別應用程式的 User-Agent
const USER_AGENT = "iLoveHouse/1.0 (housing search demo app; github.com/papap35/ilovehouse)";
// Nominatim 使用政策限制約每秒 1 次請求，抓稍微保守一點的間隔
const RATE_LIMIT_MS = 1100;

const geocodeCache = new Map<string, GeocodeCacheEntry>();
let nextAllowedRequestAt = 0;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchFromNominatim(
  address: string,
  city: string,
  district: string
): Promise<GeocodeResult | null> {
  // 政府開放資料的 address（土地位置建物門牌）欄位本身不含行政區名稱，
  // district 是分開的欄位；查詢字串一定要把 district 補回去，不然像
  // 「文化路二段155巷12號」這種街名在很多行政區都可能重複出現，
  // Nominatim 常常會直接查不到。
  const query = `台灣 ${city}${district}${address}`;
  const url = `${NOMINATIM_URL}?format=json&limit=1&countrycodes=tw&q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "zh-TW" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const lat = Number(data[0]?.lat);
    const lng = Number(data[0]?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

/**
 * 查詢單一地址的座標，含快取與跨請求的頻率限制（同一個溫熱的伺服器實例內，
 * 不會對 Nominatim 送出間隔小於 RATE_LIMIT_MS 的請求）。查不到時回傳 null
 * 並寫入快取，避免對已知查不到的地址重複嘗試。
 */
export async function geocodeOneAddress(
  address: string,
  city: string,
  district: string
): Promise<GeocodeResult | null> {
  const cached = readGeocodeCache(geocodeCache, address);
  if (cached !== undefined) return cached;

  const wait = nextAllowedRequestAt - Date.now();
  if (wait > 0) await sleep(wait);
  nextAllowedRequestAt = Date.now() + RATE_LIMIT_MS;

  const result = await fetchFromNominatim(address, city, district);
  writeGeocodeCache(geocodeCache, address, result);
  return result;
}
