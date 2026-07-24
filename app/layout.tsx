import type { Metadata } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "好宅選 iLoveHouse ｜ 實價登錄查詢與 AI 選屋規劃",
  description:
    "查詢台灣不動產實價登錄成交行情，並透過 AI 協助規劃、比較最適合自己的居住地點。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body>
        <Nav />
        <main className="mx-auto min-h-[calc(100vh-64px)] max-w-6xl px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
          資料來源：內政部不動產交易實價查詢服務網開放資料（連線失敗時使用示範資料）。
          本站僅供參考，不構成買賣或租賃建議。
        </footer>
      </body>
    </html>
  );
}
