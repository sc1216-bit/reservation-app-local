'use client';

import { FormEvent, useState } from 'react';

type Mode = 'login' | 'signup';

type Props = {
  onAuthenticated: () => Promise<void> | void;
};

export default function AuthForm({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, password }),
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
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <p className="text-sm font-semibold text-blue-700">보호자 인증</p>
        <h2 className="mt-2 text-xl font-bold sm:text-2xl">
          {mode === 'login' ? '전화번호로 로그인' : '처음 이용하시나요?'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {mode === 'login'
            ? '전화번호와 비밀번호를 입력하면 바로 수업 신청을 진행할 수 있어요.'
            : '처음 이용하는 경우 전화번호와 비밀번호를 먼저 등록해 주세요.'}
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setMessage(null);
            setError(null);
          }}
          className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
            mode === 'login'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-700'
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
            mode === 'signup'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-700'
          }`}
        >
          처음 이용하기
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-800">
            보호자 전화번호
          </label>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="010-0000-0000"
            required
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
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
            placeholder="비밀번호 입력"
            required
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        {message && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
            <p className="text-sm leading-6 text-emerald-700">{message}</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5">
            <p className="text-sm leading-6 text-rose-700">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition disabled:bg-slate-300"
        >
          {loading
            ? '처리 중...'
            : mode === 'login'
              ? '로그인'
              : '계정 만들기'}
        </button>
      </form>
    </section>
  );
}