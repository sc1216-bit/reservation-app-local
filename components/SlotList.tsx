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
import ProgressSubmitBar from './reservation/ProgressSubmitBar';
import ReservationCalendar from './reservation/ReservationCalendar';
import CompletedReservations from './reservation/CompletedReservations';
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
type SlotFlowStep = 'students' | 'schedule' | 'review' | 'completed';

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
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [slotFlowStep, setSlotFlowStep] = useState<SlotFlowStep>('students');

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
      setSlotFlowStep('students');
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
      setSlotFlowStep('schedule');
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

  const requiredSeats = useMemo(() => Math.max(selectedStudents.length, 1), [selectedStudents.length]);

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

  const commonCompletedSlotIds = useMemo(() => {
    if (!groupedReservations.length) return new Set<string>();
    const [first, ...rest] = groupedReservations;
    return new Set(first.slotIds.filter((slotId) => rest.every((group) => group.slotIds.includes(slotId))));
  }, [groupedReservations]);

  const hasDifferentCompletedSchedules = useMemo(() => {
    if (groupedReservations.length <= 1) return false;
    const signatures = groupedReservations.map((group) => getScheduleSignature(group.slotIds));
    return new Set(signatures).size > 1;
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


  useEffect(() => {
    if (!groupedSlots.length) {
      setActiveDate(null);
      return;
    }

    const validDates = new Set(groupedSlots.map(([date]) => date));
    if (activeDate && validDates.has(activeDate)) return;

    const firstAvailableDate = groupedSlots.find(([date, daySlots]) => {
      const blocked = blockedExistingDates.has(date);
      return !blocked && daySlots.some((slot) => !slot.is_closed && slot.capacity - slot.reserved_count >= requiredSeats && isOpenForSelection(slot));
    })?.[0];

    setActiveDate(firstAvailableDate ?? groupedSlots[0][0]);
  }, [groupedSlots, activeDate, blockedExistingDates, requiredSeats]);

  const activeDaySlots = useMemo(() => {
    if (!activeDate) return [];
    return groupedSlots.find(([date]) => date === activeDate)?.[1] ?? [];
  }, [activeDate, groupedSlots]);

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

  useEffect(() => {
    if (!selectedStudentNames.length && slotFlowStep !== 'students') {
      setSlotFlowStep('students');
      return;
    }

    if (
      selectedStudentNames.length > 0 &&
      slotFlowStep === 'students' &&
      !selectedStudentsAlreadyCompleted
    ) {
      setSlotFlowStep('schedule');
    }
  }, [selectedStudentNames.length, slotFlowStep, selectedStudentsAlreadyCompleted]);

  useEffect(() => {
    if (selectedSlotIds.length === REQUIRED_COUNT && slotFlowStep === 'schedule') {
      setSlotFlowStep('review');
    }
  }, [selectedSlotIds.length, slotFlowStep]);

  useEffect(() => {
    if (slotFlowStep === 'schedule' && selectedStudentsAlreadyCompleted) {
      setSlotFlowStep('students');
      setError('선택한 학생은 이미 신청이 완료되어 있습니다. 일정 보기나 취소 후 다시 선택해 주세요.');
    }
  }, [slotFlowStep, selectedStudentsAlreadyCompleted]);

  useEffect(() => {
    if (!selectedSlotIds.length) return;

    const invalidSlotIds = selectedSlotIds.filter((slotId) => {
      const slot = slotMap.get(slotId);
      if (!slot) return true;
      return slot.capacity - slot.reserved_count < requiredSeats;
    });

    if (!invalidSlotIds.length) return;

    setSelectedSlotIds((prev) => prev.filter((slotId) => !invalidSlotIds.includes(slotId)));
    setSlotFlowStep('schedule');
    setError(`선택 학생이 ${selectedStudents.length}명으로 변경되어 잔여 좌석이 부족한 일정 ${invalidSlotIds.length}개를 자동 해제했습니다.`);
  }, [requiredSeats, selectedSlotIds, slotMap, selectedStudents.length]);

  function handleGoScheduleStep() {
    if (!selectedStudents.length) {
      setError('신청할 학생을 먼저 선택해주세요.');
      return;
    }

    setMessage(null);
    setError(null);
    setSlotFlowStep('schedule');
  }

  function handleGoReviewStep() {
    if (!selectedStudents.length) {
      setError('신청할 학생을 먼저 선택해주세요.');
      return;
    }

    if (selectedSlotIds.length !== REQUIRED_COUNT) {
      setError('5개의 일정을 모두 선택해야 확인 단계로 이동할 수 있습니다.');
      return;
    }

    setMessage(null);
    setError(null);
    setSlotFlowStep('review');
  }

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
        setSlotFlowStep('schedule');
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
    setSlotFlowStep('schedule');
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
      setSlotFlowStep('students');
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

      if (slot.capacity - slot.reserved_count < requiredSeats) {
        setError(`${selectedStudents.length}명은 이 시간대에 함께 신청할 수 없어요. 잔여 ${Math.max(slot.capacity - slot.reserved_count, 0)}자리입니다.`);
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
      setSlotFlowStep('completed');
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
      setSlotFlowStep('students');
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
        <section className="space-y-4 lg:pb-0">
          <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'students', label: '1 학생 선택' },
                { key: 'schedule', label: '2 날짜/시간 선택' },
                { key: 'review', label: '3 확인 후 신청' },
                { key: 'completed', label: '4 신청 완료' },
              ].map((item, index) => {
                const active = slotFlowStep === item.key;
                const enabled =
                  item.key === 'students' ||
                  (item.key === 'schedule' && selectedStudents.length > 0) ||
                  (item.key === 'review' && selectedSlotIds.length === REQUIRED_COUNT) ||
                  (item.key === 'completed' && groupedReservations.length > 0);

                const onClick =
                  item.key === 'students'
                    ? () => setSlotFlowStep('students')
                    : item.key === 'schedule'
                      ? handleGoScheduleStep
                      : item.key === 'review'
                        ? handleGoReviewStep
                        : () => setSlotFlowStep('completed');

                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={!enabled}
                    onClick={onClick}
                    className={`rounded-2xl border px-3 py-3 text-left transition ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : enabled
                          ? 'border-slate-200 bg-slate-50 text-slate-700'
                          : 'border-slate-200 bg-slate-50 text-slate-300'
                    }`}
                  >
                    <p className="text-xs font-semibold opacity-80">STEP {index + 1}</p>
                    <p className="mt-1 text-sm font-semibold">{item.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {slotFlowStep === 'students' && (
            <div className="space-y-4">
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

              <ProgressSubmitBar
                variant="mobile-inline"
                loading={loading}
                selectedStudentCount={selectedStudents.length}
                selectedSlotCount={selectedSlotIds.length}
                requiredCount={REQUIRED_COUNT}
                onSubmit={handleGoScheduleStep}
                buttonLabel="학생 선택 후 다음"
                helperText="신청할 학생을 먼저 선택해 주세요."
                disabled={selectedStudents.length === 0}
              />

              <div className="hidden lg:block">
                <ProgressSubmitBar
                  variant="inline"
                  loading={loading}
                  selectedStudentCount={selectedStudents.length}
                  selectedSlotCount={selectedSlotIds.length}
                  requiredCount={REQUIRED_COUNT}
                  onSubmit={handleGoScheduleStep}
                  buttonLabel="학생 선택 후 다음"
                  helperText="신청할 학생을 먼저 선택해 주세요."
                  disabled={selectedStudents.length === 0}
                />
              </div>
            </div>
          )}

          {slotFlowStep === 'completed' && (
            <div className="space-y-4">
              {message && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {message}
                </div>
              )}

              <CompletedReservations
                groupedReservations={groupedReservations.map((group) => ({
                  studentName: group.studentName,
                  schoolName: group.schoolName,
                  slotIds: group.slotIds,
                }))}
                slotMap={slotMap}
                loading={loading}
                hasDifferentCompletedSchedules={hasDifferentCompletedSchedules}
                commonCompletedSlotIds={commonCompletedSlotIds}
                formatSelectedSlot={formatSelectedSlot}
                onRefresh={() => { void Promise.all([refreshSlots(), refreshMyReservations()]); }}
                onCancel={handleCancelStudentReservations}
              />

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setSlotFlowStep('students')}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                >
                  다른 학생 선택
                </button>
                <button
                  type="button"
                  onClick={() => setStep('profile')}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                >
                  학생 정보 수정
                </button>
              </div>
            </div>
          )}

          {(slotFlowStep === 'schedule' || slotFlowStep === 'review') && (
            <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)] xl:items-start">
              <div className="space-y-4 xl:sticky xl:top-28">
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

                <div className="hidden lg:block">
                  <SelectionSummaryBar
                    selectedCount={selectedSlotIds.length}
                    requiredCount={REQUIRED_COUNT}
                    selectedSlots={selectedSlots.map((slot) => ({
                      id: slot.id,
                      label: formatSelectedSlot(slot),
                    }))}
                    message={slotFlowStep === 'review' ? message : null}
                    error={error}
                  />
                </div>

                <div className="hidden lg:block">
                  <ProgressSubmitBar
                    variant="inline"
                    loading={loading}
                    selectedStudentCount={selectedStudents.length}
                    selectedSlotCount={selectedSlotIds.length}
                    requiredCount={REQUIRED_COUNT}
                    onSubmit={slotFlowStep === 'schedule' ? handleGoReviewStep : handleSubmit}
                    buttonLabel={slotFlowStep === 'schedule' ? (selectedSlotIds.length === REQUIRED_COUNT ? '선택한 5개 일정 확인하기' : `${selectedSlotIds.length}/${REQUIRED_COUNT}개 일정 선택 중`) : (loading ? '신청 중...' : '최종 신청하기')}
                    helperText={slotFlowStep === 'schedule' ? '달력에서 날짜를 고르고 시간대를 선택해 주세요.' : '선택한 일정과 학생을 확인한 뒤 신청하세요.'}
                    disabled={slotFlowStep === 'schedule' ? selectedSlotIds.length !== REQUIRED_COUNT : undefined}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <ReservationCalendar
                  groupedSlots={groupedSlots}
                  activeDate={activeDate}
                  selectedDates={selectedDateSet}
                  blockedDates={blockedExistingDates}
                  selectedStudentCount={selectedStudents.length}
                  onSelectDate={setActiveDate}
                />

                {activeDate && activeDaySlots.length > 0 && slotFlowStep === 'schedule' && (
                  <SlotSection
                    title={formatKoreanDate(activeDate, activeDaySlots[0]?.day_of_week ?? '')}
                    subtitle={blockedExistingDates.has(activeDate) ? '이미 신청한 날짜예요' : `${activeDaySlots.length}개 시간대 · 현재 ${selectedStudents.length}명 기준`}
                  >
                    <div className="flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-2 md:overflow-visible xl:grid-cols-3 2xl:grid-cols-4">
                      {activeDaySlots.map((slot) => {
                        const selected = selectedSlotIdSet.has(slot.id);
                        const completedBlocked = !selected && selectedStudentsAlreadyCompleted;
                        const openBlocked = !selected && !isOpenForSelection(slot);
                        const existingDateBlocked = !selected && blockedExistingDates.has(slot.date);
                        const sameDateBlocked = !selected && selectedDateSet.has(slot.date);
                        const limitBlocked = !selected && selectedSlotIds.length >= REQUIRED_COUNT;
                        const capacityBlocked = !selected && slot.capacity - slot.reserved_count < requiredSeats;

                        const disabledReason = completedBlocked
                          ? null
                          : openBlocked
                            ? `오픈: ${formatDateTime(slot.open_at as string)}`
                            : capacityBlocked
                              ? `잔여 ${Math.max(slot.capacity - slot.reserved_count, 0)}자리 · 현재 ${selectedStudents.length}명`
                              : null;

                        const disabled =
                          completedBlocked ||
                          openBlocked ||
                          existingDateBlocked ||
                          sameDateBlocked ||
                          limitBlocked ||
                          capacityBlocked;

                        return (
                          <div key={slot.id} className="min-w-[220px] md:min-w-0">
                            <SlotSection.Card
                              slot={slot}
                              selected={selected}
                              disabled={disabled}
                              disabledReason={disabledReason}
                              onToggle={toggleSlot}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </SlotSection>
                )}

                {slotFlowStep === 'review' && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">신청 내용 확인</p>
                        <p className="mt-1 text-sm text-slate-500">선택한 5개 일정을 확인한 뒤 신청하세요.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSlotFlowStep('schedule')}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                      >
                        일정 다시 보기
                      </button>
                    </div>

                    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold text-slate-500">선택 학생</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{selectedStudents.map((student) => student.studentName).join(', ') || '선택 없음'}</p>
                    </div>

                    <ul className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                      {selectedSlots.map((slot, index) => (
                        <li key={slot.id} className="flex gap-2">
                          <span className="font-semibold text-slate-900">{index + 1}.</span>
                          <span>{formatSelectedSlot(slot)}</span>
                        </li>
                      ))}
                    </ul>

                    {message && (
                      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                        <p className="text-sm leading-6 text-emerald-700">{message}</p>
                      </div>
                    )}

                    {error && (
                      <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 lg:hidden">
                        <p className="text-sm leading-6 text-rose-700">{error}</p>
                      </div>
                    )}
                  </div>
                )}

                <ProgressSubmitBar
                  variant="mobile-inline"
                  loading={loading}
                  selectedStudentCount={selectedStudents.length}
                  selectedSlotCount={selectedSlotIds.length}
                  requiredCount={REQUIRED_COUNT}
                  onSubmit={slotFlowStep === 'schedule' ? handleGoReviewStep : handleSubmit}
                  buttonLabel={slotFlowStep === 'schedule' ? (selectedSlotIds.length === REQUIRED_COUNT ? '선택한 5개 일정 확인하기' : `${selectedSlotIds.length}/${REQUIRED_COUNT}개 일정 선택 중`) : (loading ? '신청 중...' : '최종 신청하기')}
                  helperText={slotFlowStep === 'schedule' ? '달력에서 날짜를 고르고 시간대를 선택해 주세요.' : '선택한 일정과 학생을 확인한 뒤 신청하세요.'}
                  disabled={slotFlowStep === 'schedule' ? selectedSlotIds.length !== REQUIRED_COUNT : undefined}
                />
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}