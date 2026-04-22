'use client';

import { FormEvent, useMemo, useState } from 'react';

type Mode = 'login' | 'signup';

type Props = {
  onAuthenticated: () => Promise<void> | void;
};

function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, '').slice(0, 11);
}

function formatPhoneNumber(value: string) {
  const digits = normalizePhoneNumber(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export default function AuthForm({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitLabel = loading ? '처리 중...' : mode === 'login' ? '로그인' : '계정 만들기';
  const helperItems = useMemo(
    () =>
      mode === 'login'
        ? ['한 번 로그인하면 바로 다음 단계로 이동합니다.', '기존에 저장한 학생 정보와 신청 내역을 이어서 확인할 수 있습니다.']
        : ['처음 이용 시 전화번호와 비밀번호를 등록합니다.', '가입 후 바로 학생 정보 저장과 일정 선택을 이어서 진행할 수 있습니다.'],
    [mode]
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

      if (normalizedPhoneNumber.length < 10) {
        throw new Error('전화번호를 정확히 입력해 주세요.');
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: normalizedPhoneNumber, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || '처리 중 오류가 발생했습니다.');
      }

      setMessage(mode === 'login' ? '로그인되었습니다.' : '가입이 완료되었습니다.');
      await onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_30%),linear-gradient(180deg,_#ffffff,_#f8fafc)] px-5 py-5 sm:px-6">
        <p className="text-sm font-semibold text-blue-700">보호자 인증</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {mode === 'login' ? '전화번호로 로그인' : '처음 이용하시나요?'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {mode === 'login'
            ? '전화번호와 비밀번호를 입력하면 저장된 학생 정보와 신청 내역을 이어서 확인할 수 있어요.'
            : '처음 이용하는 경우 전화번호와 비밀번호를 먼저 등록해 주세요.'}
        </p>
      </div>

      <div className="p-5 sm:p-6">
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setMessage(null);
              setError(null);
            }}
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
              mode === 'login' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-700'
            }`}
          >
            로그인
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setMessage(null);
              setError(null);
            }}
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
              mode === 'signup' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-700'
            }`}
          >
            처음 이용하기
          </button>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          {helperItems.map((item) => (
            <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm leading-6 text-slate-700">{item}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800">보호자 전화번호</label>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
              placeholder="010-0000-0000"
              required
              className="w-full rounded-2xl border border-slate-300 px-4 py-3.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
            <p className="mt-2 text-xs text-slate-500">숫자만 입력해도 자동으로 형식이 정리됩니다.</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800">
              {mode === 'login' ? '비밀번호' : '사용할 비밀번호'}
            </label>
            <input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'login' ? '비밀번호 입력' : '비밀번호를 설정해 주세요'}
              required
              className="w-full rounded-2xl border border-slate-300 px-4 py-3.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          {message && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-sm leading-6 text-emerald-700">{message}</p>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-sm leading-6 text-rose-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-blue-600 px-4 py-4 text-sm font-semibold text-white transition disabled:bg-slate-300"
          >
            {submitLabel}
          </button>
        </form>
      </div>
    </section>
  );
}
