import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidPhoneNumber(value: string) {
  const normalized = normalizePhoneNumber(value);
  return /^01\d{8,9}$/.test(normalized);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function validatePassword(password: string) {
  if (password.length < 4) {
    return "비밀번호는 4자 이상이어야 합니다.";
  }
  if (password.length > 100) {
    return "비밀번호가 너무 깁니다.";
  }
  return null;
}