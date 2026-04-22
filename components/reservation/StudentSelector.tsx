'use client';

import { useMemo, useState } from 'react';
import { ReservationSlot } from '@/lib/types';

type StudentItem = {
  studentName: string;
  schoolName: string;
};

type ReservationGroup = {
  studentName: string;
  schoolName: string;
  slotIds: string[];
};

type Props = {
  students: StudentItem[];
  selectedStudentNames: string[];
  groupedReservations: ReservationGroup[];
  slotMap: Map<string, ReservationSlot>;
  loading?: boolean;
  onToggleStudent: (studentName: string) => void;
  onCancelStudentReservations: (studentName: string, slotIds: string[]) => void;
  onEditStudents?: () => void;
  formatSelectedSlot: (slot: ReservationSlot) => string;
};

export default function StudentSelector({
  students,
  selectedStudentNames,
  groupedReservations,
  slotMap,
  loading = false,
  onToggleStudent,
  onCancelStudentReservations,
  onEditStudents,
  formatSelectedSlot,
}: Props) {
  const [openStudentName, setOpenStudentName] = useState<string | null>(null);
  const reservationMap = useMemo(() => new Map(groupedReservations.map((group) => [group.studentName, group])), [groupedReservations]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">신청 학생</p>
          <p className="mt-1 text-xs text-slate-500">{selectedStudentNames.length}명 선택</p>
        </div>

        {onEditStudents && (
          <button
            type="button"
            onClick={onEditStudents}
            className="shrink-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
          >
            학생 수정
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {students.map((student) => {
          const checked = selectedStudentNames.includes(student.studentName);
          const completed = reservationMap.get(student.studentName);

          if (completed) {
            const isOpen = openStudentName === student.studentName;

            return (
              <div key={student.studentName} className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-slate-500">{student.schoolName}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-900">{student.studentName}</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-200 bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                    완료
                  </span>
                </div>

                <div className="mt-3 grid gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenStudentName((prev) => (prev === student.studentName ? null : student.studentName))}
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700"
                  >
                    {isOpen ? '일정 닫기' : '일정 보기'}
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => onCancelStudentReservations(completed.studentName, completed.slotIds)}
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-rose-200 bg-white px-3 text-xs font-medium text-rose-700 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    다시 선택
                  </button>
                </div>

                {isOpen && (
                  <ul className="mt-3 space-y-1.5 text-xs text-slate-700">
                    {completed.slotIds.map((slotId) => {
                      const slot = slotMap.get(slotId);
                      return (
                        <li key={slotId} className="flex gap-2 leading-5">
                          <span className="shrink-0">•</span>
                          <span>{slot ? formatSelectedSlot(slot) : slotId}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          }

          return (
            <label
              key={student.studentName}
              className={`flex cursor-pointer items-center justify-between rounded-2xl border px-3.5 py-3 transition ${
                checked ? 'border-blue-300 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="min-w-0 pr-3">
                <p className="truncate text-[11px] font-medium text-slate-500">{student.schoolName}</p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-900">{student.studentName}</p>
              </div>

              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggleStudent(student.studentName)}
                className="h-4 w-4 shrink-0"
              />
            </label>
          );
        })}
      </div>
    </section>
  );
}
