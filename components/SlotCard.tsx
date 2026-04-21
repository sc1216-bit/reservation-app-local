'use client';

import { ReservationSlot } from '@/lib/types';
import { cn, getSlotLabel } from '@/lib/utils';
import { getSlotTone } from '@/lib/slotTone';

type Props = {
  slot: ReservationSlot;
  selected: boolean;
  disabled?: boolean;
  disabledReason?: string | null;
  onToggle?: (slotId: string) => void;
};

function parseTimeParts(value: string) {
  const timePart = value.includes('T') ? value.split('T')[1] : value;
  const clean = timePart.trim().slice(0, 5);
  const [hourText, minuteText] = clean.split(':');

  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  return { hour, minute };
}

function formatStartTime(value: string) {
  const parsed = parseTimeParts(value);
  if (!parsed) return value;

  const { hour, minute } = parsed;
  const period = hour < 12 ? '오전' : '오후';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${period} ${displayHour}:${String(minute).padStart(2, '0')}`;
}

function formatEndTime(value: string) {
  const parsed = parseTimeParts(value);
  if (!parsed) return value;

  const { hour, minute } = parsed;
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${displayHour}:${String(minute).padStart(2, '0')}`;
}

function formatTimeWithSinglePeriod(start: string, end: string) {
  return `${formatStartTime(start)}~${formatEndTime(end)}`;
}

export default function SlotCard({ slot, selected, disabled = false, disabledReason, onToggle }: Props) {
  const isClosed = slot.is_closed || slot.reserved_count >= slot.capacity;
  const tone = getSlotTone(slot);
  const isDisabled = disabled || isClosed;
  const isUnavailable = isDisabled && !selected && !isClosed;
  const label = getSlotLabel(slot);
  const timeText = formatTimeWithSinglePeriod(slot.start_time, slot.end_time);

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={() => onToggle?.(slot.id)}
      title={disabledReason ?? undefined}
      style={{ WebkitTapHighlightColor: 'transparent' }}
      className={cn(
        'group w-full select-none rounded-lg border px-2.5 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-200',
        tone.card,
        selected
          ? '!border-blue-600 !bg-blue-50 ring-2 ring-blue-400 ring-offset-1 shadow-sm'
          : 'hover:border-slate-300 active:scale-[0.99]',
        isDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-5 text-slate-900 sm:text-[14px]">
          {label}
        </h3>
        <span
          className={cn(
            'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-4',
            isClosed
              ? 'bg-rose-100 text-rose-700'
              : selected
                ? 'bg-blue-100 text-blue-700'
                : isUnavailable
                  ? 'bg-slate-200 text-slate-600'
                  : tone.badge
          )}
        >
          {isClosed ? '마감' : selected ? '선택됨' : isUnavailable ? '불가' : '선택'}
        </span>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[11px] font-medium leading-4 text-slate-700 sm:text-[12px]">
          {timeText}
        </p>
        <p className="shrink-0 text-[10px] leading-4 text-slate-500 sm:text-[11px]">
          정원 {slot.reserved_count}/{slot.capacity}
        </p>
      </div>

      {!selected && disabledReason && (
        <p className="mt-1 truncate text-[10px] leading-4 text-rose-600 sm:text-[11px]">
          {disabledReason}
        </p>
      )}
    </button>
  );
}