import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  hashPassword,
  isValidPhoneNumber,
  normalizePhoneNumber,
  validatePassword,
} from "@/lib/auth";
import { createGuardianSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phoneNumber = normalizePhoneNumber(body?.phoneNumber ?? "");
    const password = String(body?.password ?? "");

    if (!isValidPhoneNumber(phoneNumber)) {
      return NextResponse.json(
        { error: "올바른 휴대폰 번호를 입력해주세요." },
        { status: 400 }
      );
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const supabase = createClient();

    const { data: existingAccount, error: existingError } = await supabase
      .from("guardian_accounts")
      .select("phone_number")
      .eq("phone_number", phoneNumber)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: `계정 확인 실패: ${existingError.message}` },
        { status: 500 }
      );
    }

    if (existingAccount) {
      return NextResponse.json(
        { error: "이미 가입된 전화번호입니다. 로그인해주세요." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const { error: insertError } = await supabase
      .from("guardian_accounts")
      .insert({
        phone_number: phoneNumber,
        password_hash: passwordHash,
      });

    if (insertError) {
      return NextResponse.json(
        { error: `회원가입 실패: ${insertError.message}` },
        { status: 500 }
      );
    }

    await createGuardianSession(phoneNumber);

    return NextResponse.json({
      success: true,
      phoneNumber,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "회원가입 중 오류가 발생했습니다.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}