'use client';

import { cn } from '@/lib/utils';

type Tone = 'blue' | 'slate';

type SelectedSlotItem = {
  id: string;
  label: string;
};

type Props = {
  tone?: Tone;
  compact?: boolean;
  selectedCount: number;
  requiredCount: number;
  selectedStudentCount: number;
  selectedSlots?: SelectedSlotItem[];
  message?: string | null;
  error?: string | null;
};

export default function SelectionProgressPanel({
  tone = 'blue',
  compact = false,
  selectedCount,
  requiredCount,
  selectedStudentCount,
  selectedSlots = [],
  message,
  error,
}: Props) {
  const remainingCount = Math.max(0, requiredCount - selectedCount);
  const isComplete = selectedCount === requiredCount;
  const progress = requiredCount ? Math.min(100, (selectedCount / requiredCount) * 100) : 0;

  const tones = {
    blue: {
      card: 'border-blue-100 bg-white/95',
      track: 'bg-slate-100',
      fill: 'bg-blue-600',
      subtle: 'bg-blue-50 text-blue-900',
      subtleText: 'text-blue-700',
    },
    slate: {
      card: 'border-slate-200 bg-white/95',
      track: 'bg-slate-100',
      fill: 'bg-slate-900',
      subtle: 'bg-slate-100 text-slate-900',
      subtleText: 'text-slate-600',
    },
  }[tone];

  return (
    <div className={cn('rounded-3xl border p-4 shadow-sm backdrop-blur', tones.card, compact && 'p-3')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            학생 {selectedStudentCount}명 · 일정 {selectedCount}/{requiredCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {isComplete ? '선택이 끝났어요. 신청 버튼을 눌러 완료해 주세요.' : `${remainingCount}개 더 선택하면 신청할 수 있어요.`}
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
          {Math.round(progress)}%
        </span>
      </div>

      <div className={cn('overflow-hidden rounded-full', tones.track, compact ? 'mt-3 h-2' : 'mt-4 h-2')}>
        <div className={cn('h-full rounded-full transition-all', tones.fill)} style={{ width: `${progress}%` }} />
      </div>

      {message && (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <p className="text-sm leading-6 text-emerald-700">{message}</p>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5">
          <p className="text-sm leading-6 text-rose-700">{error}</p>
        </div>
      )}

      {!compact && (
        selectedSlots.length > 0 ? (
          <div className={cn('mt-3 rounded-2xl p-3', tones.subtle)}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold">선택한 일정</p>
              <p className="text-[11px] opacity-80">{selectedCount}/{requiredCount}</p>
            </div>

            <ul className="space-y-1.5 text-xs">
              {selectedSlots.map((slot, index) => (
                <li key={slot.id} className="flex gap-2 leading-5">
                  <span className="shrink-0 font-semibold">{index + 1}.</span>
                  <span>{slot.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className={cn('mt-3 rounded-2xl p-3', tones.subtle)}>
            <p className={cn('text-xs leading-5', tones.subtleText)}>선택한 일정이 아직 없습니다.</p>
          </div>
        )
      )}
    </div>
  );
}
