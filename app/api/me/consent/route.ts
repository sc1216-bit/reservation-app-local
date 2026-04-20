import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentGuardianPhoneNumber } from "@/lib/session";

export async function POST() {
  try {
    const phoneNumber = await getCurrentGuardianPhoneNumber();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const supabase = createClient();

    const { error } = await supabase
      .from("guardian_accounts")
      .update({ agreed_at: new Date().toISOString() })
      .eq("phone_number", phoneNumber);

    if (error) {
      return NextResponse.json(
        { error: `동의 저장 실패: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "동의 저장 중 오류가 발생했습니다.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}