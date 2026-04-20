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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setMessage(null);
            setError(null);
          }}
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${
            mode === 'login' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
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
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${
            mode === 'signup' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
          }`}
        >
          처음 이용하기
        </button>
      </div>

      <div className="mb-5">
        <h2 className="text-2xl font-bold">{mode === 'login' ? '전화번호 로그인' : '전화번호 계정 만들기'}</h2>
        <p className="mt-2 text-sm text-slate-600">
          {mode === 'login'
            ? '가입한 전화번호와 비밀번호를 입력하면 바로 신청 페이지로 들어갑니다.'
            : '처음 접속하는 경우 전화번호와 사용할 비밀번호를 입력해주세요.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">보호자 전화번호</label>
          <input
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
            placeholder="010-0000-0000"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            {mode === 'login' ? '비밀번호' : '사용할 비밀번호'}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
            placeholder="비밀번호 입력"
            required
          />
        </div>

        {message && <p className="text-sm text-emerald-600">{message}</p>}
        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-300"
        >
          {loading ? '처리 중...' : mode === 'login' ? '로그인' : '계정 만들기'}
        </button>
      </form>
    </div>
  );
}