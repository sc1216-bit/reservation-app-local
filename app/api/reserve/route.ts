import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentGuardianPhoneNumber } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const phoneNumber = await getCurrentGuardianPhoneNumber();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const slotIds = Array.isArray(body?.slotIds) ? body.slotIds : [];
    const students = Array.isArray(body?.students) ? body.students : [];

    if (slotIds.length === 0) {
      return NextResponse.json(
        { error: "선택한 일정이 없습니다." },
        { status: 400 }
      );
    }

    if (students.length === 0) {
      return NextResponse.json(
        { error: "학생 정보를 선택해주세요." },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { data, error } = await supabase.rpc("create_reservations_batch", {
      p_slot_ids: slotIds,
      p_phone_number: phoneNumber,
      p_students: students,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "예약 신청에 실패했습니다." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      result: data,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "예약 신청 중 오류가 발생했습니다.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}