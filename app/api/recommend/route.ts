import { NextRequest, NextResponse } from "next/server";
import { generateRecommendation } from "@/lib/recommend";
import type { PlannerRequest } from "@/lib/types";

function isValidRequest(body: any): body is PlannerRequest {
  return (
    body &&
    (body.dealType === "buy" || body.dealType === "rent") &&
    typeof body.budgetMin === "number" &&
    typeof body.budgetMax === "number" &&
    Array.isArray(body.candidateCities) &&
    typeof body.workplaceDescription === "string" &&
    typeof body.householdSize === "number" &&
    body.lifestyle &&
    typeof body.lifestyle === "object"
  );
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "無效的請求內容" }, { status: 400 });
  }

  if (!isValidRequest(body)) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  if (body.budgetMin > body.budgetMax) {
    return NextResponse.json({ error: "預算下限不可大於上限" }, { status: 400 });
  }

  try {
    const result = await generateRecommendation(body);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "產生選屋建議時發生錯誤", detail: String(err) },
      { status: 500 }
    );
  }
}
