import { NextResponse } from "next/server";
import { clearGuardianSession } from "@/lib/session";

export async function POST() {
  try {
    await clearGuardianSession();

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "로그아웃 중 오류가 발생했습니다.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}