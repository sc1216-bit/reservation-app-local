'use client';

import { FormEvent, useState } from 'react';

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
  const [phoneNumber, setPhoneNumber] = useState(initialProfile?.phoneNumber ?? '');
  const [students, setStudents] = useState<SavedStudent[]>(initialProfile?.students?.length ? initialProfile.students : [emptyStudent()]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateStudent(index: number, field: keyof SavedStudent, value: string) {
    setStudents((prev) => prev.map((student, i) => (i === index ? { ...student, [field]: value } : student)));
  }

  function addStudent() {
    setStudents((prev) => [...prev, emptyStudent()]);
  }

  function removeStudent(index: number) {
    setStudents((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const normalized = students.map((student) => ({
      schoolName: student.schoolName.trim(),
      studentName: student.studentName.trim(),
    }));

    if (!phoneNumber.trim()) {
      setError('보호자 전화번호를 입력해주세요.');
      return;
    }

    if (normalized.some((student) => !student.schoolName || !student.studentName)) {
      setError('모든 학생의 학교명과 학생명을 입력해주세요.');
      return;
    }

    const names = new Set<string>();
    for (const student of normalized) {
      if (names.has(student.studentName)) {
        setError('같은 학생명이 중복 등록되었습니다.');
        return;
      }
      names.add(student.studentName);
    }

    const profile = {
      phoneNumber: phoneNumber.trim(),
      students: normalized,
    } satisfies GuardianProfile;

    localStorage.setItem('reservation_guardian_profile', JSON.stringify(profile));
    setMessage('신청자 정보가 저장되었습니다.');
    onSaved?.(profile);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">보호자 전화번호</label>
        <input
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
          className="w-full rounded-xl border border-slate-300 px-3 py-2"
          placeholder="010-0000-0000"
        />
      </div>
      <div className="space-y-3">
        {students.map((student, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">학생 {index + 1}</p>
              {students.length > 1 && (
                <button type="button" onClick={() => removeStudent(index)} className="text-sm text-rose-600">
                  삭제
                </button>
              )}
            </div>
            <div className="space-y-3">
              <input
                value={student.schoolName}
                onChange={(e) => updateStudent(index, 'schoolName', e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                placeholder="학교명"
              />
              <input
                value={student.studentName}
                onChange={(e) => updateStudent(index, 'studentName', e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                placeholder="학생명"
              />
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={addStudent} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
        학생 추가
      </button>
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button type="submit" className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">
        정보 저장
      </button>
    </form>
  );
}
