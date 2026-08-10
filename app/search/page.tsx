"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import FilterForm from "@/components/FilterForm";
import PropertyTable from "@/components/PropertyTable";
import { findDistrictsWithinRadius } from "@/lib/geo";
import { mergeAreaBreakdownByDistrict } from "@/lib/propertyQuery";
import { getDistrictCentroid } from "@/lib/districtGeo";
import { buildIndividualMarkers } from "@/lib/geocode";
import type { GeocodeResult } from "@/lib/geocode";
import type {
  CityDistrict,
  DevelopmentPlan,
  HotZoneScore,
  PropertyFilter,
  PropertyRecord,
  PropertySearchResult,
} from "@/lib/types";
import type {
  ColorMode,
  DevelopmentPlanMarker,
  HotZoneScoreMarker,
  IndividualPropertyMarker,
} from "@/components/PropertyMap";

type MapViewMode = "aggregate" | "individual";

const PropertyMap = dynamic(() => import("@/components/PropertyMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-400">
      地圖載入中…
    </div>
  ),
});

const PAGE_SIZE = 20;
const DEFAULT_RADIUS_KM = 5;

function buildQuery(filter: PropertyFilter, page: number): string {
  const params = new URLSearchParams();
  Object.entries(filter).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    if (key === "areas") {
      params.set("areas", JSON.stringify(value));
    } else {
      params.set(key, String(value));
    }
  });
  params.set("page", String(page));
  params.set("pageSize", String(PAGE_SIZE));
  return params.toString();
}

