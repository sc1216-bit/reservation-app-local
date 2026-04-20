import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isValidPhoneNumber,
  normalizePhoneNumber,
  verifyPassword,
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

    if (!password) {
      return NextResponse.json(
        { error: "비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { data: account, error } = await supabase
      .from("guardian_accounts")
      .select("phone_number, password_hash, agreed_at")
      .eq("phone_number", phoneNumber)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: `로그인 실패: ${error.message}` },
        { status: 500 }
      );
    }

    if (!account) {
      return NextResponse.json(
        { error: "가입되지 않은 전화번호입니다." },
        { status: 404 }
      );
    }

    const matched = await verifyPassword(password, account.password_hash);
    if (!matched) {
      return NextResponse.json(
        { error: "전화번호 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    await createGuardianSession(phoneNumber);

    return NextResponse.json({
      success: true,
      phoneNumber,
      agreed: Boolean(account.agreed_at),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "로그인 중 오류가 발생했습니다.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}