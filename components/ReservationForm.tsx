'use client';

import { FormEvent, useEffect, useState } from 'react';

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
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-700">로그인된 보호자 전화번호</p>
        <p className="mt-1 text-sm text-slate-600">{initialProfile?.phoneNumber || '-'}</p>
      </div>

      <div className="space-y-3">
        {students.map((student, index) => (
          <div key={index} className="rounded-3xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">학생 {index + 1}</p>
              {students.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStudent(index)}
                  className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600"
                >
                  삭제
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-800">학교명</label>
                <input
                  value={student.schoolName}
                  onChange={(e) => updateStudent(index, 'schoolName', e.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="예: OO초등학교"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-800">학생명</label>
                <input
                  value={student.studentName}
                  onChange={(e) => updateStudent(index, 'studentName', e.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
      >
        학생 추가
      </button>

      {message && <p className="text-sm text-emerald-600">{message}</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white disabled:bg-slate-300"
      >
        {loading ? '저장 중...' : '학생 정보 저장'}
      </button>
    </form>
  );
}