export default function SearchPage() {
  const [filter, setFilter] = useState<PropertyFilter>({});
  const [appliedFilter, setAppliedFilter] = useState<PropertyFilter>({});
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PropertySearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showMap, setShowMap] = useState(false);
  const [pickMode, setPickMode] = useState(false);
  const [circleCenter, setCircleCenter] = useState<[number, number] | null>(null);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);

  const [showDevelopmentPlans, setShowDevelopmentPlans] = useState(false);
  const [developmentPlans, setDevelopmentPlans] = useState<DevelopmentPlanMarker[]>([]);
  const [colorMode, setColorMode] = useState<ColorMode>("price");
  const [hotZoneScores, setHotZoneScores] = useState<HotZoneScoreMarker[]>([]);

  const [mapViewMode, setMapViewMode] = useState<MapViewMode>("aggregate");
  const [individualMarkers, setIndividualMarkers] = useState<IndividualPropertyMarker[]>([]);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodingProgress, setGeocodingProgress] = useState<{ done: number; total: number } | null>(
    null
  );

  const runSearch = useCallback(async (f: PropertyFilter, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/properties?${buildQuery(f, p)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PropertySearchResult = await res.json();
      setResult(data);
    } catch {
      setError("查詢失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runSearch(appliedFilter, page);
  }, [appliedFilter, page, runSearch]);

  useEffect(() => {
    if (!showDevelopmentPlans) return;
    fetch("/api/development-plans")
      .then((res) => res.json())
      .then((data: { plans: DevelopmentPlan[] }) => {
        const withCoords = data.plans
          .map((p) => {
            const centroid = getDistrictCentroid(p.city, p.district);
            return centroid ? { ...p, lat: centroid[0], lng: centroid[1] } : null;
          })
          .filter((p): p is NonNullable<typeof p> => p !== null);
        setDevelopmentPlans(withCoords);
      })
      .catch(() => setDevelopmentPlans([]));
  }, [showDevelopmentPlans]);

  useEffect(() => {
    // 發展熱度不受目前的買賣/租賃/縣市/行政區篩選條件影響，永遠計算全部資料，
    // 所以這裡刻意不依賴 appliedFilter，只依 colorMode 切換時抓一次。
    if (colorMode !== "hotZone") return;
    fetch("/api/hot-zones")
      .then((res) => res.json())
      .then((data: { scores: HotZoneScore[] }) => setHotZoneScores(data.scores ?? []))
      .catch(() => setHotZoneScores([]));
  }, [colorMode]);

  const runGeocoding = useCallback(async (items: PropertyRecord[]) => {
    if (items.length === 0) {
      setIndividualMarkers([]);
      setUnresolvedCount(0);
      return;
    }
    setGeocoding(true);
    setGeocodingProgress({ done: 0, total: items.length });

    const results = new Map<string, GeocodeResult | null>();
    for (let i = 0; i < items.length; i++) {
      const params = new URLSearchParams({ address: items[i].address, city: items[i].city });
      try {
        const res = await fetch(`/api/geocode?${params.toString()}`);
        const data: { result: GeocodeResult | null } = await res.json();
        results.set(items[i].address, data.result ?? null);
      } catch {
        results.set(items[i].address, null);
      }
      setGeocodingProgress({ done: i + 1, total: items.length });
    }

    const built = buildIndividualMarkers(items, results);
    setIndividualMarkers(built.markers);
    setUnresolvedCount(built.unresolvedCount);
    setGeocoding(false);
  }, []);

  useEffect(() => {
    // 個別物件檢視已開啟時，翻頁/重新查詢會換一批新的 result.items，
    // 自動幫新的一頁定位，不用使用者每次都手動再按一次。
    if (mapViewMode !== "individual" || !result || result.dataSource === "sample") return;
    runGeocoding(result.items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapViewMode, result]);

  const handleFormChange = (next: PropertyFilter) => {
    // 手動調整篩選條件時，清掉地圖畫圈範圍搜尋的結果，避免兩種篩選方式互相打架
    setFilter({ ...next, areas: undefined });
  };

  const handleSubmit = () => {
    setPage(1);
    setAppliedFilter(filter);
  };

  const markers = useMemo(() => {
    if (!result) return [];
    return mergeAreaBreakdownByDistrict(result.areaBreakdown)
      .map((m) => {
        const centroid = getDistrictCentroid(m.city, m.district);
        return centroid ? { ...m, lat: centroid[0], lng: centroid[1] } : null;
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
  }, [result]);

  const matchedDistricts = useMemo(() => {
    if (!circleCenter) return [];
    return findDistrictsWithinRadius(circleCenter, radiusKm);
  }, [circleCenter, radiusKm]);

  const highlightedKeys = useMemo(() => {
    if (!circleCenter) return undefined;
    return new Set(matchedDistricts.map((d) => `${d.city}::${d.district}`));
  }, [circleCenter, matchedDistricts]);

  const applyCircleSearch = () => {
    if (matchedDistricts.length === 0) return;
    const areas: CityDistrict[] = matchedDistricts.map((d) => ({
      city: d.city,
      district: d.district,
    }));
    const next: PropertyFilter = { ...filter, areas, city: undefined, district: undefined };
    setFilter(next);
    setPage(1);
    setAppliedFilter(next);
    setPickMode(false);
  };

  const clearCircleSearch = () => {
    setCircleCenter(null);
    setPickMode(false);
    if (appliedFilter.areas) {
      const next: PropertyFilter = { ...filter, areas: undefined };
      setFilter(next);
      setPage(1);
      setAppliedFilter(next);
    }
  };

  const handleMarkerClick = (marker: { city: string; district: string }) => {
    if (pickMode) return;
    const next: PropertyFilter = {
      ...filter,
      areas: undefined,
      city: marker.city,
      district: marker.district,
    };
    setFilter(next);
    setPage(1);
    setAppliedFilter(next);
  };

  const totalPages = result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">實價登錄查詢</h1>
          <p className="mt-1 text-sm text-slate-500">
            依條件篩選買賣／租賃成交行情，快速掌握各行政區的市場價格。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowMap((v) => !v)}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:border-brand-400 hover:text-brand-700"
          >
            {showMap ? "隱藏地圖" : "顯示地圖 🗺️"}
          </button>
          <button
            type="button"
            onClick={() => setShowDevelopmentPlans((v) => !v)}
            className={`rounded-md border px-4 py-2 text-sm font-medium transition ${
              showDevelopmentPlans
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-slate-300 text-slate-600 hover:border-brand-400 hover:text-brand-700"
            }`}
          >
            🏗️ 都市發展計畫標記
          </button>
        </div>
      </div>

      <FilterForm value={filter} onChange={handleFormChange} onSubmit={handleSubmit} />

      {showMap && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setPickMode((v) => !v)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                pickMode
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-slate-300 text-slate-600 hover:border-brand-400"
              }`}
            >
              {pickMode ? "點擊地圖設定圓心中…" : "圈選範圍搜尋"}
            </button>

            <div className="flex items-center gap-1 rounded-md border border-slate-300 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setMapViewMode("aggregate")}
                className={`rounded px-2.5 py-1 font-semibold transition ${
                  mapViewMode === "aggregate"
                    ? "bg-brand-600 text-white"
                    : "text-slate-600 hover:bg-brand-50"
                }`}
              >
                聚合檢視
              </button>
              <button
                type="button"
                onClick={() => setMapViewMode("individual")}
                disabled={!result || result.items.length === 0 || result.dataSource === "sample"}
                title={
                  result?.dataSource === "sample"
                    ? "示範資料的地址是虛構的，無法定位個別地址"
                    : undefined
                }
                className={`rounded px-2.5 py-1 font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  mapViewMode === "individual"
                    ? "bg-brand-600 text-white"
                    : "text-slate-600 hover:bg-brand-50"
                }`}
              >
                個別物件檢視
              </button>
            </div>

            {mapViewMode === "aggregate" && (
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                上色依據
                <select
                  className="rounded-md border border-slate-300 px-2 py-1"
                  value={colorMode}
                  onChange={(e) => setColorMode(e.target.value as ColorMode)}
                >
                  <option value="price">均價</option>
                  <option value="hotZone">發展熱度</option>
                </select>
              </label>
            )}

            {mapViewMode === "individual" && geocoding && geocodingProgress && (
              <span className="text-xs text-slate-500">
                正在定位地址 {geocodingProgress.done}/{geocodingProgress.total}…
              </span>
            )}

            {mapViewMode === "individual" && !geocoding && unresolvedCount > 0 && (
              <span className="text-xs text-amber-600">
                {unresolvedCount} 筆因地址無法定位而未顯示
              </span>
            )}

            {circleCenter && (
              <>
                <label className="flex items-center gap-2 text-xs text-slate-500">
                  半徑
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                  />
                  {radiusKm} 公里
                </label>
                <span className="text-xs text-slate-400">
                  範圍內 {matchedDistricts.length} 個行政區
                </span>
                <button
                  type="button"
                  onClick={applyCircleSearch}
                  disabled={matchedDistricts.length === 0}
                  className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
                >
                  套用此範圍搜尋
                </button>
                <button
                  type="button"
                  onClick={clearCircleSearch}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-500"
                >
                  清除範圍
                </button>
              </>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            「聚合檢視」的圓點是各行政區的概略中心位置聚合，不是逐筆物件的精確地址；「個別物件檢視」會用
            Nominatim（OpenStreetMap 免費地理編碼服務）幫目前頁面（最多 20 筆）的地址定位，受頻率限制影響需要一點時間，示範資料的地址是虛構的無法使用。點「圈選範圍搜尋」後在地圖上點一下設定圓心，用滑桿調整範圍公里數，範圍內的行政區會一起納入查詢結果（可跨縣市）。🏗️
            標記為都市發展計畫的<strong>示範資料</strong>，不對應真實案件；「發展熱度」上色不受目前篩選條件影響，反映該區近期成交行情的成長趨勢。
          </p>
          <PropertyMap
            markers={mapViewMode === "aggregate" ? markers : []}
            individualMarkers={mapViewMode === "individual" ? individualMarkers : []}
            hotZoneScores={hotZoneScores}
            colorMode={colorMode}
            developmentPlans={showDevelopmentPlans ? developmentPlans : []}
            highlightedKeys={highlightedKeys}
            circle={circleCenter ? { center: circleCenter, radiusKm } : null}
            pickMode={pickMode}
            onMapClick={(lat, lng) => setCircleCenter([lat, lng])}
            onMarkerClick={handleMarkerClick}
          />
        </div>
      )}

      {appliedFilter.areas && appliedFilter.areas.length > 0 && (
        <div className="rounded-md bg-brand-50 px-4 py-2 text-xs text-brand-800">
          目前套用地圖範圍搜尋，涵蓋 {appliedFilter.areas.length} 個行政區。
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard label="筆數" value={`${result.total} 筆`} />
          <StatCard label="平均總價／月租" value={formatMoney(result.stats.avgTotalPrice)} />
          <StatCard
            label="平均單價／坪"
            value={formatMoney(result.stats.avgUnitPricePerPing)}
          />
          <StatCard
            label="資料來源"
            value={result.dataSource === "gov_open_data" ? "政府開放資料（即時）" : "示範資料"}
          />
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
          查詢中…
        </div>
      ) : (
        result && <PropertyTable items={result.items} />
      )}

      {result && result.total > 0 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40"
          >
            上一頁
          </button>
          <span className="text-slate-500">
            第 {page} / {totalPages} 頁
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40"
          >
            下一頁
          </button>
        </div>
      )}
    </div>
  );
}

function formatMoney(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)} 萬`;
  return n.toLocaleString();
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-bold text-slate-800">{value}</div>
    </div>
  );
}
