import { DISTRICTS_BY_CITY } from "./regions";
import type { BuildingType, DealType, PropertyRecord } from "./types";

// 政府開放資料在本環境無法連線時的備用資料集。
// 數值為依市場行情概略推估的示範資料，非實際成交紀錄，僅供展示查詢/篩選/AI 規劃流程使用。

// 各縣市買賣「每坪」概略基準價（NTD），實際會依行政區乘上係數再加上隨機浮動
const CITY_BASE_UNIT_PRICE: Record<string, number> = {
  台北市: 950_000,
  新北市: 480_000,
  桃園市: 300_000,
  台中市: 400_000,
  台南市: 300_000,
  高雄市: 290_000,
  新竹市: 480_000,
  新竹縣: 420_000,
};

// 行政區相對於城市基準價的係數（精華區 >1，郊區 <1）
const DISTRICT_MULTIPLIER: Record<string, number> = {
  // 台北市
  大安區: 1.35, 信義區: 1.32, 中正區: 1.15, 中山區: 1.1, 松山區: 1.15,
  萬華區: 0.85, 士林區: 0.95, 北投區: 0.85, 內湖區: 1.0, 南港區: 1.05,
  文山區: 0.8, 大同區: 0.9,
  // 新北市
  板橋區: 1.15, 三重區: 1.0, 中和區: 1.05, 永和區: 1.15, 新莊區: 0.95,
  新店區: 1.1, 土城區: 0.95, 蘆洲區: 1.0, 樹林區: 0.85, 汐止區: 0.95,
  鶯歌區: 0.75, 三峽區: 0.8, 淡水區: 0.85, 林口區: 1.05, 泰山區: 0.85, 五股區: 0.85,
  // 桃園市
  桃園區: 1.1, 中壢區: 1.0, 平鎮區: 0.9, 八德區: 0.9, 楊梅區: 0.75,
  蘆竹區: 0.95, 大溪區: 0.8, 龍潭區: 0.75, 龜山區: 1.0, 大園區: 0.75,
  觀音區: 0.65, 新屋區: 0.6,
  // 台中市
  西屯區: 1.2, 北屯區: 1.05, 南屯區: 1.15, 北區: 1.0, 西區: 1.25,
  南區: 0.9, 中區: 0.85, 東區: 0.85, 大里區: 0.85, 太平區: 0.8,
  豐原區: 0.75, 沙鹿區: 0.75, 烏日區: 0.85, 大雅區: 0.85,
  // 新竹市
  香山區: 0.75,
  // 新竹縣
  竹北市: 1.15, 竹東鎮: 0.75, 湖口鄉: 0.7, 新豐鄉: 0.7, 關西鎮: 0.55,
};

const BUILDING_TYPES: BuildingType[] = [
  "公寓", "華廈", "住宅大樓", "透天厝", "套房",
];

// 簡單、可重現的偽隨機數產生器 (mulberry32)，避免每次 build 產生不同的示範資料
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function generateSampleData(): PropertyRecord[] {
  const rand = mulberry32(20260101);
  const records: PropertyRecord[] = [];
  let idCounter = 1;

  const referenceMonths = [
    "2025-08", "2025-09", "2025-10", "2025-11", "2025-12",
    "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06",
  ];

  for (const [city, districts] of Object.entries(DISTRICTS_BY_CITY)) {
    const baseUnitPrice = CITY_BASE_UNIT_PRICE[city] ?? 300_000;

    for (const district of districts) {
      const multiplier = DISTRICT_MULTIPLIER[district] ?? 0.85 + rand() * 0.3;
      const districtUnitPrice = baseUnitPrice * multiplier;

      const dealPlan: { dealType: DealType; count: number }[] = [
        { dealType: "buy", count: 4 },
        { dealType: "rent", count: 3 },
      ];

      for (const { dealType, count } of dealPlan) {
        for (let i = 0; i < count; i++) {
          const areaPing = Math.round((15 + rand() * 35) * 10) / 10;
          const buildingType = pick(rand, BUILDING_TYPES);
          const floorNum = 1 + Math.floor(rand() * 14);
          const totalFloors = Math.max(floorNum, 5 + Math.floor(rand() * 10));
          const buildYear = 1990 + Math.floor(rand() * 34);
          const noise = 0.85 + rand() * 0.3;

          let unitPricePerPing: number;
          let totalPrice: number;

          if (dealType === "buy") {
            unitPricePerPing = Math.round(districtUnitPrice * noise);
            totalPrice = Math.round(unitPricePerPing * areaPing);
          } else {
            // 租金：概略以年租金報酬率 1.3%~2% 反推月租單價
            const yieldRate = 0.013 + rand() * 0.007;
            unitPricePerPing = Math.round(
              (districtUnitPrice * noise * yieldRate) / 12
            );
            totalPrice = Math.round(unitPricePerPing * areaPing);
          }

          const yearMonth = pick(rand, referenceMonths);
          const transactionDate = `${yearMonth}-${String(
            1 + Math.floor(rand() * 27)
          ).padStart(2, "0")}`;

          records.push({
            id: `sample-${idCounter++}`,
            dealType,
            city,
            district,
            address: `${district}示範路${1 + Math.floor(rand() * 300)}號`,
            buildingType,
            mainUse: "住家用",
            transactionDate,
            totalPrice,
            areaPing,
            unitPricePerPing,
            floor: `${floorNum}樓`,
            totalFloors,
            buildYear,
            rooms: 1 + Math.floor(rand() * 4),
            livingRooms: 1 + Math.floor(rand() * 2),
            bathrooms: 1 + Math.floor(rand() * 2),
            hasManagement: rand() > 0.35,
            note: "",
            source: "sample",
          });
        }
      }
    }
  }

  return records;
}

let cached: PropertyRecord[] | null = null;

export function getSampleData(): PropertyRecord[] {
  if (!cached) {
    cached = generateSampleData();
  }
  return cached;
}
