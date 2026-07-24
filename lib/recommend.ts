import { callClaude, extractJson, isClaudeConfigured } from "./claude";
import { getProperties } from "./govData";
import { filterProperties, summarizeByArea } from "./propertyQuery";
import { getDistrictsForCity } from "./regions";
import type {
  AreaSummary,
  PlannerRequest,
  PlannerResponse,
  PropertyRecord,
  RecommendationItem,
} from "./types";

const LIFESTYLE_LABELS: Record<keyof PlannerRequest["lifestyle"], string> = {
  nearMRT: "鄰近捷運／大眾運輸",
  nearPark: "鄰近公園綠地",
  nearSchool: "鄰近學區",
  nearHospital: "鄰近醫療院所",
  nearMarketOrShopping: "生活機能／市場便利",
  quiet: "居住環境安靜",
  petFriendly: "友善寵物",
};

function activeLifestyleLabels(lifestyle: PlannerRequest["lifestyle"]): string[] {
  return (Object.keys(lifestyle) as (keyof typeof lifestyle)[])
    .filter((k) => lifestyle[k])
    .map((k) => LIFESTYLE_LABELS[k]);
}

/** 估算某區域行情下，指定坪數需要的預算，用來評估與使用者預算的貼合度 */
function estimateBudgetFitScore(
  area: AreaSummary,
  minAreaPing: number,
  budgetMin: number,
  budgetMax: number
): number {
  const estimatedCost = area.avgUnitPricePerPing * minAreaPing;
  if (estimatedCost < budgetMin) {
    // 便宜於預算下限：仍算合理，但給予些微扣分（可能坪數/品質落差）
    const ratio = estimatedCost / Math.max(budgetMin, 1);
    return 70 + Math.min(30, ratio * 30);
  }
  if (estimatedCost <= budgetMax) {
    return 100;
  }
  const overRatio = estimatedCost / budgetMax;
  return Math.max(0, 100 - (overRatio - 1) * 150);
}

