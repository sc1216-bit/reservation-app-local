import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentGuardianPhoneNumber } from "@/lib/session";

export async function GET() {
  try {
    const phoneNumber = await getCurrentGuardianPhoneNumber();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("phone_number", phoneNumber)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: `신청 내역 조회 실패: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reservations: data ?? [],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "신청 내역 조회 중 오류가 발생했습니다.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}