import Link from "next/link";

const FEATURES = [
  {
    title: "實價登錄查詢",
    desc: "串接內政部不動產交易實價登錄開放資料，依縣市、行政區、價格、坪數等條件篩選買賣與租賃成交行情。",
    href: "/search",
    cta: "開始查詢",
  },
  {
    title: "AI 選屋規劃",
    desc: "輸入預算、通勤地點與生活機能偏好，由 AI 交叉比對實價登錄行情，推薦最適合你的候選地區並說明理由。",
    href: "/planner",
    cta: "開始規劃",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-16">
      <section className="text-center">
        <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
          買房、租屋，先看懂行情，再交給 AI 幫你比較
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-slate-600">
          好宅選整合政府實價登錄公開資料，並用 AI
          協助你依照預算、通勤與生活機能，找出最適合自己的居住地點。
        </p>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-300 hover:shadow-md"
          >
            <h2 className="text-xl font-bold text-slate-900 group-hover:text-brand-700">
              {f.title}
            </h2>
            <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
            <span className="mt-4 inline-block text-sm font-semibold text-brand-600">
              {f.cta} →
            </span>
          </Link>
        ))}
      </section>

      <section className="rounded-xl bg-brand-50 p-6 text-sm text-brand-900">
        <h3 className="font-bold">關於資料來源</h3>
        <p className="mt-2">
          查詢結果會嘗試即時向「內政部不動產交易實價查詢服務網」開放資料下載最新一季成交案件；
          若因網路環境限制無法連線，系統會自動改用內建的示範資料，讓你仍能體驗完整的查詢與 AI
          規劃流程。畫面上會標示目前使用的資料來源。
        </p>
      </section>
    </div>
  );
}
