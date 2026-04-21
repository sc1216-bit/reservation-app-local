'use client';

type Step = 'auth' | 'consent' | 'profile' | 'slots';

type Props = {
  step: Step;
  showLogout?: boolean;
  loading?: boolean;
  onLogout?: () => void;
  onGoProfile?: () => void;
};

const STEP_ITEMS: { key: Step; shortLabel: string; fullLabel: string }[] = [
  { key: 'auth', shortLabel: '로그인', fullLabel: '로그인' },
  { key: 'consent', shortLabel: '동의', fullLabel: '동의 확인' },
  { key: 'profile', shortLabel: '학생', fullLabel: '학생 정보' },
  { key: 'slots', shortLabel: '일정', fullLabel: '일정 선택' },
];

export default function ReservationStepper({
  step,
  showLogout = false,
  loading = false,
  onLogout,
  onGoProfile,
}: Props) {
  const currentIndex = STEP_ITEMS.findIndex((item) => item.key === step);
  const currentStep = STEP_ITEMS[currentIndex];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            {currentIndex + 1} / {STEP_ITEMS.length} 단계 · {currentStep.fullLabel}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            단계별로 순서대로 진행하면 신청을 완료할 수 있어요.
          </p>
        </div>

        {showLogout && onLogout && (
          <button
            type="button"
            onClick={onLogout}
            disabled={loading}
            className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            로그아웃
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {STEP_ITEMS.map((item, index) => {
          const active = step === item.key;
          const passed = currentIndex > index;
          const isProfileShortcut = item.key === 'profile' && !!onGoProfile;
          const canClickProfile = isProfileShortcut && (step === 'slots' || step === 'profile');

          const baseClass = `whitespace-nowrap rounded-2xl px-2 py-2 text-center text-[11px] font-semibold sm:px-3 sm:text-xs ${
            active
              ? 'bg-blue-600 text-white'
              : passed
                ? 'bg-blue-50 text-blue-700'
                : 'bg-slate-100 text-slate-500'
          }`;

          if (canClickProfile) {
            return (
              <button
                key={item.key}
                type="button"
                onClick={onGoProfile}
                className={`${baseClass} transition hover:brightness-95`}
              >
                {index + 1} {item.shortLabel}
              </button>
            );
          }

          return (
            <div key={item.key} className={baseClass}>
              {index + 1} {item.shortLabel}
            </div>
          );
        })}
      </div>
    </section>
  );
}