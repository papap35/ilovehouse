import { buildListingSearchLinks } from "@/lib/listingLinks";
import type { DealType, RecommendationItem } from "@/lib/types";

interface Props {
  item: RecommendationItem;
  dealType: DealType;
}

export default function RecommendationCard({ item, dealType }: Props) {
  const listingLinks = buildListingSearchLinks(item.city, item.district, dealType);

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

      <div className="mt-4 border-t border-slate-100 pt-3">
        <div className="text-xs font-semibold text-slate-500">
          查看目前待{dealType === "buy" ? "售" : "租"}物件
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          實價登錄是已成交的歷史紀錄，不是待售清單；以下連結導向房仲平台的搜尋結果，實際物件與庫存請以各平台當下顯示為準。
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {listingLinks.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-700"
            >
              {link.label} ↗
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
