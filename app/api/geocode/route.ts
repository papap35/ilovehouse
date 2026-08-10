import { NextRequest, NextResponse } from "next/server";
import { geocodeOneAddress } from "@/lib/geocode";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const address = params.get("address");
  const city = params.get("city");

  if (!address || !city) {
    return NextResponse.json({ error: "缺少 address 或 city" }, { status: 400 });
  }

  try {
    const result = await geocodeOneAddress(address, city);
    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json(
      { error: "地理編碼時發生錯誤", detail: String(err) },
      { status: 500 }
    );
  }
}
