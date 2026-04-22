'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { ReservationSlot } from '@/lib/types';

type Props = {
  groupedSlots: [string, ReservationSlot[]][];
  activeDate: string | null;
  selectedDates: Set<string>;
  blockedDates: Set<string>;
  selectedStudentCount: number;
  onSelectDate: (date: string) => void;
};

type DayInfo = {
  date: string;
  label: number;
  inMonth: boolean;
  isPast: boolean;
  hasSlots: boolean;
  available: boolean;
  selected: boolean;
  blocked: boolean;
};

type MonthSummary = {
  key: string;
  label: string;
  availableCount: number;
  blockedCount: number;
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function parseDate(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatMonthTitle(month: Date) {
  return `${month.getFullYear()}년 ${String(month.getMonth() + 1).padStart(2, '0')}월`;
}

function isSlotAvailable(slot: ReservationSlot, requiredSeats: number) {
  if (slot.is_closed || slot.capacity - slot.reserved_count < requiredSeats) return false;
  if (!slot.open_at) return true;
  return new Date(slot.open_at).getTime() <= Date.now();
}

export default function ReservationCalendar({
  groupedSlots,
  activeDate,
  selectedDates,
  blockedDates,
  selectedStudentCount,
  onSelectDate,
}: Props) {
  const slotByDate = useMemo(() => new Map(groupedSlots), [groupedSlots]);
  const requiredSeats = Math.max(selectedStudentCount, 1);

  const monthSummaries = useMemo<MonthSummary[]>(() => {
    const map = new Map<string, MonthSummary>();

    groupedSlots.forEach(([date, slots]) => {
      const parsed = parseDate(date);
      const key = toMonthKey(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
      const label = `${parsed.getMonth() + 1}월`;
      const available = slots.some((slot) => isSlotAvailable(slot, requiredSeats)) && !blockedDates.has(date);
      const current = map.get(key) ?? { key, label, availableCount: 0, blockedCount: 0 };
      if (available) current.availableCount += 1;
      else current.blockedCount += 1;
      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [groupedSlots, blockedDates, requiredSeats]);

  const monthKeys = monthSummaries.map((item) => item.key);

  const initialMonth = useMemo(() => {
    if (activeDate) {
      const d = parseDate(activeDate);
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    if (groupedSlots.length) {
      const d = parseDate(groupedSlots[0][0]);
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, [activeDate, groupedSlots]);

  const [visibleMonth, setVisibleMonth] = useState(initialMonth);

  useEffect(() => {
    setVisibleMonth(initialMonth);
  }, [initialMonth]);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const visibleMonthKey = toMonthKey(visibleMonth);
  const monthIndex = monthKeys.indexOf(visibleMonthKey);
  const canGoPrev = monthIndex > 0;
  const canGoNext = monthIndex >= 0 && monthIndex < monthKeys.length - 1;

  const days = useMemo<DayInfo[]>(() => {
    const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - firstDay.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      const slots = slotByDate.get(key) ?? [];
      const blocked = blockedDates.has(key);
      const available = slots.some((slot) => isSlotAvailable(slot, requiredSeats)) && !blocked;

      return {
        date: key,
        label: date.getDate(),
        inMonth: date.getMonth() === visibleMonth.getMonth(),
        isPast: key < todayKey,
        hasSlots: slots.length > 0,
        available,
        selected: activeDate === key,
        blocked,
      };
    });
  }, [visibleMonth, slotByDate, blockedDates, todayKey, activeDate, requiredSeats]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={!canGoPrev}
          onClick={() => canGoPrev && setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg text-slate-700 disabled:opacity-30"
        >
          ‹
        </button>

        <div className="text-center">
          <p className="text-base font-semibold text-slate-900 md:text-lg">{formatMonthTitle(visibleMonth)}</p>
          <p className="mt-1 text-[11px] text-slate-500">파란 날짜만 신청할 수 있어요 · 현재 {requiredSeats}명 기준</p>
        </div>

        <button
          type="button"
          disabled={!canGoNext}
          onClick={() => canGoNext && setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg text-slate-700 disabled:opacity-30"
        >
          ›
        </button>
      </div>

      {monthSummaries.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {monthSummaries.map((month) => {
            const isCurrent = month.key === visibleMonthKey;
            return (
              <button
                key={month.key}
                type="button"
                onClick={() => {
                  const [year, monthNumber] = month.key.split('-').map(Number);
                  setVisibleMonth(new Date(year, monthNumber - 1, 1));
                }}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs',
                  isCurrent ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-600'
                )}
              >
                {month.label} · {month.availableCount}개 일정 가능
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 grid grid-cols-7 gap-y-2 text-center text-xs font-medium text-slate-500 md:text-sm">
        {WEEKDAYS.map((weekday, index) => (
          <div key={weekday} className={index === 0 ? 'text-rose-500' : index === 6 ? 'text-blue-600' : ''}>
            {weekday}
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1.5 md:gap-2">
        {days.map((day) => {
          const clickable = day.hasSlots;
          return (
            <button
              key={day.date}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onSelectDate(day.date)}
              className={cn(
                'h-11 rounded-xl border text-sm transition md:h-12',
                !day.inMonth && 'opacity-30',
                !day.hasSlots && 'border-transparent bg-transparent text-slate-300',
                day.hasSlots && day.isPast && 'border-slate-200 bg-slate-50 text-slate-400',
                day.hasSlots && !day.isPast && !day.available && 'border-slate-200 bg-slate-100 text-slate-400',
                day.available && 'border-blue-200 bg-blue-50 text-blue-700',
                day.blocked && 'border-amber-200 bg-amber-50 text-amber-700',
                day.selected && '!border-blue-600 !bg-blue-600 !text-white shadow-sm',
                clickable ? 'hover:scale-[1.02]' : 'cursor-default'
              )}
            >
              <div className="flex h-full items-center justify-center">
                <span className="font-semibold">{day.label}</span>
                {selectedDates.has(day.date) && !day.selected && <span className="ml-1 text-[10px]">●</span>}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
