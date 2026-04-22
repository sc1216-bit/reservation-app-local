'use client';

import { useState } from 'react';
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

  const reservationMap = new Map(groupedReservations.map((group) => [group.studentName, group]));

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-slate-900">신청 학생 선택</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">여러 학생을 동시에 선택하면 동일한 일정으로 함께 신청됩니다.</p>
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

      <div className="mb-4 grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
        <div>
          <p className="text-xs text-slate-500">등록 학생</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{students.length}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">현재 선택</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{selectedStudentNames.length}</p>
        </div>
      </div>

      <div className="space-y-3">
        {students.map((student) => {
          const checked = selectedStudentNames.includes(student.studentName);
          const completed = reservationMap.get(student.studentName);

          if (completed) {
            const isOpen = openStudentName === student.studentName;

            return (
              <div key={student.studentName} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-slate-900">{student.studentName}</p>
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-700">신청 완료</span>
                    </div>

                    <p className="mt-1 truncate text-xs text-slate-500">{student.schoolName}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenStudentName((prev) => (prev === student.studentName ? null : student.studentName))}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                    >
                      {isOpen ? '일정 닫기' : '일정 보기'}
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => onCancelStudentReservations(completed.studentName, completed.slotIds)}
                      className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-700 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      신청 취소
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
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
              className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 transition ${
                checked ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="min-w-0 pr-3">
                <p className="truncate text-sm font-medium text-slate-900">{student.studentName}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{student.schoolName}</p>
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
