"use client";

import { useCallback, useEffect, useState } from "react";
import FilterForm from "@/components/FilterForm";
import PropertyTable from "@/components/PropertyTable";
import type { PropertyFilter, PropertySearchResult } from "@/lib/types";

const PAGE_SIZE = 20;

function buildQuery(filter: PropertyFilter, page: number): string {
  const params = new URLSearchParams();
  Object.entries(filter).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
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

  const runSearch = useCallback(async (f: PropertyFilter, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/properties?${buildQuery(f, p)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PropertySearchResult = await res.json();
      setResult(data);
    } catch (e) {
      setError("查詢失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runSearch(appliedFilter, page);
  }, [appliedFilter, page, runSearch]);

  const handleSubmit = () => {
    setPage(1);
    setAppliedFilter(filter);
  };

  const totalPages = result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">實價登錄查詢</h1>
        <p className="mt-1 text-sm text-slate-500">
          依條件篩選買賣／租賃成交行情，快速掌握各行政區的市場價格。
        </p>
      </div>

      <FilterForm value={filter} onChange={setFilter} onSubmit={handleSubmit} />

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
