'use client';

import ReservationForm, { GuardianProfile } from '../ReservationForm';

type Props = {
  profile: GuardianProfile | null;
  onSaved: (profile: GuardianProfile) => void | Promise<void>;
};

export default function ProfileStep({ profile, onSaved }: Props) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-xl font-bold sm:text-2xl">학생 정보 입력</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          신청할 학생 정보를 먼저 저장해 주세요. 저장된 정보는 다음 접속 때 다시 입력하지 않아도 됩니다.
        </p>
      </div>

      <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">입력 전에 확인해 주세요</p>
        <ul className="mt-2 space-y-1.5 text-sm leading-6 text-slate-600">
          <li>• 로그인된 보호자 전화번호 기준으로 학생 정보가 저장됩니다.</li>
          <li>• 학생이 여러 명이면 한 번에 함께 등록할 수 있습니다.</li>
          <li>• 저장 후 바로 일정 선택 단계로 이동합니다.</li>
        </ul>
      </div>

      <ReservationForm initialProfile={profile} onSaved={onSaved} />
    </section>
  );
}