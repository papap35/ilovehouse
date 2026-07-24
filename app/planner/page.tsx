"use client";

import { useState } from "react";
import PlannerForm from "@/components/PlannerForm";
import RecommendationCard from "@/components/RecommendationCard";
import type { PlannerRequest, PlannerResponse } from "@/lib/types";

const DEFAULT_REQUEST: PlannerRequest = {
  dealType: "buy",
  budgetMin: 8_000_000,
  budgetMax: 15_000_000,
  candidateCities: [],
  workplaceDescription: "",
  householdSize: 2,
  lifestyle: {
    nearMRT: true,
    nearPark: false,
    nearSchool: false,
    nearHospital: false,
    nearMarketOrShopping: true,
    quiet: false,
    petFriendly: false,
  },
};

export default function PlannerPage() {
  const [request, setRequest] = useState<PlannerRequest>(DEFAULT_REQUEST);
  const [response, setResponse] = useState<PlannerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setResponse(data);
    } catch (e: any) {
      setError(e?.message ?? "產生建議時發生錯誤，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">AI 選屋規劃</h1>
        <p className="mt-1 text-sm text-slate-500">
          告訴我們你的預算、想住的縣市與生活需求，AI 會交叉比對實價登錄行情，推薦最適合你的地區。
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PlannerForm
          value={request}
          onChange={setRequest}
          onSubmit={handleSubmit}
          loading={loading}
        />

        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {response && (
            <>
              <div className="rounded-xl bg-brand-50 p-4 text-sm text-brand-900">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {response.usedAI ? "🤖 AI 分析摘要" : "📊 規則式分析摘要"}
                  </span>
                </div>
                <p className="mt-1">{response.summary}</p>
              </div>

              {response.recommendations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                  目前候選區域沒有足夠的成交資料可供比較，試著調整縣市或預算範圍。
                </div>
              ) : (
                <div className="space-y-4">
                  {response.recommendations.map((item) => (
                    <RecommendationCard
                      key={`${item.city}-${item.district}`}
                      item={item}
                      dealType={request.dealType}
                    />
                  ))}
                </div>
              )}

              <p className="text-xs text-slate-400">{response.disclaimer}</p>
            </>
          )}

          {!response && !error && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
              填寫左側表單後，AI 選屋建議會顯示在這裡。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
