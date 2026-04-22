'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

export type SavedStudent = {
  schoolName: string;
  studentName: string;
};

export type GuardianProfile = {
  phoneNumber: string;
  students: SavedStudent[];
};

type Props = {
  initialProfile?: GuardianProfile | null;
  onSaved?: (profile: GuardianProfile) => void;
};

const emptyStudent = (): SavedStudent => ({ schoolName: '', studentName: '' });

export default function ReservationForm({ initialProfile, onSaved }: Props) {
  const [students, setStudents] = useState<SavedStudent[]>(
    initialProfile?.students?.length ? initialProfile.students : [emptyStudent()]
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStudents(initialProfile?.students?.length ? initialProfile.students : [emptyStudent()]);
  }, [initialProfile]);

  const isDirty = useMemo(
    () => students.some((student) => student.schoolName.trim() || student.studentName.trim()),
    [students]
  );

  function updateStudent(index: number, field: keyof SavedStudent, value: string) {
    setStudents((prev) => prev.map((student, i) => (i === index ? { ...student, [field]: value } : student)));
  }

  function addStudent() {
    setStudents((prev) => [...prev, emptyStudent()]);
  }

  function removeStudent(index: number) {
    setStudents((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const normalized = students.map((student) => ({
        schoolName: student.schoolName.trim(),
        studentName: student.studentName.trim(),
      }));

      if (normalized.some((student) => !student.schoolName || !student.studentName)) {
        throw new Error('모든 학생의 학교명과 학생명을 입력해주세요.');
      }

      const names = new Set<string>();
      for (const student of normalized) {
        if (names.has(student.studentName)) {
          throw new Error('같은 학생명이 중복 등록되었습니다.');
        }
        names.add(student.studentName);
      }

      const res = await fetch('/api/me/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: normalized }),
      });

      const text = await res.text();

      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`학생 정보 저장 API가 JSON이 아닌 응답을 반환했습니다. 상태코드: ${res.status}`);
      }

      if (!res.ok) {
        throw new Error(json.error || '학생 정보 저장에 실패했습니다.');
      }

      const profile = {
        phoneNumber: initialProfile?.phoneNumber ?? '',
        students: normalized,
      } satisfies GuardianProfile;

      setMessage('학생 정보가 저장되었습니다.');
      onSaved?.(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">로그인된 보호자 전화번호</p>
          <p className="mt-1 text-base font-semibold text-slate-900">{initialProfile?.phoneNumber || '-'}</p>
          <p className="mt-2 text-xs text-slate-500">이 전화번호 기준으로 학생 정보가 저장됩니다.</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-800">등록 학생 수</p>
          <p className="mt-1 text-2xl font-bold text-blue-900">{students.length}명</p>
          <p className="mt-2 text-xs text-blue-700">학생이 여러 명이면 함께 등록할 수 있어요.</p>
        </div>
      </div>

      <div className="space-y-3">
        {students.map((student, index) => (
          <div key={index} className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500">학생 카드</p>
                <p className="mt-1 text-base font-semibold text-slate-900">학생 {index + 1}</p>
              </div>
              {students.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStudent(index)}
                  className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600"
                >
                  삭제
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-800">학교명</label>
                <input
                  value={student.schoolName}
                  onChange={(e) => updateStudent(index, 'schoolName', e.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="예: OO초등학교"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-800">학생명</label>
                <input
                  value={student.studentName}
                  onChange={(e) => updateStudent(index, 'studentName', e.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="학생 이름 입력"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addStudent}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700"
      >
        학생 추가
      </button>

      {message && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">{message}</p>}
      {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>}

      <button
        type="submit"
        disabled={loading || !isDirty}
        className="w-full rounded-2xl bg-blue-600 px-4 py-4 text-sm font-semibold text-white disabled:bg-slate-300"
      >
        {loading ? '저장 중...' : '학생 정보 저장'}
      </button>
    </form>
  );
}