function buildRuleBasedRecommendations(
  areas: AreaSummary[],
  request: PlannerRequest,
  recordsByArea: Map<string, PropertyRecord[]>
): RecommendationItem[] {
  const minAreaPing = request.minAreaPing ?? Math.max(10, request.householdSize * 6);

  const scored = areas
    .filter((a) => a.sampleCount >= 2)
    .map((area) => {
      const score = Math.round(
        estimateBudgetFitScore(area, minAreaPing, request.budgetMin, request.budgetMax)
      );
      const key = `${area.city}::${area.district}`;
      const listings = (recordsByArea.get(key) ?? []).slice(0, 3);
      return { area, score, listings };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return scored.map(({ area, score, listings }, idx) => ({
    city: area.city,
    district: area.district,
    rank: idx + 1,
    score,
    reasons: [
      `該區平均${request.dealType === "buy" ? "單價" : "月租單價"}約每坪 ${Math.round(
        area.avgUnitPricePerPing
      ).toLocaleString()} 元，與預算相符程度較高`,
      `近期樣本數 ${area.sampleCount} 筆，資料具一定參考性`,
    ],
    tradeoffs: [
      "此為規則式評分（未啟用 AI），未納入通勤時間與生活機能等主觀偏好的細節判斷",
    ],
    estimatedBudgetFit:
      score >= 90 ? "貼合預算" : score >= 60 ? "略高於預算，可能需調整坪數" : "明顯超出預算",
    representativeListingIds: listings.map((l) => l.id),
  }));
}

function buildAIPrompt(
  request: PlannerRequest,
  areas: AreaSummary[]
): { system: string; userMessage: string } {
  const lifestyleLabels = activeLifestyleLabels(request.lifestyle);

  const system = `你是台灣不動產選屋顧問。你會收到使用者的購屋/租屋需求，以及依「內政部實價登錄」資料彙總出的候選行政區行情摘要（每坪均價、樣本數）。
請你綜合預算、通勤地點描述、居住人數、生活機能偏好，從候選區域中選出最多 5 個最適合的「縣市＋行政區」組合並排序。
務必只根據提供的行情資料與使用者描述做合理推論，不要捏造實際不存在的建案或地址。通勤時間僅能用地理常識概略描述，並清楚說明是概略推估。
請「只」回傳一個 JSON 物件，格式如下，不要有其他文字：
{
  "summary": "一段 2-4 句的整體建議摘要",
  "recommendations": [
    {
      "city": "縣市",
      "district": "行政區",
      "rank": 1,
      "score": 0-100 的整數,
      "reasons": ["推薦理由1", "推薦理由2"],
      "tradeoffs": ["需要注意的取捨或風險"],
      "estimatedBudgetFit": "一句話描述與預算的貼合程度"
    }
  ]
}`;

  const userMessage = JSON.stringify(
    {
      需求: {
        交易類型: request.dealType === "buy" ? "買房" : "租屋",
        預算範圍: [request.budgetMin, request.budgetMax],
        候選縣市: request.candidateCities,
        候選行政區: request.candidateDistricts ?? [],
        工作或常去地點描述: request.workplaceDescription,
        同住人數: request.householdSize,
        期望最小坪數: request.minAreaPing ?? null,
        偏好建物型態: request.buildingTypePreference ?? null,
        生活機能偏好: lifestyleLabels,
        其他備註: request.extraNotes ?? null,
      },
      候選區域行情摘要: areas.map((a) => ({
        縣市: a.city,
        行政區: a.district,
        平均每坪價格: a.avgUnitPricePerPing,
        平均總價或月租: a.avgTotalPrice,
        樣本數: a.sampleCount,
      })),
    },
    null,
    2
  );

  return { system, userMessage };
}

export async function generateRecommendation(
  request: PlannerRequest
): Promise<PlannerResponse> {
  const disclaimer =
    "本建議由行情統計與 AI 推論產生，僅供參考，實際購屋／租屋決策請以現場看屋、產權調查與專業意見為準。";

  const cities = request.candidateCities.length > 0 ? request.candidateCities : [];
  if (cities.length === 0) {
    return {
      summary: "請至少選擇一個候選縣市，AI 才能協助比較區域行情。",
      recommendations: [],
      disclaimer,
      usedAI: false,
    };
  }

  const allRecords: PropertyRecord[] = [];
  for (const city of cities) {
    const { records } = await getProperties({ city, dealType: request.dealType });
    allRecords.push(...records);
  }

  const districtWhitelist =
    request.candidateDistricts && request.candidateDistricts.length > 0
      ? new Set(request.candidateDistricts)
      : null;

  const relevantRecords = filterProperties(allRecords, { dealType: request.dealType }).filter(
    (r) => !districtWhitelist || districtWhitelist.has(r.district)
  );

  let areas = summarizeByArea(relevantRecords, request.dealType);

  if (areas.length === 0) {
    // 候選縣市沒有足夠資料，退回使用該縣市所有行政區清單（樣本數為 0，AI/規則仍可依均價=0排除）
    areas = cities.flatMap((city) =>
      getDistrictsForCity(city).map((district) => ({
        city,
        district,
        dealType: request.dealType,
        sampleCount: 0,
        avgUnitPricePerPing: 0,
        avgTotalPrice: 0,
      }))
    );
  }

  const recordsByArea = new Map<string, PropertyRecord[]>();
  for (const r of relevantRecords) {
    const key = `${r.city}::${r.district}`;
    const arr = recordsByArea.get(key) ?? [];
    arr.push(r);
    recordsByArea.set(key, arr);
  }

  if (isClaudeConfigured()) {
    try {
      const { system, userMessage } = buildAIPrompt(request, areas.slice(0, 25));
      const raw = await callClaude({ system, userMessage, maxTokens: 4096 });
      const parsed = extractJson<{
        summary: string;
        recommendations: RecommendationItem[];
      }>(raw);

      const recommendations: RecommendationItem[] = parsed.recommendations.map((r, idx) => {
        const key = `${r.city}::${r.district}`;
        const listings = (recordsByArea.get(key) ?? []).slice(0, 3);
        return {
          ...r,
          rank: r.rank ?? idx + 1,
          representativeListingIds: listings.map((l) => l.id),
        };
      });

      return {
        summary: parsed.summary,
        recommendations,
        disclaimer,
        usedAI: true,
      };
    } catch (err) {
      // AI 呼叫或解析失敗時，退回規則式評分，確保功能仍可使用
      // eslint-disable-next-line no-console
      console.error("[recommend] Claude 呼叫或回應解析失敗，改用規則式評分：", err);
      const recommendations = buildRuleBasedRecommendations(areas, request, recordsByArea);
      return {
        summary:
          "AI 服務目前無法使用，已改用行情統計的規則式評分為你排序候選地區（僅供參考）。",
        recommendations,
        disclaimer,
        usedAI: false,
      };
    }
  }

  const recommendations = buildRuleBasedRecommendations(areas, request, recordsByArea);
  return {
    summary:
      "尚未設定 AI 金鑰（ANTHROPIC_API_KEY），目前使用行情統計的規則式評分為你排序候選地區。",
    recommendations,
    disclaimer,
    usedAI: false,
  };
}
