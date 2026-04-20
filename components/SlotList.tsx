'use client';

import { useEffect, useMemo, useState } from 'react';
import { ReservationSlot } from '@/lib/types';
import ReservationForm, { GuardianProfile } from './ReservationForm';
import SlotCard from './SlotCard';
import { formatKoreanDate } from '@/lib/utils';

const REQUIRED_COUNT = 5;
const CONSENT_ITEMS = [
  '5번의 일정을 선택하셔야 수업 신청이 가능합니다.',
  '결석 보강은 불가능하며, 이론 수업은 없는 일정입니다.',
  '이론 수업을 원하시면 다른 3급 수업 일정 진행 시 별도로 방문하셔야 합니다.',
  '이 일정 외에도 2급 수업 일정이 추가 개설될 수 있음을 확인했습니다.',
  '위 안내에 동의한 경우에만 일정 선택이 가능합니다.',
] as const;

type Step = 'consent' | 'profile' | 'slots';

function formatSelectedSlot(slot: ReservationSlot) {
  return `${formatKoreanDate(slot.date, slot.day_of_week)} ${slot.time_label}`;
}

function isOpenForSelection(slot: ReservationSlot) {
  if (!slot.open_at) return true;
  return new Date(slot.open_at).getTime() <= Date.now();
}

