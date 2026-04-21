'use client';

import { useEffect, useMemo, useState } from 'react';
import { Reservation, ReservationSlot } from '@/lib/types';
import AuthForm from './AuthForm';
import { compareSlots, formatKoreanDate, getSlotDisplayText } from '@/lib/utils';
import BootingCard from './reservation/BootingCard';
import ReservationStepper from './reservation/ReservationStepper';
import ConsentStep from './reservation/ConsentStep';
import ProfileStep from './reservation/ProfileStep';
import StudentSelector from './reservation/StudentSelector';
import SelectionSummaryBar from './reservation/SelectionSummaryBar';
import SlotSection from './reservation/SlotSection';
import MobileSubmitBar from './reservation/MobileSubmitBar';
import { GuardianProfile } from './ReservationForm';

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

  const selectedSlotIdSet = useMemo(() => new Set(selectedSlotIds), [selectedSlotIds]);

  const selectedStudents = useMemo(
    () => profile?.students.filter((student) => selectedStudentNames.includes(student.studentName)) ?? [],
    [profile, selectedStudentNames]
  );

  const slotMap = useMemo(() => new Map(slots.map((slot) => [slot.id, slot])), [slots]);

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

  const groupedReservationMap = useMemo(
    () => new Map(groupedReservations.map((group) => [group.studentName, group])),
    [groupedReservations]
  );

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

  const selectedStudentsAlreadyCompleted = useMemo(() => {
    if (!selectedStudents.length) return false;

    return selectedStudents.every((student) => {
      const existing = groupedReservationMap.get(student.studentName);
      return !!existing && existing.slotIds.length === REQUIRED_COUNT;
    });
  }, [selectedStudents, groupedReservationMap]);

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
    setMessage(null);
    setError(null);
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
        setError('5개의 일정만 선택할 수 있습니다.');
        return prev;
      }

      if (selectedStudentsAlreadyCompleted) {
        return prev;
      }

      if (blockedExistingDates.has(slot.date)) {
        setError('이미 신청한 날짜예요');
        return prev;
      }

      const hasSameDate = prev.some((selectedId) => {
        const selectedSlot = slotMap.get(selectedId);
        return selectedSlot?.date === slot.date;
      });

      if (hasSameDate) {
        setError('같은 날짜는 1개만 선택할 수 있어요');
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
      setError('신청할 학생을 선택해주세요.');
      return;
    }

    if (selectedStudentsAlreadyCompleted) {
      setError('이미 신청이 완료된 학생입니다.');
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
      setSelectedStudentNames([studentName]);
      setSelectedSlotIds([]);
      setStep('slots');
      setMessage(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '신청 취소에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  if (booting) {
    return <BootingCard />;
  }

  return (
    <div className="space-y-6">
      <ReservationStepper
  step={step}
  showLogout={!!profile && step !== 'auth'}
  loading={loading}
  onLogout={handleLogout}
  onGoProfile={() => setStep('profile')}
/>

      {step === 'auth' && <AuthForm onAuthenticated={loadMe} />}

      {step === 'consent' && (
        <ConsentStep
          items={CONSENT_ITEMS}
          consents={consents}
          loading={loading}
          error={error}
          onToggleConsent={toggleConsent}
          onNext={handleConsentNext}
        />
      )}

      {step === 'profile' && (
        <ProfileStep
          profile={profile}
          onSaved={handleProfileSaved}
        />
      )}

      {step === 'slots' && profile && (
        <section className="space-y-4 pb-28 lg:pb-0">
         

          <StudentSelector
  students={profile.students}
  selectedStudentNames={selectedStudentNames}
  groupedReservations={groupedReservations}
  slotMap={slotMap}
  loading={loading}
  onToggleStudent={toggleStudent}
  onCancelStudentReservations={handleCancelStudentReservations}
  onEditStudents={() => setStep('profile')}
  formatSelectedSlot={formatSelectedSlot}
/>

          {message && selectedSlotIds.length === 0 && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-800">신청이 완료되었어요</p>
              <p className="mt-1 text-sm text-emerald-700">{message}</p>
            </div>
          )}

          {(selectedSlotIds.length > 0 || error) && !selectedStudentsAlreadyCompleted && (
            <SelectionSummaryBar
              selectedCount={selectedSlotIds.length}
              requiredCount={REQUIRED_COUNT}
              selectedStudentCount={selectedStudents.length}
              selectedSlots={selectedSlots.map((slot) => ({
                id: slot.id,
                label: formatSelectedSlot(slot),
              }))}
              message={null}
              error={error}
            />
          )}

          <div className="space-y-4">
            {groupedSlots.map(([date, daySlots]) => {
              const sample = daySlots[0];

              return (
                <SlotSection
                  key={date}
                  title={formatKoreanDate(date, sample.day_of_week)}
                  subtitle={`${daySlots.length}개 시간대`}
                >
                  {!selectedStudentsAlreadyCompleted && blockedExistingDates.has(date) && (
                    <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5">
                      <p className="text-xs font-medium text-rose-700">
                        이미 신청한 날짜예요
                      </p>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {daySlots.map((slot) => {
                      const selected = selectedSlotIdSet.has(slot.id);
                      const completedBlocked = !selected && selectedStudentsAlreadyCompleted;
                      const openBlocked = !selected && !isOpenForSelection(slot);
                      const existingDateBlocked = !selected && blockedExistingDates.has(slot.date);
                      const sameDateBlocked = !selected && selectedDateSet.has(slot.date);
                      const limitBlocked = !selected && selectedSlotIds.length >= REQUIRED_COUNT;

                      const disabledReason = completedBlocked
                        ? null
                        : openBlocked
                          ? `오픈: ${formatDateTime(slot.open_at as string)}`
                          : existingDateBlocked
                            ? '이미 신청한 날짜예요'
                            : sameDateBlocked
                              ? '같은 날짜는 1개만 선택할 수 있어요'
                              : limitBlocked
                                ? '이미 5개를 선택했어요'
                                : null;

                      const disabled =
                        completedBlocked ||
                        openBlocked ||
                        existingDateBlocked ||
                        sameDateBlocked ||
                        limitBlocked;

                      return (
                        <SlotSection.Card
                          key={slot.id}
                          slot={slot}
                          selected={selected}
                          disabled={disabled}
                          disabledReason={disabledReason}
                          onToggle={toggleSlot}
                        />
                      );
                    })}
                  </div>
                </SlotSection>
              );
            })}
          </div>

          <MobileSubmitBar
            loading={loading}
            selectedStudentCount={selectedStudents.length}
            selectedSlotCount={selectedSlotIds.length}
            requiredCount={REQUIRED_COUNT}
            onSubmit={handleSubmit}
          />

          <div className="hidden lg:block">
            <button
              type="button"
              disabled={
                loading ||
                selectedStudents.length === 0 ||
                selectedStudentsAlreadyCompleted ||
                selectedSlotIds.length !== REQUIRED_COUNT
              }
              onClick={handleSubmit}
              className="w-full rounded-2xl bg-slate-900 px-4 py-4 text-sm font-semibold text-white disabled:bg-slate-300"
            >
              {loading ? '신청 중...' : '선택한 5개 일정 신청하기'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}