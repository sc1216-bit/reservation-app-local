import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentGuardianPhoneNumber } from "@/lib/session";

type StudentInput = {
  schoolName?: string;
  studentName?: string;
};

type NormalizedStudent = {
  school_name: string;
  student_name: string;
};

export async function PUT(request: Request) {
  try {
    const phoneNumber = await getCurrentGuardianPhoneNumber();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const students = Array.isArray(body?.students)
      ? (body.students as StudentInput[])
      : [];

    const normalized: NormalizedStudent[] = students
      .map((student: StudentInput): NormalizedStudent => ({
        school_name: String(student?.schoolName ?? "").trim(),
        student_name: String(student?.studentName ?? "").trim(),
      }))
      .filter(
        (student: NormalizedStudent) =>
          student.school_name.length > 0 && student.student_name.length > 0
      );

    if (normalized.length === 0) {
      return NextResponse.json(
        { error: "학생 정보를 1명 이상 입력해주세요." },
        { status: 400 }
      );
    }

    const uniqueKeys = new Set(
      normalized.map(
        (student: NormalizedStudent) =>
          `${student.school_name}::${student.student_name}`
      )
    );

    if (uniqueKeys.size !== normalized.length) {
      return NextResponse.json(
        { error: "중복된 학생 정보가 있습니다." },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from("guardian_students")
      .delete()
      .eq("phone_number", phoneNumber);

    if (deleteError) {
      return NextResponse.json(
        { error: `기존 학생 정보 삭제 실패: ${deleteError.message}` },
        { status: 500 }
      );
    }

    const { error: insertError } = await supabase
      .from("guardian_students")
      .insert(
        normalized.map((student: NormalizedStudent) => ({
          phone_number: phoneNumber,
          school_name: student.school_name,
          student_name: student.student_name,
        }))
      );

    if (insertError) {
      return NextResponse.json(
        { error: `학생 정보 저장 실패: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "학생 정보 저장 중 오류가 발생했습니다.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}