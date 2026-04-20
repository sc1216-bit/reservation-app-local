import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentGuardianPhoneNumber } from "@/lib/session";

export async function GET() {
  try {
    const phoneNumber = await getCurrentGuardianPhoneNumber();

    if (!phoneNumber) {
      return NextResponse.json({
        authenticated: false,
      });
    }

    const supabase = createClient();

    const [{ data: account, error: accountError }, { data: students, error: studentsError }] =
      await Promise.all([
        supabase
          .from("guardian_accounts")
          .select("phone_number, agreed_at, created_at, updated_at")
          .eq("phone_number", phoneNumber)
          .maybeSingle(),
        supabase
          .from("guardian_students")
          .select("id, school_name, student_name, created_at, updated_at")
          .eq("phone_number", phoneNumber)
          .order("created_at", { ascending: true }),
      ]);

    if (accountError) {
      return NextResponse.json(
        { error: `계정 조회 실패: ${accountError.message}` },
        { status: 500 }
      );
    }

    if (studentsError) {
      return NextResponse.json(
        { error: `학생 정보 조회 실패: ${studentsError.message}` },
        { status: 500 }
      );
    }

    if (!account) {
      return NextResponse.json({
        authenticated: false,
      });
    }

    return NextResponse.json({
      authenticated: true,
      phoneNumber: account.phone_number,
      agreed: Boolean(account.agreed_at),
      students: (students ?? []).map((student) => ({
        id: student.id,
        schoolName: student.school_name,
        studentName: student.student_name,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "내 정보 조회 중 오류가 발생했습니다.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}