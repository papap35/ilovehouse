"use client";

import { CITY_LIST } from "@/lib/regions";
import type { DealType, LifestylePreferences, PlannerRequest } from "@/lib/types";

interface Props {
  value: PlannerRequest;
  onChange: (next: PlannerRequest) => void;
  onSubmit: () => void;
  loading: boolean;
}

const LIFESTYLE_OPTIONS: { key: keyof LifestylePreferences; label: string }[] = [
  { key: "nearMRT", label: "鄰近捷運／大眾運輸" },
  { key: "nearPark", label: "鄰近公園綠地" },
  { key: "nearSchool", label: "鄰近學區" },
  { key: "nearHospital", label: "鄰近醫療院所" },
  { key: "nearMarketOrShopping", label: "生活機能／市場便利" },
  { key: "quiet", label: "居住環境安靜" },
  { key: "petFriendly", label: "友善寵物" },
];

export default function PlannerForm({ value, onChange, onSubmit, loading }: Props) {
  const set = <K extends keyof PlannerRequest>(key: K, v: PlannerRequest[K]) => {
    onChange({ ...value, [key]: v });
  };

  const toggleCity = (city: string) => {
    const has = value.candidateCities.includes(city);
    set(
      "candidateCities",
      has
        ? value.candidateCities.filter((c) => c !== city)
        : [...value.candidateCities, city]
    );
  };

  const toggleLifestyle = (key: keyof LifestylePreferences) => {
    set("lifestyle", { ...value.lifestyle, [key]: !value.lifestyle[key] });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <label className="block text-sm font-medium text-slate-700">交易類型</label>
        <div className="mt-2 flex gap-4 text-sm">
          {(["buy", "rent"] as DealType[]).map((dt) => (
            <label key={dt} className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={value.dealType === dt}
                onChange={() => set("dealType", dt)}
              />
              {dt === "buy" ? "買房" : "租屋"}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            預算下限（萬元）
          </label>
          <input
            type="number"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={value.budgetMin ? value.budgetMin / 10000 : ""}
            onChange={(e) => set("budgetMin", Number(e.target.value) * 10000)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            預算上限（萬元）
          </label>
          <input
            type="number"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={value.budgetMax ? value.budgetMax / 10000 : ""}
            onChange={(e) => set("budgetMax", Number(e.target.value) * 10000)}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          候選縣市（可複選，AI 會從中挑選最適合的行政區）
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {CITY_LIST.map((city) => {
            const active = value.candidateCities.includes(city);
            return (
              <button
                type="button"
                key={city}
                onClick={() => toggleCity(city)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  active
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-300 text-slate-600 hover:border-brand-300"
                }`}
              >
                {city}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            工作／常去地點描述
          </label>
          <input
            type="text"
            placeholder="例如：台北市信義區上班，希望通勤 30 分鐘內"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={value.workplaceDescription}
            onChange={(e) => set("workplaceDescription", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">同住人數</label>
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={value.householdSize}
            onChange={(e) => set("householdSize", Number(e.target.value))}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          生活機能偏好（可複選）
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          {LIFESTYLE_OPTIONS.map((opt) => (
            <label key={opt.key} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={value.lifestyle[opt.key]}
                onChange={() => toggleLifestyle(opt.key)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          其他備註（選填）
        </label>
        <textarea
          rows={3}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={value.extraNotes ?? ""}
          onChange={(e) => set("extraNotes", e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={loading || value.candidateCities.length === 0}
        className="w-full rounded-md bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? "AI 分析中…" : "產生選屋建議"}
      </button>
    </form>
  );
}
