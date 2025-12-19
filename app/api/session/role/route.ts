import { NextResponse } from "next/server";
import { getCurrentRole } from "@/lib/auth";

export async function GET() {
  const role = await getCurrentRole();
  return NextResponse.json({ role });
}
