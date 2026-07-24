# 好宅選 iLoveHouse

實價登錄查詢 + AI 選屋規劃網站。整合內政部不動產交易實價登錄開放資料，並透過 AI
協助使用者依預算、通勤與生活機能偏好，比較與挑選最適合自己的居住地點（買房／租屋皆可）。

## 功能

- **實價登錄查詢**（`/search`）：依縣市、行政區、交易類型（買賣／租賃）、價格、坪數、建物型態等條件篩選成交行情，並顯示筆數、平均總價、平均單價等統計。
- **AI 選屋規劃**（`/planner`）：輸入預算、候選縣市、工作／常去地點描述、同住人數與生活機能偏好，由 AI 交叉比對候選區域的實價登錄行情，回傳排序後的推薦地區、理由與需留意的取捨。

## 技術架構

- Next.js 14（App Router）＋ TypeScript ＋ Tailwind CSS，前後端同一個專案（API Routes）。
- `lib/govData.ts`：即時向「[內政部不動產交易實價查詢服務網](https://plvr.land.moi.gov.tw/DownloadOpenData)」開放資料下載 CSV 並解析、標準化為內部資料格式。
- `lib/sampleData.ts`：當外部網路無法連線、或找不到指定縣市／季度資料時的備用示範資料集（依市場行情概略推估產生，非真實成交紀錄），確保查詢與 AI 規劃流程在任何環境下都能運作，畫面上會標示目前使用的資料來源。
- `lib/claude.ts` / `lib/recommend.ts`：呼叫 Anthropic Claude API，依使用者需求與候選區域行情摘要產生排序後的推薦與理由；若未設定 API 金鑰或呼叫失敗，會自動退回規則式評分（依預算貼合度排序），不影響功能可用性。

```
app/
  page.tsx              首頁
  search/page.tsx        實價登錄查詢頁
  planner/page.tsx       AI 選屋規劃頁
  api/properties/route.ts   查詢 API
  api/recommend/route.ts    AI 規劃 API
components/               UI 元件（表單、表格、推薦卡片、導覽列）
lib/
  types.ts                共用型別
  regions.ts               縣市／行政區與政府開放資料縣市代碼對照表
  govData.ts               CSV 抓取／解析／標準化
  sampleData.ts             備用示範資料
  propertyQuery.ts          篩選／統計／區域彙總（純函式，易於測試）
  claude.ts                 Anthropic Claude API 呼叫封裝
  recommend.ts               AI 選屋規劃邏輯（含規則式 fallback）
tests/                     vitest 單元測試
```

## 開發

```bash
npm install
cp .env.example .env.local   # 設定 ANTHROPIC_API_KEY 才能啟用 AI 選屋規劃
npm run dev                  # http://localhost:3000
npm test                     # 執行單元測試
npm run build                # 正式環境建置（含型別檢查）
```

### 環境變數

| 變數 | 說明 |
| --- | --- |
| `ANTHROPIC_API_KEY` | 啟用 AI 選屋規劃所需的 Claude API 金鑰，見 [Anthropic Console](https://console.anthropic.com/)。未設定時，`/planner` 會自動改用規則式評分，功能仍可使用。 |
| `ANTHROPIC_MODEL` | 選填，覆寫預設使用的 Claude 模型（預設 `claude-sonnet-5`）。 |

### 關於實價登錄資料來源

`/api/properties` 與 AI 規劃流程會嘗試即時向內政部開放資料下載指定縣市當季（及往回兩季）的
CSV 成交資料並解析標準化；若佈署環境無法對外連線到 `plvr.land.moi.gov.tw`（例如本沙盒開發環境即無法連線），
或該縣市/季度查無資料，會自動退回內建的示範資料集，讓查詢、篩選、統計與 AI 規劃流程仍可完整運作。
回應中的 `dataSource` 欄位（`gov_open_data` / `sample`）與畫面上的統計卡片會標示目前使用的資料來源。

## 免責聲明

本站查詢結果與 AI 建議僅供參考，不構成買賣或租賃決策依據，實際交易請以現場看屋、產權調查與專業意見為準。