export default function SlotList({ initialSlots }: { initialSlots: ReservationSlot[] }) {
  const [slots, setSlots] = useState(initialSlots);
  const [step, setStep] = useState<Step>('consent');
  const [consents, setConsents] = useState<boolean[]>(CONSENT_ITEMS.map(() => false));
  const [profile, setProfile] = useState<GuardianProfile | null>(null);
  const [selectedStudentNames, setSelectedStudentNames] = useState<string[]>([]);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function refresh() {
      const res = await fetch('/api/admin/slots?scope=public', { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      setSlots(json.slots ?? []);
    }

    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem('reservation_guardian_profile');
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as GuardianProfile;
      if (parsed.phoneNumber && Array.isArray(parsed.students) && parsed.students.length) {
        setProfile(parsed);
        setSelectedStudentNames(parsed.students.map((student) => student.studentName));
      }
    } catch {
      localStorage.removeItem('reservation_guardian_profile');
    }
  }, []);

  const consentComplete = consents.every(Boolean);
  const selectedSlots = useMemo(
    () => slots.filter((slot) => selectedSlotIds.includes(slot.id)).sort((a, b) => selectedSlotIds.indexOf(a.id) - selectedSlotIds.indexOf(b.id)),
    [slots, selectedSlotIds]
  );
  const selectedStudents = useMemo(
    () => profile?.students.filter((student) => selectedStudentNames.includes(student.studentName)) ?? [],
    [profile, selectedStudentNames]
  );

  function toggleConsent(index: number) {
    setConsents((prev) => prev.map((value, i) => (i === index ? !value : value)));
  }

  function handleProfileSaved(nextProfile: GuardianProfile) {
    setProfile(nextProfile);
    setSelectedStudentNames(nextProfile.students.map((student) => student.studentName));
    setStep('slots');
    setMessage(null);
    setError(null);
  }

  function toggleStudent(studentName: string) {
    setSelectedStudentNames((prev) =>
      prev.includes(studentName) ? prev.filter((item) => item !== studentName) : [...prev, studentName]
    );
  }

  function toggleSlot(slotId: string) {
    const slot = slots.find((item) => item.id === slotId);
    if (!slot) return;

    setMessage(null);
    setError(null);

    if (!isOpenForSelection(slot)) {
      setError(`이 일정은 아직 신청할 수 없습니다. 신청 시작: ${new Date(slot.open_at as string).toLocaleString('ko-KR')}`);
      return;
    }

    setSelectedSlotIds((prev) => {
      if (prev.includes(slotId)) {
        return prev.filter((id) => id !== slotId);
      }
      if (prev.length >= REQUIRED_COUNT) {
        setError('5개의 일정만 선택할 수 있습니다. 다른 일정을 취소한 뒤 다시 선택해주세요.');
        return prev;
      }

      const hasSameDate = prev.some((selectedId) => {
        const selectedSlot = slots.find((item) => item.id === selectedId);
        return selectedSlot?.date === slot.date;
      });
      if (hasSameDate) {
        setError('같은 날에는 1타임만 선택 가능합니다. 다른 날짜를 선택해주세요.');
        return prev;
      }

      return [...prev, slotId];
    });
  }

  async function handleSubmit() {
    if (!profile) {
      setError('먼저 신청자 정보를 저장해주세요.');
      return;
    }
    if (!selectedStudents.length) {
      setError('신청할 학생을 1명 이상 선택해주세요.');
      return;
    }
    if (selectedSlotIds.length !== REQUIRED_COUNT) {
      setError('5개의 일정을 모두 선택해야 신청할 수 있습니다.');
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotIds: selectedSlotIds,
          phoneNumber: profile.phoneNumber,
          students: selectedStudents,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || '신청 처리 중 오류가 발생했습니다.');
      }
      setMessage(`${selectedStudents.map((student) => student.studentName).join(', ')} 학생의 ${REQUIRED_COUNT}개 일정 신청이 완료되었습니다.`);
      setSelectedSlotIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2 text-sm">
          {[
            { key: 'consent', label: '1. 동의사항' },
            { key: 'profile', label: '2. 정보 입력' },
            { key: 'slots', label: '3. 일정 선택' },
          ].map((item, index) => {
            const isActive = step === item.key;
            const isCompleted = (index === 0 && consentComplete) || (index === 1 && profile);
            return (
              <div key={item.key} className={`rounded-full px-4 py-2 ${isActive ? 'bg-blue-600 text-white' : isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {item.label}
              </div>
            );
          })}
        </div>
      </div>

      {step === 'consent' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold">수업 신청 안내</h2>
          <div className="mt-6 space-y-4">
            {CONSENT_ITEMS.map((item, index) => (
              <label key={item} className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
                <input type="checkbox" checked={consents[index]} onChange={() => toggleConsent(index)} className="mt-1 h-4 w-4" />
                <span className="text-sm text-slate-700">{item}</span>
              </label>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              disabled={!consentComplete}
              onClick={() => setStep('profile')}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:bg-slate-300"
            >
              다음: 신청자 정보 입력
            </button>
          </div>
        </section>
      )}

      {step === 'profile' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">신청자 정보 입력</h2>
              <p className="mt-2 text-sm text-slate-600">보호자 전화번호와 학생별 학교명/학생명을 저장하면 다음부터는 다시 입력하지 않아도 됩니다.</p>
            </div>
            <button type="button" onClick={() => setStep('consent')} className="rounded-xl border border-slate-300 px-4 py-2 text-sm">
              이전
            </button>
          </div>
          <ReservationForm initialProfile={profile} onSaved={handleProfileSaved} />
        </section>
      )}

      {step === 'slots' && profile && (
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">일정 선택</h2>
                <p className="mt-2 text-sm text-slate-600">정확히 5개의 일정을 선택한 뒤 신청을 완료해주세요.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep('profile')} className="rounded-xl border border-slate-300 px-4 py-2 text-sm">
                  이전
                </button>
                <button type="button" onClick={() => setStep('profile')} className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm text-blue-700">
                  정보 수정
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
              <aside className="space-y-4 rounded-2xl bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-700">저장된 보호자 전화번호</p>
                  <p className="mt-1 text-sm text-slate-600">{profile.phoneNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">신청할 학생 선택</p>
                  <div className="mt-3 space-y-2">
                    {profile.students.map((student) => (
                      <label key={student.studentName} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
                        <input type="checkbox" checked={selectedStudentNames.includes(student.studentName)} onChange={() => toggleStudent(student.studentName)} className="mt-1 h-4 w-4" />
                        <span className="text-sm text-slate-700">{student.studentName} / {student.schoolName}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-blue-800">선택한 일정 {selectedSlotIds.length} / {REQUIRED_COUNT}</p>
                  <ul className="mt-3 space-y-2 text-sm text-blue-900">
                    {selectedSlots.length === 0 ? (
                      <li>아직 선택한 일정이 없습니다.</li>
                    ) : (
                      selectedSlots.map((slot) => <li key={slot.id}>• {formatSelectedSlot(slot)}</li>)
                    )}
                  </ul>
                </div>
                {selectedSlotIds.length === REQUIRED_COUNT && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
                    5개 일정 선택이 완료되었습니다. 아래 신청 버튼을 누르기 전에 선택한 일정과 학생 정보를 다시 확인해주세요.
                  </div>
                )}
                {message && <p className="text-sm text-emerald-600">{message}</p>}
                {error && <p className="text-sm text-rose-600">{error}</p>}
                <button
                  type="button"
                  disabled={loading || selectedSlotIds.length !== REQUIRED_COUNT || selectedStudents.length === 0}
                  onClick={handleSubmit}
                  className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-300"
                >
                  {loading ? '신청 중...' : '선택한 5개 일정 신청하기'}
                </button>
              </aside>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {slots.map((slot) => {
                  const selected = selectedSlotIds.includes(slot.id);
                  const openBlocked = !selected && !isOpenForSelection(slot);
                  const limitBlocked = !selected && selectedSlotIds.length >= REQUIRED_COUNT;
                  const disabledReason = openBlocked
                    ? `신청 시작: ${new Date(slot.open_at as string).toLocaleString('ko-KR')}`
                    : limitBlocked
                      ? '이미 5개의 일정을 선택했습니다.'
                      : null;
                  return (
                    <SlotCard
                      key={slot.id}
                      slot={slot}
                      selected={selected}
                      disabled={openBlocked || limitBlocked}
                      disabledReason={disabledReason}
                      onToggle={toggleSlot}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
