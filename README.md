# 好宅選 iLoveHouse

實價登錄查詢 + AI 選屋規劃網站。整合內政部不動產交易實價登錄開放資料，並透過 AI
協助使用者依預算、通勤與生活機能偏好，比較與挑選最適合自己的居住地點（買房／租屋皆可）。

## 功能

- **實價登錄查詢**（`/search`）：依縣市、行政區、交易類型（買賣／租賃）、價格、坪數、建物型態等條件篩選成交行情，並顯示筆數、平均總價、平均單價等統計。
- **AI 選屋規劃**（`/planner`）：輸入預算、候選縣市、工作／常去地點描述、同住人數與生活機能偏好，由 AI 交叉比對候選區域的實價登錄行情，回傳排序後的推薦地區、理由與需留意的取捨；每個推薦地區都附上導向房仲平台搜尋結果的連結，方便查看當下實際待售／待租物件（見下方「關於待售物件」）。

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

### 關於「待售物件」

實價登錄是**已成交**的歷史申報資料（內政部規定成交後 30 天內申報，目的是揭露市場行情），不是待售物件清單。
台灣目前沒有官方或公開的「即時待售物件」資料庫／API；現售物件庫存掌握在 591、樂屋網、信義房屋、永慶房屋等
私人平台手上，且多數平台服務條款明確禁止爬蟲。因此本專案不會、也不建議去爬取這些平台。

`lib/listingLinks.ts` 改用合法、穩定的替代做法：針對 AI 推薦的每個地區，組出導向各房仲平台「網站限定搜尋」
（Google `site:` 搜尋）的連結，讓使用者自行點擊查看當下實際的待售／待租物件，畫面顯示於 `/planner` 每個推薦
地區卡片下方。

## CI/CD 與部署到 Vercel

### CI（GitHub Actions）

`.github/workflows/ci.yml` 會在每次 push 到 `main` 或對 `main` 開 PR 時自動執行：

1. `npm ci` 安裝依賴
2. `npm run lint`（ESLint）
3. `npm test`（vitest 單元測試）
4. `npm run build`（Next.js 正式建置，含型別檢查）

建議在 GitHub repo 設定中將此 workflow 設為 `main` 分支的必要狀態檢查（Settings → Branches →
Branch protection rules），確保沒有通過測試與建置的程式碼不會被合併。

### CD（部署到 Vercel）

本專案是標準的 Next.js App Router 專案，Vercel 可以零設定自動偵測建置方式，最簡單且官方推薦的方式是使用
**Vercel 的 GitHub 整合**（不需要額外寫 GitHub Actions 部署腳本）：

1. 到 [vercel.com](https://vercel.com/) 用你的 GitHub 帳號登入。
2. 點選 **Add New → Project**，選擇 `papap35/ilovehouse` 這個 repository 並 Import。
3. Framework Preset 會自動偵測為 **Next.js**，Build Command / Output Directory 保持預設即可。
4. 在 **Environment Variables** 加入：
   - `ANTHROPIC_API_KEY`：啟用 AI 選屋規劃功能所需（未設定時該功能會自動退回規則式評分，不會壞掉）。
   - `ANTHROPIC_MODEL`（選填）：覆寫預設模型。
5. 點 **Deploy**。之後每次 push 到 `main` 會自動觸發正式環境（Production）部署，每個 PR 會自動產生獨立的
   Preview 部署網址，方便先預覽再合併。

連接完成後，Vercel 的部署狀態與網址會自動顯示在對應的 GitHub PR／commit 上。若你希望改用 GitHub Actions
搭配 Vercel CLI（例如需要更嚴格地「CI 全過才部署」的流程控制），可以另外提供 `VERCEL_TOKEN`、
`VERCEL_ORG_ID`、`VERCEL_PROJECT_ID` 這三個值，我可以再補一個 `.github/workflows/deploy.yml`。

## 免責聲明

本站查詢結果與 AI 建議僅供參考，不構成買賣或租賃決策依據，實際交易請以現場看屋、產權調查與專業意見為準。
