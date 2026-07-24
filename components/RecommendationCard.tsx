import type { RecommendationItem } from "@/lib/types";

export default function RecommendationCard({ item }: { item: RecommendationItem }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold text-brand-600">第 {item.rank} 名</span>
          <h3 className="text-lg font-bold text-slate-900">
            {item.city} {item.district}
          </h3>
        </div>
        <div className="text-right">
          <div className="text-2xl font-extrabold text-brand-700">{item.score}</div>
          <div className="text-[10px] text-slate-400">適合度分數</div>
        </div>
      </div>

      <p className="mt-2 text-sm font-medium text-slate-600">{item.estimatedBudgetFit}</p>

      <div className="mt-3">
        <div className="text-xs font-semibold text-slate-500">推薦理由</div>
        <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-slate-700">
          {item.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      {item.tradeoffs.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-semibold text-slate-500">需留意的取捨</div>
          <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-slate-500">
            {item.tradeoffs.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
