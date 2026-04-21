'use client';

export default function BootingCard() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

        <p className="mt-4 text-base font-semibold text-slate-900">
          로그인 정보를 확인하고 있어요
        </p>

        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
          잠시만 기다려 주세요. 확인이 끝나면 바로 신청 단계로 안내해 드릴게요.
        </p>
      </div>
    </section>
  );
}