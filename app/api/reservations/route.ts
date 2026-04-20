import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentGuardianPhoneNumber } from "@/lib/session";

export async function DELETE(request: Request) {
  try {
    const phoneNumber = await getCurrentGuardianPhoneNumber();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const studentNames = Array.isArray(body?.studentNames) ? body.studentNames : [];
    const slotIds = Array.isArray(body?.slotIds) ? body.slotIds : [];

    if (!studentNames.length || !slotIds.length) {
      return NextResponse.json(
        { error: "취소할 학생 또는 일정 정보가 없습니다." },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { error } = await supabase
      .from("reservations")
      .delete()
      .eq("phone_number", phoneNumber)
      .in("student_name", studentNames)
      .in("slot_id", slotIds);

    if (error) {
      return NextResponse.json(
        { error: `신청 취소 실패: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "신청 취소 중 오류가 발생했습니다.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}