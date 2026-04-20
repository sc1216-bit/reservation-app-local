import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";

const SESSION_COOKIE_NAME = "guardian_session";

function getExpiryDate(days = 14) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
}

export async function createGuardianSession(phoneNumber: string) {
  const supabase = createClient();
  const cookieStore = await cookies();
  const sessionToken = randomUUID();
  const expiresAt = getExpiryDate(14).toISOString();

  const { error } = await supabase.from("guardian_sessions").insert({
    session_token: sessionToken,
    phone_number: phoneNumber,
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error(`세션 생성 실패: ${error.message}`);
  }

  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });

  return { sessionToken, expiresAt };
}

export async function getCurrentGuardianPhoneNumber() {
  const supabase = createClient();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("guardian_sessions")
    .select("phone_number, expires_at")
    .eq("session_token", sessionToken)
    .gt("expires_at", now)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.phone_number as string;
}

export async function clearGuardianSession() {
  const supabase = createClient();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    await supabase
      .from("guardian_sessions")
      .delete()
      .eq("session_token", sessionToken);
  }

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}