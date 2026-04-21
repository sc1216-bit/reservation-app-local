'use client';

import { useEffect, useMemo, useState } from 'react';
import { Reservation, ReservationSlot } from '@/lib/types';
import AuthForm from './AuthForm';
import ReservationForm, { GuardianProfile } from './ReservationForm';
import SlotCard from './SlotCard';
import { compareSlots, formatKoreanDate, getSlotDisplayText } from '@/lib/utils';

const REQUIRED_COUNT = 5;
const CONSENT_ITEMS = [
  '5번의 일정을 선택하셔야 수업 신청이 가능합니다.',
  '결석 보강은 불가능하며, 이론 수업은 없는 일정입니다.',
  '이론 수업을 원하시면 다른 3급 수업 일정 진행 시 별도로 방문하셔야 합니다.',
  '이 일정 외에도 2급 수업 일정이 추가 개설될 수 있음을 확인했습니다.',
  '위 안내에 동의한 경우에만 일정 선택이 가능합니다.',
] as const;

type Step = 'auth' | 'consent' | 'profile' | 'slots';

type ReservationGroup = {
  studentName: string;
  schoolName: string;
  slotIds: string[];
  reservations: Reservation[];
};

function formatSelectedSlot(slot: ReservationSlot) {
  return `${formatKoreanDate(slot.date, slot.day_of_week)} ${getSlotDisplayText(slot)}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[date.getDay()];
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const period = hours < 12 ? '오전' : '오후';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;

  return `${month}/${day}(${dayName}) ${period} ${displayHour}:${minutes}`;
}

function isOpenForSelection(slot: ReservationSlot) {
  if (!slot.open_at) return true;
  return new Date(slot.open_at).getTime() <= Date.now();
}

function sortSlots(a: ReservationSlot, b: ReservationSlot) {
  return compareSlots(a, b);
}

function getScheduleSignature(slotIds: string[]) {
  if (!slotIds.length) return '__NONE__';
  return [...slotIds].sort().join('|');
}

export default function SlotList({ initialSlots }: { initialSlots: ReservationSlot[] }) {
  const [slots, setSlots] = useState(initialSlots);
  const [step, setStep] = useState<Step>('auth');
  const [consents, setConsents] = useState<boolean[]>(CONSENT_ITEMS.map(() => false));
  const [profile, setProfile] = useState<GuardianProfile | null>(null);
  const [selectedStudentNames, setSelectedStudentNames] = useState<string[]>([]);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshSlots() {
    try {
      const res = await fetch('/api/admin/slots?scope=public', {
        cache: 'no-store',
      });

      const text = await res.text();

      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`일정 목록 API가 JSON이 아닌 응답을 반환했습니다. 상태코드: ${res.status}`);
      }

      if (!res.ok) {
        throw new Error(json.error || '일정 목록을 불러오지 못했습니다.');
      }

      const nextSlots = Array.isArray(json.slots) ? json.slots : [];
      setSlots(nextSlots);
    } catch (err) {
      setError(err instanceof Error ? err.message : '일정 목록을 불러오지 못했습니다.');
    }
  }

  async function refreshMyReservations() {
    const res = await fetch('/api/my-reservations', { cache: 'no-store' });
    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || '신청 내역 조회 실패');
    }

    const nextReservations = json.reservations ?? [];
    setMyReservations(nextReservations);
    return nextReservations as Reservation[];
  }

  async function loadMe() {
    const res = await fetch('/api/me', { cache: 'no-store' });
    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || '내 정보 조회 실패');
    }

    if (!json.authenticated) {
      setProfile(null);
      setMyReservations([]);
      setSelectedStudentNames([]);
      setSelectedSlotIds([]);
      setStep('auth');
      return;
    }

    const nextProfile: GuardianProfile = {
      phoneNumber: json.phoneNumber,
      students: json.students ?? [],
    };

    setProfile(nextProfile);
    setSelectedStudentNames(nextProfile.students.map((student: { studentName: string }) => student.studentName));

    await Promise.all([refreshMyReservations(), refreshSlots()]);

    if (!json.agreed) {
      setStep('consent');
    } else if (!nextProfile.students.length) {
      setStep('profile');
    } else {
      setStep('slots');
    }
  }

  useEffect(() => {
    const timer = setInterval(refreshSlots, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([loadMe(), refreshSlots()]);
      } catch (err) {
        setError(err instanceof Error ? err.message : '초기 정보를 불러오지 못했습니다.');
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  const consentComplete = consents.every(Boolean);

  const selectedSlotIdSet = useMemo(() => new Set(selectedSlotIds), [selectedSlotIds]);

  const selectedStudents = useMemo(
    () => profile?.students.filter((student) => selectedStudentNames.includes(student.studentName)) ?? [],
    [profile, selectedStudentNames]
  );

  const slotMap = useMemo(() => {
    return new Map(slots.map((slot) => [slot.id, slot]));
  }, [slots]);

  const selectedDateSet = useMemo(() => {
    const dateSet = new Set<string>();

    selectedSlotIds.forEach((slotId) => {
      const selectedSlot = slotMap.get(slotId);
      if (selectedSlot) {
        dateSet.add(selectedSlot.date);
      }
    });

    return dateSet;
  }, [selectedSlotIds, slotMap]);

  const selectedSlots = useMemo(
    () => slots.filter((slot) => selectedSlotIdSet.has(slot.id)).sort(sortSlots),
    [slots, selectedSlotIdSet]
  );

  const groupedReservations = useMemo<ReservationGroup[]>(() => {
    if (!profile) return [];

    return profile.students
      .map((student) => {
        const reservations = myReservations
          .filter((reservation) => reservation.student_name === student.studentName)
          .sort((a, b) => {
            const slotA = slotMap.get(a.slot_id);
            const slotB = slotMap.get(b.slot_id);
            if (!slotA || !slotB) return 0;
            return sortSlots(slotA, slotB);
          });

        return {
          studentName: student.studentName,
          schoolName: student.schoolName,
          slotIds: reservations.map((reservation) => reservation.slot_id),
          reservations,
        };
      })
      .filter((group) => group.reservations.length > 0)
      .sort((a, b) => a.studentName.localeCompare(b.studentName, 'ko'));
  }, [myReservations, profile, slotMap]);

  const groupedReservationMap = useMemo(() => {
    return new Map(groupedReservations.map((group) => [group.studentName, group]));
  }, [groupedReservations]);

  const existingStudentNameSet = useMemo(() => {
    return new Set(groupedReservations.map((group) => group.studentName));
  }, [groupedReservations]);

  const hasDifferentCompletedSchedules = useMemo(() => {
    if (groupedReservations.length < 2) return false;
    const signatures = groupedReservations.map((group) => getScheduleSignature(group.slotIds));
    return new Set(signatures).size > 1;
  }, [groupedReservations]);

  const commonCompletedSlotIds = useMemo(() => {
    if (groupedReservations.length < 2) return new Set<string>();

    let common = new Set(groupedReservations[0].slotIds);

    for (const group of groupedReservations.slice(1)) {
      const current = new Set(group.slotIds);
      common = new Set([...common].filter((slotId) => current.has(slotId)));
    }

    return common;
  }, [groupedReservations]);

  const groupedSlots = useMemo(() => {
    const map = new Map<string, ReservationSlot[]>();
    [...slots].sort(sortSlots).forEach((slot) => {
      if (!map.has(slot.date)) map.set(slot.date, []);
      map.get(slot.date)!.push(slot);
    });
    return Array.from(map.entries());
  }, [slots]);

  const selectedExistingGroups = useMemo(() => {
    if (!profile) return [];

    return profile.students
      .filter((student) => selectedStudentNames.includes(student.studentName))
      .map((student) => {
        const existing = groupedReservationMap.get(student.studentName);

        return {
          studentName: student.studentName,
          schoolName: student.schoolName,
          slotIds: existing?.slotIds ?? [],
          reservations: existing?.reservations ?? [],
        };
      });
  }, [groupedReservationMap, profile, selectedStudentNames]);

  const blockedExistingDates = useMemo(() => {
    const dateSet = new Set<string>();

    selectedExistingGroups.forEach((group) => {
      group.slotIds.forEach((slotId) => {
        const existingSlot = slotMap.get(slotId);
        if (existingSlot) {
          dateSet.add(existingSlot.date);
        }
      });
    });

    return dateSet;
  }, [selectedExistingGroups, slotMap]);

  const hasMixedExistingSchedules = useMemo(() => {
    if (selectedExistingGroups.length < 2) return false;
    const signatures = selectedExistingGroups.map((group) => getScheduleSignature(group.slotIds));
    return new Set(signatures).size > 1;
  }, [selectedExistingGroups]);

  const hasOtherStudentDifferentExistingSchedule = useMemo(() => {
    const currentSelectionSignature = getScheduleSignature(selectedSlotIds);
    if (currentSelectionSignature === '__NONE__') return false;

    const allStudentsExistingSignatures = (profile?.students ?? []).map((student) => {
      const existing = groupedReservationMap.get(student.studentName);
      return getScheduleSignature(existing?.slotIds ?? []);
    });

    return allStudentsExistingSignatures.some(
      (signature) => signature !== '__NONE__' && signature !== currentSelectionSignature
    );
  }, [groupedReservationMap, profile, selectedSlotIds]);

  function toggleConsent(index: number) {
    setConsents((prev) => prev.map((value, i) => (i === index ? !value : value)));
  }

  async function handleConsentNext() {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch('/api/me/consent', { method: 'POST' });
      const text = await res.text();

      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`동의 저장 API가 JSON이 아닌 응답을 반환했습니다. 상태코드: ${res.status}`);
      }

      if (!res.ok) {
        throw new Error(json.error || '동의 저장 실패');
      }

      if (profile?.students.length) {
        await Promise.all([refreshMyReservations(), refreshSlots()]);
        setStep('slots');
      } else {
        setStep('profile');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '동의 저장 실패');
    } finally {
      setLoading(false);
    }
  }

  async function handleProfileSaved(nextProfile: GuardianProfile) {
    setProfile(nextProfile);
    setSelectedStudentNames(nextProfile.students.map((student) => student.studentName));
    setMessage(null);
    setError(null);
    await Promise.all([refreshMyReservations(), refreshSlots()]);
    setStep('slots');
  }

  async function handleLogout() {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || '로그아웃 실패');
      }

      setProfile(null);
      setMyReservations([]);
      setSelectedStudentNames([]);
      setSelectedSlotIds([]);
      setConsents(CONSENT_ITEMS.map(() => false));
      setStep('auth');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그아웃 실패');
    } finally {
      setLoading(false);
    }
  }

  function toggleStudent(studentName: string) {
    setSelectedStudentNames((prev) =>
      prev.includes(studentName) ? prev.filter((item) => item !== studentName) : [...prev, studentName]
    );
  }

  function toggleSlot(slotId: string) {
    const slot = slotMap.get(slotId);
    if (!slot) return;

    setMessage(null);
    setError(null);

    if (!isOpenForSelection(slot)) {
      setError(`이 일정은 아직 신청할 수 없습니다. 오픈: ${formatDateTime(slot.open_at as string)}`);
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

      if (blockedExistingDates.has(slot.date)) {
        setError('이미 신청한 일정과 같은 날짜는 다시 선택할 수 없습니다. 기존 일정을 먼저 취소해주세요.');
        return prev;
      }

      const hasSameDate = prev.some((selectedId) => {
        const selectedSlot = slotMap.get(selectedId);
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
      setError('먼저 로그인해주세요.');
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

    if (hasOtherStudentDifferentExistingSchedule) {
      const confirmed = confirm(
        '같은 보호자 계정의 다른 학생에게 이미 다른 신청 일정이 있습니다. 현재 다른 일정으로 다시 신청하면 학생별 일정이 달라집니다. 그대로 진행하시겠습니까?'
      );
      if (!confirmed) return;
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
          students: selectedStudents,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || '신청 처리 중 오류가 발생했습니다.');
      }

      setMessage(
        `${selectedStudents.map((student) => student.studentName).join(', ')} 학생의 ${REQUIRED_COUNT}개 일정 신청이 완료되었습니다.`
      );
      setSelectedSlotIds([]);
      await Promise.all([refreshSlots(), refreshMyReservations()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelStudentReservations(studentName: string, slotIds: string[]) {
    if (!profile) return;
    if (!confirm(`${studentName} 학생의 현재 신청 일정을 취소하고 다시 선택하시겠습니까?`)) return;

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch('/api/reservations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentNames: [studentName],
          slotIds,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || '신청 취소에 실패했습니다.');
      }

      await Promise.all([refreshSlots(), refreshMyReservations()]);
      setSelectedStudentNames([]);
      setSelectedSlotIds([]);
      setStep('slots');
      setMessage(`${studentName} 학생의 신청을 취소했습니다. 다시 신청할 학생을 먼저 선택해주세요.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '신청 취소에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  if (booting) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">로그인 상태를 확인하는 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2 text-sm">
          {[
            { key: 'auth', label: '1. 로그인' },
            { key: 'consent', label: '2. 동의사항' },
            { key: 'profile', label: '3. 학생 정보' },
            { key: 'slots', label: '4. 일정 선택' },
          ].map((item) => {
            const isActive = step === item.key;
            return (
              <div
                key={item.key}
                className={`rounded-full px-4 py-2 ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {item.label}
              </div>
            );
          })}
        </div>
      </div>

      {step === 'auth' && <AuthForm onAuthenticated={loadMe} />}

      {step === 'consent' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold">수업 신청 안내</h2>
          <div className="mt-6 space-y-4">
            {CONSENT_ITEMS.map((item, index) => (
              <label key={item} className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  checked={consents[index]}
                  onChange={() => toggleConsent(index)}
                  className="mt-1 h-4 w-4"
                />
                <span className="text-sm text-slate-700">{item}</span>
              </label>
            ))}
          </div>
          {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              disabled={!consentComplete || loading}
              onClick={handleConsentNext}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:bg-slate-300"
            >
              다음
            </button>
          </div>
        </section>
      )}

      {step === 'profile' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">학생 정보 입력</h2>
              <p className="mt-2 text-sm text-slate-600">
                로그인된 전화번호 기준으로 학생 정보를 저장합니다. 다음 접속부터는 다시 입력하지 않아도 됩니다.
              </p>
            </div>
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
                <button
                  type="button"
                  onClick={() => setStep('profile')}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm"
                >
                  학생 정보 수정
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm"
                >
                  로그아웃
                </button>
              </div>
            </div>

            {groupedReservations.length > 0 && (
              <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-amber-900">신청 완료 일정</p>
                  <button
                    type="button"
                    onClick={() => refreshMyReservations().catch(() => undefined)}
                    className="text-xs text-amber-700 underline"
                  >
                    새로고침
                  </button>
                </div>
                <div className="mt-3 space-y-4">
                  {groupedReservations.map((group) => (
                    <div key={group.studentName} className="rounded-xl border border-amber-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{group.studentName}</p>
                          <p className="text-xs text-slate-500">{group.schoolName}</p>
                        </div>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleCancelStudentReservations(group.studentName, group.slotIds)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700 disabled:bg-slate-200 disabled:text-slate-400"
                        >
                          신청 취소 후 다시 선택
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
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
              <aside className="space-y-4 rounded-2xl bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-700">로그인된 보호자 전화번호</p>
                  <p className="mt-1 text-sm text-slate-600">{profile.phoneNumber}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-700">신청할 학생 선택</p>
                  <div className="mt-3 space-y-2">
                    {profile.students.map((student) => {
                      const hasExisting = existingStudentNameSet.has(student.studentName);

                      return (
                        <label
                          key={student.studentName}
                          className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudentNames.includes(student.studentName)}
                            onChange={() => toggleStudent(student.studentName)}
                            className="mt-1 h-4 w-4"
                          />
                          <span className="text-sm text-slate-700">
                            {student.studentName} / {student.schoolName}
                            {hasExisting ? ' · 기존 신청 있음' : ''}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {hasOtherStudentDifferentExistingSchedule && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      같은 보호자 계정의 다른 학생에게 이미 다른 신청 일정이 있습니다. 현재 다른 일정으로 다시 신청하면 학생별 일정이 달라질 수 있습니다.
                    </div>
                  )}

                  {!hasOtherStudentDifferentExistingSchedule && hasMixedExistingSchedules && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      선택한 학생들의 기존 신청 일정이 서로 다릅니다. 함께 다시 신청하기 전에 각 학생의 신청 완료 일정을 확인해주세요.
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-blue-800">
                    선택한 일정 {selectedSlotIds.length} / {REQUIRED_COUNT}
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-blue-900">
                    {selectedSlots.length === 0 ? (
                      <li>아직 선택한 일정이 없습니다.</li>
                    ) : (
                      selectedSlots.map((slot) => <li key={slot.id}>• {formatSelectedSlot(slot)}</li>)
                    )}
                  </ul>
                </div>

                {selectedSlotIds.length === REQUIRED_COUNT && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
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

              <div className="space-y-3">
                {groupedSlots.map(([date, daySlots]) => {
                  const sample = daySlots[0];

                  return (
                    <section key={date} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="mb-2">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {formatKoreanDate(date, sample.day_of_week)}
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
                        {daySlots.map((slot) => {
                          const selected = selectedSlotIdSet.has(slot.id);
                          const openBlocked = !selected && !isOpenForSelection(slot);
                          const existingDateBlocked = !selected && blockedExistingDates.has(slot.date);
                          const sameDateBlocked = !selected && selectedDateSet.has(slot.date);
                          const limitBlocked = !selected && selectedSlotIds.length >= REQUIRED_COUNT;

                          const disabledReason = openBlocked
                            ? `오픈: ${formatDateTime(slot.open_at as string)}`
                            : existingDateBlocked
                              ? '이미 신청한 일정과 같은 날짜입니다. 기존 일정을 먼저 취소해주세요.'
                              : sameDateBlocked
                                ? '같은 날의 다른 시간은 이미 선택되어 있습니다.'
                                : limitBlocked
                                  ? '이미 5개의 일정을 선택했습니다.'
                                  : null;

                          return (
                            <div key={slot.id}>
                              <SlotCard
                                slot={slot}
                                selected={selected}
                                disabled={openBlocked || existingDateBlocked || sameDateBlocked || limitBlocked}
                                disabledReason={disabledReason}
                                onToggle={toggleSlot}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </section>
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