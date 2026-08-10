import { NextRequest, NextResponse } from "next/server";
import { getDevelopmentPlans } from "@/lib/developmentPlans";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const city = params.get("city") ?? undefined;
  const district = params.get("district") ?? undefined;

  const plans = getDevelopmentPlans({ city, district });
  return NextResponse.json({ plans });
}
