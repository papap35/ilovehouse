import type { DevelopmentPlan } from "./types";

// 都市發展計畫標記的示範資料。台灣沒有全國統一、即時可信的都更/都市計畫
// 開放資料 API（見 issue #11 的調查），因此比照 lib/sampleData.ts 的做法，
// 用完全虛構的案名起步，明確標示 source: "demo"，不對應任何真實案件。
const DEMO_PLANS: DevelopmentPlan[] = [
  {
    id: "plan-1",
    city: "台北市",
    district: "大安區",
    type: "都更",
    stage: "實施中",
    name: "大安區都市更新示範案 A",
    description: "示範資料：老舊公寓整合改建案，範例用途，非真實案件。",
    source: "demo",
  },
  {
    id: "plan-2",
    city: "新北市",
    district: "板橋區",
    type: "都市計畫",
    stage: "已核定",
    name: "板橋區都市計畫變更示範案",
    description: "示範資料：土地使用分區調整案，範例用途，非真實案件。",
    source: "demo",
  },
  {
    id: "plan-3",
    city: "桃園市",
    district: "桃園區",
    type: "都更",
    stage: "規劃中",
    name: "桃園區都市更新示範案",
    description: "示範資料：站區周邊街廓更新規劃，範例用途，非真實案件。",
    source: "demo",
  },
  {
    id: "plan-4",
    city: "台中市",
    district: "西屯區",
    type: "都市計畫",
    stage: "已核定",
    name: "西屯區都市計畫變更示範案",
    description: "示範資料：園區周邊土地使用調整案，範例用途，非真實案件。",
    source: "demo",
  },
  {
    id: "plan-5",
    city: "台中市",
    district: "北區",
    type: "都更",
    stage: "已完成",
    name: "北區都市更新示範案",
    description: "示範資料：老舊街區重建完工案例，範例用途，非真實案件。",
    source: "demo",
  },
  {
    id: "plan-6",
    city: "台南市",
    district: "東區",
    type: "都更",
    stage: "實施中",
    name: "東區都市更新示範案",
    description: "示範資料：舊市區整建住宅更新案，範例用途，非真實案件。",
    source: "demo",
  },
  {
    id: "plan-7",
    city: "高雄市",
    district: "苓雅區",
    type: "都市計畫",
    stage: "規劃中",
    name: "苓雅區都市計畫變更示範案",
    description: "示範資料：商業區土地使用分區檢討案，範例用途，非真實案件。",
    source: "demo",
  },
  {
    id: "plan-8",
    city: "新竹市",
    district: "東區",
    type: "都更",
    stage: "已核定",
    name: "東區都市更新示範案",
    description: "示範資料：科學園區周邊住宅更新案，範例用途，非真實案件。",
    source: "demo",
  },
  {
    id: "plan-9",
    city: "新竹縣",
    district: "竹北市",
    type: "都市計畫",
    stage: "已核定",
    name: "竹北市都市計畫變更示範案",
    description: "示範資料：新興重劃區細部計畫調整案，範例用途，非真實案件。",
    source: "demo",
  },
];

export interface DevelopmentPlanFilter {
  city?: string;
  district?: string;
}

export function getDevelopmentPlans(filter: DevelopmentPlanFilter = {}): DevelopmentPlan[] {
  return DEMO_PLANS.filter((p) => {
    if (filter.city && p.city !== filter.city) return false;
    if (filter.district && p.district !== filter.district) return false;
    return true;
  });
}
