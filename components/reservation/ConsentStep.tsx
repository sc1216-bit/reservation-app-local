'use client';

type Props = {
  items: readonly string[];
  consents: boolean[];
  loading?: boolean;
  error?: string | null;
  onToggleConsent: (index: number) => void;
  onNext: () => void;
};

export default function ConsentStep({
  items,
  consents,
  loading = false,
  error,
  onToggleConsent,
  onNext,
}: Props) {
  const allChecked = items.length > 0 && consents.every(Boolean);

  function handleToggleAll() {
    const nextValue = !allChecked;
    items.forEach((_, index) => {
      if (consents[index] !== nextValue) {
        onToggleConsent(index);
      }
    });
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="text-xl font-bold sm:text-2xl">수업 신청 안내</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          아래 안내를 확인하고 모두 동의해야 다음 단계로 진행할 수 있어요.
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">전체 동의</p>
            <p className="mt-1 text-xs text-slate-500">
              필수 안내 항목을 한 번에 확인하고 동의합니다.
            </p>
          </div>

          <input
            type="checkbox"
            checked={allChecked}
            onChange={handleToggleAll}
            className="h-4 w-4 shrink-0"
          />
        </label>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <label
            key={item}
            className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
              consents[index]
                ? 'border-blue-200 bg-blue-50'
                : 'border-slate-200 bg-white'
            }`}
          >
            <input
              type="checkbox"
              checked={consents[index]}
              onChange={() => onToggleConsent(index)}
              className="mt-1 h-4 w-4 shrink-0"
            />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                  필수
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">{item}</p>
            </div>
          </label>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5">
          <p className="text-sm leading-6 text-rose-700">{error}</p>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {allChecked ? '모든 항목에 동의했어요.' : '모든 필수 항목에 동의해야 진행할 수 있어요.'}
        </p>

        <button
          type="button"
          disabled={!allChecked || loading}
          onClick={onNext}
          className="shrink-0 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:bg-slate-300"
        >
          {loading ? '처리 중...' : '다음'}
        </button>
      </div>
    </section>
  );
}