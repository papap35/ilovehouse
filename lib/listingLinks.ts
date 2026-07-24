import type { DealType } from "./types";

export interface ListingLink {
  label: string;
  url: string;
}

// 實價登錄是「已成交」的歷史申報資料，不是待售物件清單；目前台灣沒有
// 官方/公開的即時待售物件資料庫或 API。這裡改用 Google 網站限定搜尋
// （site:）導向各大房仲平台的搜尋結果，讓使用者自行查看當下真正的
// 待售/待租物件，而不是直接爬取這些平台（多數平台服務條款禁止爬蟲）。
const LISTING_PLATFORMS: { label: string; domain: string }[] = [
  { label: "591 房屋交易", domain: "591.com.tw" },
  { label: "樂屋網", domain: "rakuya.com.tw" },
  { label: "信義房屋", domain: "sinyi.com.tw" },
  { label: "永慶房屋", domain: "yungching.com.tw" },
];

export function buildListingSearchLinks(
  city: string,
  district: string,
  dealType: DealType
): ListingLink[] {
  const dealKeyword = dealType === "buy" ? "買賣" : "租屋";
  const query = `${city}${district} ${dealKeyword}`;

  return LISTING_PLATFORMS.map(({ label, domain }) => ({
    label,
    url: `https://www.google.com/search?q=${encodeURIComponent(`site:${domain} ${query}`)}`,
  }));
}
