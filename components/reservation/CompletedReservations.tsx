'use client';

import { ReservationSlot } from '@/lib/types';

type ReservationGroup = {
  studentName: string;
  schoolName: string;
  slotIds: string[];
};

type Props = {
  groupedReservations: ReservationGroup[];
  slotMap: Map<string, ReservationSlot>;
  loading: boolean;
  hasDifferentCompletedSchedules: boolean;
  commonCompletedSlotIds: Set<string>;
  formatSelectedSlot: (slot: ReservationSlot) => string;
  onRefresh: () => void;
  onCancel: (studentName: string, slotIds: string[]) => void;
};

export default function CompletedReservations({
  groupedReservations,
  slotMap,
  loading,
  hasDifferentCompletedSchedules,
  commonCompletedSlotIds,
  formatSelectedSlot,
  onRefresh,
  onCancel,
}: Props) {
  if (!groupedReservations.length) return null;

  return (
    <section className="rounded-3xl border border-amber-100 bg-amber-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-amber-900">
            신청 완료 학생 {groupedReservations.length}명
          </p>
          <p className="mt-1 text-xs text-amber-700">
            기존 신청이 있는 학생은 먼저 취소한 뒤 다시 선택할 수 있어요.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="shrink-0 whitespace-nowrap text-xs text-amber-700 underline"
        >
          새로고침
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {groupedReservations.map((group) => (
          <details
            key={group.studentName}
            open
            className="rounded-2xl border border-amber-200 bg-white p-4"
          >
            <div className="flex items-start gap-3">
              <summary className="flex-1 cursor-pointer list-none rounded-xl p-1">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {group.studentName}
                  </p>
                  <p className="text-xs text-slate-500">{group.schoolName}</p>
                  <p className="mt-2 text-xs font-semibold text-amber-800">
                    일정 보기
                  </p>
                </div>
              </summary>

              <button
                type="button"
                disabled={loading}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onCancel(group.studentName, group.slotIds);
                }}
                className="shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 disabled:bg-slate-200 disabled:text-slate-400"
              >
                신청 취소
              </button>
            </div>

            <ul className="mt-3 space-y-2 text-sm">
              {group.slotIds.map((slotId) => {
                const slot = slotMap.get(slotId);
                const isDifferentLine =
                  hasDifferentCompletedSchedules && !commonCompletedSlotIds.has(slotId);

                return (
                  <li
                    key={slotId}
                    className={`flex items-center gap-2 ${
                      isDifferentLine ? 'font-semibold text-rose-600' : 'text-slate-700'
                    }`}
                  >
                    <span>• {slot ? formatSelectedSlot(slot) : slotId}</span>
                    {isDifferentLine && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                        다른 일정
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </details>
        ))}
      </div>
    </section>
  );
}