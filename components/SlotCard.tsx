'use client';

import { ReservationSlot } from '@/lib/types';
import { cn, formatKoreanDate, getSlotLabel, getSlotTimeText } from '@/lib/utils';
import { getSlotTone } from '@/lib/slotTone';

type Props = {
  slot: ReservationSlot;
  selected: boolean;
  disabled?: boolean;
  disabledReason?: string | null;
  onToggle?: (slotId: string) => void;
};

function formatOpenAt(openAt: string | null) {
  if (!openAt) return null;
  const date = new Date(openAt);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const period = hours < 12 ? '오전' : '오후';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${yyyy}-${mm}-${dd} ${period} ${displayHour}:${minutes}`;
}

export default function SlotCard({ slot, selected, disabled = false, disabledReason, onToggle }: Props) {
  const isClosed = slot.is_closed || slot.reserved_count >= slot.capacity;
  const openLabel = formatOpenAt(slot.open_at);
  const tone = getSlotTone(slot);
  const isDisabled = disabled || isClosed;
  const label = getSlotLabel(slot);
  const timeText = getSlotTimeText(slot);

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={() => onToggle?.(slot.id)}
      className={cn(
        'group w-full rounded-2xl border p-5 text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-200',
        tone.card,
        selected ? 'border-blue-500 ring-2 ring-blue-100' : 'hover:-translate-y-0.5 hover:shadow-md',
        isDisabled ? 'cursor-not-allowed opacity-70 hover:translate-y-0 hover:shadow-sm' : 'cursor-pointer'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-600">{formatKoreanDate(slot.date, slot.day_of_week)}</p>
          <div className="mt-1 flex flex-col leading-tight">
            <h3 className="text-base font-semibold text-slate-900 break-keep">{label}</h3>
            <p className="mt-1 text-xs font-medium text-slate-700 whitespace-nowrap">{timeText}</p>
          </div>
          <p className="mt-2 text-sm text-slate-600">정원 {slot.reserved_count}/{slot.capacity}명</p>
          {openLabel && <p className="mt-2 text-xs text-amber-700">신청 시작: {openLabel}</p>}
          {disabledReason && !disabledReason.startsWith('신청 시작:') && (
            <p className="mt-2 text-xs text-rose-600">{disabledReason}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <span
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium',
              isClosed ? 'bg-rose-100 text-rose-700' : selected ? 'bg-blue-100 text-blue-700' : tone.badge
            )}
          >
            {isClosed ? '마감' : selected ? '선택됨' : '선택 가능'}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <div
          className={cn(
            'inline-flex rounded-xl px-4 py-2 text-sm font-semibold',
            isDisabled ? 'bg-slate-200 text-slate-500' : selected ? 'bg-blue-600 text-white' : tone.chip
          )}
        >
          {isClosed ? '신청 불가' : selected ? '선택 취소' : '일정 선택'}
        </div>
      </div>
    </button>
  );
}
