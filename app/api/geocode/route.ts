import { NextRequest, NextResponse } from "next/server";
import { geocodeOneAddress } from "@/lib/geocode";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const address = params.get("address");
  const city = params.get("city");
  const district = params.get("district");

  if (!address || !city || !district) {
    return NextResponse.json({ error: "缺少 address、city 或 district" }, { status: 400 });
  }

  try {
    const result = await geocodeOneAddress(address, city, district);
    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json(
      { error: "地理編碼時發生錯誤", detail: String(err) },
      { status: 500 }
    );
  }
}
