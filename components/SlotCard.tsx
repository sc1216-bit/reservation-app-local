'use client';

import { ReservationSlot } from '@/lib/types';
import { cn, formatKoreanDate } from '@/lib/utils';

type Props = {
  slot: ReservationSlot;
  selected: boolean;
  disabled?: boolean;
  disabledReason?: string | null;
  onToggle?: (slotId: string) => void;
};

function formatOpenAt(openAt: string | null) {
  if (!openAt) return null;
  return new Date(openAt).toLocaleString('ko-KR');
}

export default function SlotCard({ slot, selected, disabled = false, disabledReason, onToggle }: Props) {
  const isClosed = slot.is_closed || slot.reserved_count >= slot.capacity;
  const openLabel = formatOpenAt(slot.open_at);

  return (
    <div className={cn('rounded-2xl border bg-white p-5 shadow-sm transition', selected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">{formatKoreanDate(slot.date, slot.day_of_week)} {slot.time_label}</p>
          <p className="mt-1 text-sm text-slate-600">({slot.reserved_count}/{slot.capacity}명)</p>
          {openLabel && <p className="mt-2 text-xs text-amber-700">신청 시작: {openLabel}</p>}
        </div>
        <span
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium',
            isClosed ? 'bg-rose-100 text-rose-700' : selected ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
          )}
        >
          {isClosed ? '마감' : selected ? '선택됨' : '선택 가능'}
        </span>
      </div>
      <div className="mt-4 space-y-2">
        <button
          type="button"
          disabled={disabled || isClosed}
          onClick={() => onToggle?.(slot.id)}
          className={cn(
            'w-full rounded-xl px-4 py-3 text-sm font-semibold',
            disabled || isClosed ? 'cursor-not-allowed bg-slate-200 text-slate-500' : selected ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white'
          )}
        >
          {isClosed ? '신청 불가' : selected ? '선택 취소' : '일정 선택'}
        </button>
        {disabledReason && <p className="text-xs text-rose-600">{disabledReason}</p>}
      </div>
    </div>
  );
}
