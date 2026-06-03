import { NextResponse } from "next/server";
import { getCityFacilities } from "@/lib/sos/actions";

export async function POST(request: Request) {
  try {
    const { city, state } = await request.json();
    if (!city || !state) {
      return NextResponse.json({ error: "city and state required" }, { status: 400 });
    }
    const { facilities, error } = await getCityFacilities(city, state);
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }
    return NextResponse.json({ facilities });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
