import type { PropertyRecord } from "@/lib/types";

function formatMoney(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)} 萬`;
  return n.toLocaleString();
}

export default function PropertyTable({ items }: { items: PropertyRecord[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        沒有符合條件的成交紀錄，試著放寬篩選條件看看。
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">縣市／行政區</th>
            <th className="px-4 py-3">地址</th>
            <th className="px-4 py-3">類型</th>
            <th className="px-4 py-3">坪數</th>
            <th className="px-4 py-3">{"總價／月租"}</th>
            <th className="px-4 py-3">單價／坪</th>
            <th className="px-4 py-3">交易日期</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((r) => (
            <tr key={r.id} className="hover:bg-brand-50/40">
              <td className="px-4 py-3 font-medium text-slate-800">
                {r.city} {r.district}
              </td>
              <td className="px-4 py-3 text-slate-600">{r.address}</td>
              <td className="px-4 py-3 text-slate-600">
                {r.buildingType}
                <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                  {r.dealType === "buy" ? "買賣" : "租賃"}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600">{r.areaPing} 坪</td>
              <td className="px-4 py-3 font-semibold text-brand-700">
                {formatMoney(r.totalPrice)}
                {r.dealType === "rent" ? " /月" : ""}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {formatMoney(r.unitPricePerPing)}
                {r.dealType === "rent" ? " /月" : ""}
              </td>
              <td className="px-4 py-3 text-slate-500">{r.transactionDate || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
