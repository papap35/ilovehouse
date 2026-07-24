export type DealType = "buy" | "rent";

export type BuildingType =
  | "公寓"
  | "華廈"
  | "住宅大樓"
  | "透天厝"
  | "套房"
  | "店面"
  | "廠辦"
  | "其他";

export interface PropertyRecord {
  id: string;
  dealType: DealType;
  city: string;
  district: string;
  address: string;
  buildingType: BuildingType | string;
  mainUse: string;
  transactionDate: string; // ISO yyyy-mm-dd (converted from 民國年)
  // buy: 總價 (NTD)；rent: 月租金 (NTD/月)
  totalPrice: number;
  areaPing: number; // 坪
  // buy: 每坪單價 (NTD/坪)；rent: 每坪月租 (NTD/坪/月)
  unitPricePerPing: number;
  floor: string;
  totalFloors: number;
  buildYear: number | null; // 西元年
  rooms: number | null;
  livingRooms: number | null;
  bathrooms: number | null;
  hasManagement: boolean | null;
  note: string;
  source: "gov_open_data" | "sample";
}

export interface CityDistrict {
  city: string;
  district: string;
}

export interface PropertyFilter {
  dealType?: DealType;
  city?: string;
  district?: string;
  // 用於地圖畫圈範圍搜尋：符合任一組 city+district 即納入結果，
  // 可跨越多個縣市。設定此欄位時會取代 city/district 單選欄位。
  areas?: CityDistrict[];
  buildingType?: string;
  minTotalPrice?: number;
  maxTotalPrice?: number;
  minAreaPing?: number;
  maxAreaPing?: number;
  minUnitPrice?: number;
  maxUnitPrice?: number;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface PropertyStats {
  count: number;
  avgTotalPrice: number;
  avgUnitPricePerPing: number;
  medianUnitPricePerPing: number;
  minUnitPricePerPing: number;
  maxUnitPricePerPing: number;
}

export interface PropertySearchResult {
  items: PropertyRecord[];
  stats: PropertyStats;
  total: number;
  page: number;
  pageSize: number;
  dataSource: "gov_open_data" | "sample";
  // 依目前篩選條件（分頁前）依行政區彙總的統計，供地圖標記使用
  areaBreakdown: AreaSummary[];
}

export interface LifestylePreferences {
  nearMRT: boolean;
  nearPark: boolean;
  nearSchool: boolean;
  nearHospital: boolean;
  nearMarketOrShopping: boolean;
  quiet: boolean;
  petFriendly: boolean;
}

export interface PlannerRequest {
  dealType: DealType;
  budgetMin: number;
  budgetMax: number;
  candidateCities: string[];
  candidateDistricts?: string[];
  workplaceDescription: string;
  householdSize: number;
  minAreaPing?: number;
  buildingTypePreference?: string;
  lifestyle: LifestylePreferences;
  extraNotes?: string;
}

export interface AreaSummary {
  city: string;
  district: string;
  dealType: DealType;
  sampleCount: number;
  avgUnitPricePerPing: number;
  avgTotalPrice: number;
}

export interface RecommendationItem {
  city: string;
  district: string;
  rank: number;
  score: number; // 0-100
  reasons: string[];
  tradeoffs: string[];
  estimatedBudgetFit: string;
  representativeListingIds: string[];
}

export interface PlannerResponse {
  summary: string;
  recommendations: RecommendationItem[];
  disclaimer: string;
  usedAI: boolean;
}
