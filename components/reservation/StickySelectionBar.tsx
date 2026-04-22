'use client';

import { formatKoreanDate } from '@/lib/utils';
import { ReservationSlot } from '@/lib/types';

type DateShortcut = {
  date: string;
  day_of_week: string;
  totalCount: number;
  availableCount: number;
  selected: boolean;
};

type Props = {
  selectedCount: number;
  requiredCount: number;
  selectedStudentCount: number;
  groupedSlots: [string, ReservationSlot[]][];
  selectedDates: Set<string>;
};

export default function StickySelectionBar({
  selectedCount,
  requiredCount,
  selectedStudentCount,
  groupedSlots,
  selectedDates,
}: Props) {
  const isComplete = selectedCount === requiredCount;
  const progress = requiredCount ? Math.min(100, (selectedCount / requiredCount) * 100) : 0;
  const remainingCount = Math.max(0, requiredCount - selectedCount);

  const shortcuts: DateShortcut[] = groupedSlots.map(([date, slots]) => ({
    date,
    day_of_week: slots[0]?.day_of_week ?? '',
    totalCount: slots.length,
    availableCount: slots.filter((slot) => !slot.is_closed && slot.reserved_count < slot.capacity).length,
    selected: selectedDates.has(date),
  }));

  return (
    <div className="sticky top-2 z-40 rounded-[24px] border border-slate-200/90 bg-white/95 p-3 shadow-[0_12px_32px_rgba(15,23,42,0.10)] backdrop-blur lg:top-4 lg:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900 md:text-base">
            학생 {selectedStudentCount}명 · 일정 {selectedCount}/{requiredCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {isComplete ? '선택이 끝났어요. 아래에서 신청을 완료해 주세요.' : `${remainingCount}개 더 선택하면 신청할 수 있어요.`}
          </p>
        </div>

        <div className="min-w-[180px] sm:w-[220px]">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-900 md:text-sm">날짜 바로가기</p>
        <p className="text-[11px] text-slate-500 sm:hidden">좌우로 넘겨 확인</p>
      </div>

      <div className="mt-2 flex snap-x gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {shortcuts.map((item) => (
          <a
            key={`sticky-${item.date}`}
            href={`#slot-date-${item.date}`}
            className={`shrink-0 snap-start rounded-2xl border px-3 py-2 ${item.selected ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}
          >
            <p className={`text-xs font-semibold ${item.selected ? 'text-blue-700' : 'text-slate-700'}`}>
              {formatKoreanDate(item.date, item.day_of_week)}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">가능 {item.availableCount} · 전체 {item.totalCount}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
