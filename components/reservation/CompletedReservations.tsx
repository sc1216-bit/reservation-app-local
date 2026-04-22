'use client';

import { useMemo, useState } from 'react';
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
  const [openStudentNames, setOpenStudentNames] = useState<string[]>(() =>
    groupedReservations.map((group) => group.studentName)
  );

  const openSet = useMemo(() => new Set(openStudentNames), [openStudentNames]);

  if (!groupedReservations.length) return null;

  function toggleOpen(studentName: string) {
    setOpenStudentNames((prev) =>
      prev.includes(studentName)
        ? prev.filter((name) => name !== studentName)
        : [...prev, studentName]
    );
  }

  return (
    <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-900">신청 완료 학생 {groupedReservations.length}명</p>
          <p className="mt-1 text-xs text-emerald-700">완료된 학생은 일정 확인 또는 취소 후 다시 선택할 수 있어요.</p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="shrink-0 whitespace-nowrap text-xs text-emerald-700 underline"
        >
          새로고침
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {groupedReservations.map((group) => {
          const isOpen = openSet.has(group.studentName);

          return (
            <div key={group.studentName} className="rounded-2xl border border-emerald-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleOpen(group.studentName)}
                  className="min-w-0 flex-1 rounded-xl p-1 text-left"
                >
                  <p className="text-xs text-slate-500">{group.schoolName}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{group.studentName}</p>
                  <p className="mt-2 text-xs font-medium text-slate-500">{isOpen ? '일정 접기' : '일정 펼치기'}</p>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onCancel(group.studentName, group.slotIds)}
                  className="shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 disabled:bg-slate-200 disabled:text-slate-400"
                >
                  신청 취소
                </button>
              </div>

              {isOpen && (
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
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
