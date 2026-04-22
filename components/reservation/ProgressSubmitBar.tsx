'use client';

type Props = {
  loading?: boolean;
  selectedStudentCount: number;
  selectedSlotCount: number;
  requiredCount: number;
  onSubmit: () => void;
  variant?: 'desktop' | 'mobile-sticky' | 'mobile-inline' | 'inline';
  buttonLabel?: string;
  helperText?: string;
  disabled?: boolean;
};

export default function ProgressSubmitBar({
  loading = false,
  selectedStudentCount,
  selectedSlotCount,
  requiredCount,
  onSubmit,
  variant = 'inline',
  buttonLabel,
  helperText,
  disabled,
}: Props) {
  const isReady = !loading && selectedStudentCount > 0 && selectedSlotCount === requiredCount;
  const progress = requiredCount ? Math.min(100, (selectedSlotCount / requiredCount) * 100) : 0;
  const remaining = Math.max(0, requiredCount - selectedSlotCount);

  const resolvedLabel = buttonLabel ?? (
    loading
      ? '신청 중...'
      : selectedSlotCount === 0
        ? `0/${requiredCount}개 일정 선택 중`
        : selectedSlotCount < requiredCount
          ? `${selectedSlotCount}/${requiredCount}개 일정 선택 중`
          : '최종 신청하기'
  );

  const resolvedHelper = helperText ?? (
    selectedStudentCount > 0
      ? remaining > 0
        ? `${remaining}개 더 선택하면 신청할 수 있어요.`
        : '준비가 끝났어요. 최종 신청만 남았습니다.'
      : '먼저 학생을 선택해 주세요.'
  );

  const isDisabled = disabled ?? !isReady;

  const wrapperClass =
    variant === 'mobile-sticky'
      ? 'fixed inset-x-4 bottom-4 z-40 lg:hidden'
      : variant === 'desktop'
        ? 'hidden lg:block'
        : variant === 'mobile-inline'
          ? 'lg:hidden'
          : 'block';

  return (
    <div className={wrapperClass}>
      <div className="rounded-[24px] border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">신청 진행</p>
            <p className="mt-1 text-xs text-slate-500">{resolvedHelper}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
            {selectedSlotCount}/{requiredCount}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: requiredCount }, (_, index) => {
            const stepNumber = index + 1;
            const active = stepNumber <= selectedSlotCount;
            return (
              <div
                key={stepNumber}
                className={`rounded-xl border px-2 py-2 text-center text-xs font-semibold ${
                  active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}
              >
                {stepNumber}
              </div>
            );
          })}
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${progress}%` }} />
        </div>

        <button
          type="button"
          disabled={isDisabled}
          onClick={onSubmit}
          className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white disabled:bg-slate-300"
        >
          {resolvedLabel}
        </button>
      </div>
    </div>
  );
}
