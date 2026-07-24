"use client";

import { CITY_LIST, getDistrictsForCity } from "@/lib/regions";
import type { DealType, PropertyFilter } from "@/lib/types";

interface Props {
  value: PropertyFilter;
  onChange: (next: PropertyFilter) => void;
  onSubmit: () => void;
}

const BUILDING_TYPES = ["公寓", "華廈", "住宅大樓", "透天厝", "套房"];

export default function FilterForm({ value, onChange, onSubmit }: Props) {
  const districts = value.city ? getDistrictsForCity(value.city) : [];

  const set = <K extends keyof PropertyFilter>(key: K, v: PropertyFilter[K]) => {
    onChange({ ...value, [key]: v });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
    >
      <div>
        <label className="block text-xs font-medium text-slate-500">交易類型</label>
        <select
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={value.dealType ?? ""}
          onChange={(e) => set("dealType", (e.target.value || undefined) as DealType)}
        >
          <option value="">買賣＋租賃</option>
          <option value="buy">買賣</option>
          <option value="rent">租賃</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500">縣市</label>
        <select
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={value.city ?? ""}
          onChange={(e) => {
            set("city", e.target.value || undefined);
            set("district", undefined);
          }}
        >
          <option value="">不限縣市</option>
          {CITY_LIST.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500">行政區</label>
        <select
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
          value={value.district ?? ""}
          disabled={!value.city}
          onChange={(e) => set("district", e.target.value || undefined)}
        >
          <option value="">不限行政區</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500">建物型態</label>
        <select
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={value.buildingType ?? ""}
          onChange={(e) => set("buildingType", e.target.value || undefined)}
        >
          <option value="">不限</option>
          {BUILDING_TYPES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500">
          總價下限（萬元）
        </label>
        <input
          type="number"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={value.minTotalPrice ? value.minTotalPrice / 10000 : ""}
          onChange={(e) =>
            set("minTotalPrice", e.target.value ? Number(e.target.value) * 10000 : undefined)
          }
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500">
          總價上限（萬元）
        </label>
        <input
          type="number"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={value.maxTotalPrice ? value.maxTotalPrice / 10000 : ""}
          onChange={(e) =>
            set("maxTotalPrice", e.target.value ? Number(e.target.value) * 10000 : undefined)
          }
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500">坪數下限</label>
        <input
          type="number"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={value.minAreaPing ?? ""}
          onChange={(e) =>
            set("minAreaPing", e.target.value ? Number(e.target.value) : undefined)
          }
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500">坪數上限</label>
        <input
          type="number"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={value.maxAreaPing ?? ""}
          onChange={(e) =>
            set("maxAreaPing", e.target.value ? Number(e.target.value) : undefined)
          }
        />
      </div>

      <div className="sm:col-span-2 lg:col-span-4">
        <label className="block text-xs font-medium text-slate-500">
          關鍵字（地址／行政區）
        </label>
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            placeholder="例如：捷運、忠孝東路"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={value.keyword ?? ""}
            onChange={(e) => set("keyword", e.target.value || undefined)}
          />
          <button
            type="submit"
            className="shrink-0 rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            查詢
          </button>
        </div>
      </div>
    </form>
  );
}
