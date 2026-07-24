"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import FilterForm from "@/components/FilterForm";
import PropertyTable from "@/components/PropertyTable";
import { findDistrictsWithinRadius } from "@/lib/geo";
import { mergeAreaBreakdownByDistrict } from "@/lib/propertyQuery";
import { getDistrictCentroid } from "@/lib/districtGeo";
import type { CityDistrict, PropertyFilter, PropertySearchResult } from "@/lib/types";

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
        <button
          type="button"
          onClick={() => setShowMap((v) => !v)}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:border-brand-400 hover:text-brand-700"
        >
          {showMap ? "隱藏地圖" : "顯示地圖 🗺️"}
        </button>
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
            點「圈選範圍搜尋」後在地圖上點一下設定圓心，用滑桿調整範圍公里數，範圍內的行政區會一起納入查詢結果（可跨縣市）。地圖上的圓點是各行政區的概略中心位置與均價聚合，不是逐筆物件的精確地址。
          </p>
          <PropertyMap
            markers={markers}
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
