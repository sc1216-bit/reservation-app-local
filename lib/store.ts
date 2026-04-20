import { Reservation, ReservationSlot, StudentInput } from './types';
import { dayOfWeekKo, normalizeClockTime, nowIso, randomId } from './utils';
import { supabase } from './supabase';

const REQUIRED_SLOT_COUNT = 5;

type SlotInput = {
  date: string;
  label: string;
  startTime: string;
  endTime: string;
  capacity: number;
  openAt?: string | null;
};

type UpdateSlotInput = SlotInput & {
  id: string;
};

type BulkUpdateSlotsInput = {
  ids: string[];
  date?: string;
  label?: string;
  startTime?: string;
  endTime?: string;
  openAt?: string | null;
  applyOpenAt?: boolean;
};

function normalizeOpenAt(openAt?: string | null) {
  const value = openAt?.trim();
  if (!value) return null;

  const match =
    value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/) ??
    value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/);

  if (!match) {
    throw new Error('신청 시작 시간이 올바르지 않습니다.');
  }

  const [, year, month, day, hour, minute, second = '00'] = match;

  // 관리자 입력값은 한국시간(KST) 기준으로 해석
  // KST(+09:00) -> UTC ISO 문자열로 저장
  const utcMillis = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour) - 9,
    Number(minute),
    Number(second)
  );

  const parsed = new Date(utcMillis);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('신청 시작 시간이 올바르지 않습니다.');
  }

  return parsed.toISOString();
}

function normalizeSlotInput(input: SlotInput) {
  if (!input.date?.trim()) throw new Error('날짜를 입력해주세요.');
  if (!input.label?.trim()) throw new Error('반 이름을 입력해주세요.');
  if (!input.startTime?.trim()) throw new Error('시작 시간을 입력해주세요.');
  if (!input.endTime?.trim()) throw new Error('종료 시간을 입력해주세요.');
  if (!Number.isFinite(input.capacity) || input.capacity < 1) {
    throw new Error('정원은 1명 이상이어야 합니다.');
  }

  const startTime = normalizeClockTime(input.startTime);
  const endTime = normalizeClockTime(input.endTime);
  if (startTime >= endTime) {
    throw new Error('종료 시간은 시작 시간보다 늦어야 합니다.');
  }

  return {
    date: input.date.trim(),
    day_of_week: dayOfWeekKo(input.date.trim()),
    label: input.label.trim(),
    start_time: startTime,
    end_time: endTime,
    capacity: Math.floor(input.capacity),
    open_at: normalizeOpenAt(input.openAt),
  };
}

function toSlotRow(input: SlotInput): ReservationSlot {
  const normalized = normalizeSlotInput(input);
  const now = nowIso();

  return {
    id: randomId(),
    date: normalized.date,
    day_of_week: normalized.day_of_week,
    label: normalized.label,
    start_time: normalized.start_time,
    end_time: normalized.end_time,
    capacity: normalized.capacity,
    reserved_count: 0,
    is_closed: false,
    open_at: normalized.open_at,
    created_at: now,
    updated_at: now,
  };
}

async function ensureNoDuplicateSlot(input: { date: string; label: string; start_time: string; end_time: string }, ignoreId?: string) {
  let query = supabase
    .from('slots')
    .select('id')
    .eq('date', input.date)
    .eq('label', input.label)
    .eq('start_time', input.start_time)
    .eq('end_time', input.end_time)
    .limit(1);

  if (ignoreId) {
    query = query.neq('id', ignoreId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (data && data.length > 0) {
    throw new Error('같은 날짜, 반 이름, 시간대의 일정이 이미 존재합니다.');
  }
}

export async function listSlots() {
  const { data, error } = await supabase
    .from('slots')
    .select('*')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
    .order('end_time', { ascending: true })
    .order('label', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ReservationSlot[];
}

export async function listReservations() {
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Reservation[];
}

export async function listReservationsByPhone(phoneNumber: string) {
  const normalizedPhone = phoneNumber.trim();
  if (!normalizedPhone) {
    return [] as Reservation[];
  }

  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('phone_number', normalizedPhone)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Reservation[];
}

export async function createSlot(input: SlotInput) {
  const slot = toSlotRow(input);
  await ensureNoDuplicateSlot({ date: slot.date, label: slot.label, start_time: slot.start_time, end_time: slot.end_time });

  const { data, error } = await supabase
    .from('slots')
    .insert(slot)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ReservationSlot;
}

export async function createSlotsBulk(inputs: SlotInput[]) {
  if (!inputs.length) {
    throw new Error('업로드할 일정이 없습니다.');
  }

  const created: ReservationSlot[] = [];
  const seen = new Set<string>();

  for (const [index, input] of inputs.entries()) {
    const slot = toSlotRow(input);
    const key = `${slot.date}__${slot.label}__${slot.start_time}__${slot.end_time}`;
    if (seen.has(key)) {
      throw new Error(`${index + 2}행: 업로드 파일 안에 같은 날짜, 반 이름, 시간대가 중복되어 있습니다.`);
    }
    seen.add(key);
    await ensureNoDuplicateSlot({ date: slot.date, label: slot.label, start_time: slot.start_time, end_time: slot.end_time });
    created.push(slot);
  }

  const { data, error } = await supabase
    .from('slots')
    .insert(created)
    .select();

  if (error) throw new Error(error.message);
  return (data ?? []) as ReservationSlot[];
}

export async function updateSlot(input: UpdateSlotInput) {
  const normalized = normalizeSlotInput(input);

  const { data: existing, error: fetchError } = await supabase
    .from('slots')
    .select('*')
    .eq('id', input.id)
    .single();

  if (fetchError || !existing) {
    throw new Error('존재하지 않는 일정입니다.');
  }

  if (normalized.capacity < existing.reserved_count) {
    throw new Error(`총인원은 현재 신청 인원(${existing.reserved_count})보다 작을 수 없습니다.`);
  }

  await ensureNoDuplicateSlot({ date: normalized.date, label: normalized.label, start_time: normalized.start_time, end_time: normalized.end_time }, input.id);

  const payload = {
    date: normalized.date,
    day_of_week: normalized.day_of_week,
    label: normalized.label,
    start_time: normalized.start_time,
    end_time: normalized.end_time,
    capacity: normalized.capacity,
    open_at: normalized.open_at,
    is_closed: existing.reserved_count >= normalized.capacity,
    updated_at: nowIso(),
  };

  const { data, error } = await supabase
    .from('slots')
    .update(payload)
    .eq('id', input.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ReservationSlot;
}

export async function updateSlotsBulk(input: BulkUpdateSlotsInput) {
  const ids = [...new Set(input.ids.filter(Boolean))];
  if (!ids.length) {
    throw new Error('수정할 일정을 먼저 선택해주세요.');
  }

  const hasDate = typeof input.date === 'string' && input.date.trim().length > 0;
  const hasLabel = typeof input.label === 'string' && input.label.trim().length > 0;
  const hasStartTime = typeof input.startTime === 'string' && input.startTime.trim().length > 0;
  const hasEndTime = typeof input.endTime === 'string' && input.endTime.trim().length > 0;
  const applyOpenAt = Boolean(input.applyOpenAt);

  if (!hasDate && !hasLabel && !hasStartTime && !hasEndTime && !applyOpenAt) {
    throw new Error('일괄 수정할 날짜, 반 이름, 시작/종료 시간 또는 신청 시작 설정을 입력해주세요.');
  }

  const { data: existingSlots, error: fetchError } = await supabase
    .from('slots')
    .select('*')
    .in('id', ids);

  if (fetchError) throw new Error(fetchError.message);
  if (!existingSlots || existingSlots.length !== ids.length) {
    throw new Error('선택한 일정 중 존재하지 않는 일정이 있습니다.');
  }

  const normalizedDate = hasDate ? input.date!.trim() : undefined;
  const normalizedDayOfWeek = hasDate ? dayOfWeekKo(normalizedDate!) : undefined;
  const normalizedLabel = hasLabel ? input.label!.trim() : undefined;
  const normalizedStartTime = hasStartTime ? normalizeClockTime(input.startTime!) : undefined;
  const normalizedEndTime = hasEndTime ? normalizeClockTime(input.endTime!) : undefined;
  const normalizedOpenAt = applyOpenAt ? normalizeOpenAt(input.openAt) : undefined;

  const proposed = existingSlots.map((slot) => ({
    ...slot,
    date: normalizedDate ?? slot.date,
    day_of_week: normalizedDayOfWeek ?? slot.day_of_week,
    label: normalizedLabel ?? slot.label,
    start_time: normalizedStartTime ?? slot.start_time,
    end_time: normalizedEndTime ?? slot.end_time,
    open_at: applyOpenAt ? normalizedOpenAt ?? null : slot.open_at,
    updated_at: nowIso(),
  }));

  for (const slot of proposed) {
    if (slot.start_time >= slot.end_time) {
      throw new Error('일괄 수정 결과에 종료 시간이 시작 시간보다 이른 일정이 있습니다.');
    }
  }

  const seen = new Set<string>();
  for (const slot of proposed) {
    const key = `${slot.date}__${slot.label}__${slot.start_time}__${slot.end_time}`;
    if (seen.has(key)) {
      throw new Error('일괄 수정 결과에 같은 날짜, 반 이름, 시간대의 일정이 중복됩니다.');
    }
    seen.add(key);
  }

  for (const slot of proposed) {
    await ensureNoDuplicateSlot({ date: slot.date, label: slot.label, start_time: slot.start_time, end_time: slot.end_time }, slot.id);
  }

  const updatedRows: ReservationSlot[] = [];
  for (const slot of proposed) {
    const { data, error } = await supabase
      .from('slots')
      .update({
        date: slot.date,
        day_of_week: slot.day_of_week,
        label: slot.label,
        start_time: slot.start_time,
        end_time: slot.end_time,
        open_at: slot.open_at,
        updated_at: slot.updated_at,
      })
      .eq('id', slot.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    updatedRows.push(data as ReservationSlot);
  }

  return updatedRows;
}

export async function deleteSlot(id: string) {
  const { error } = await supabase.from('slots').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteSlots(ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) {
    throw new Error('삭제할 일정을 먼저 선택해주세요.');
  }

  const { error } = await supabase.from('slots').delete().in('id', uniqueIds);
  if (error) throw new Error(error.message);
}

export async function createReservations(input: { slotIds: string[]; phoneNumber: string; students: StudentInput[] }) {
  const trimmedPhoneNumber = input.phoneNumber.trim();
  const normalizedStudents = input.students.map((student) => ({
    schoolName: student.schoolName.trim(),
    studentName: student.studentName.trim(),
  }));

  if (!trimmedPhoneNumber) throw new Error('전화번호를 입력해주세요.');
  if (!normalizedStudents.length) throw new Error('학생 정보를 1명 이상 입력해주세요.');
  if (input.slotIds.length !== REQUIRED_SLOT_COUNT) {
    throw new Error(`${REQUIRED_SLOT_COUNT}개의 일정을 선택해야 신청할 수 있습니다.`);
  }

  const uniqueSlotIds = [...new Set(input.slotIds)];
  if (uniqueSlotIds.length !== REQUIRED_SLOT_COUNT) {
    throw new Error('중복되지 않은 일정 5개를 선택해주세요.');
  }

  if (normalizedStudents.some((student) => !student.schoolName || !student.studentName)) {
    throw new Error('모든 학생의 학교와 학생명을 입력해주세요.');
  }

  const names = new Set<string>();
  for (const student of normalizedStudents) {
    if (names.has(student.studentName)) {
      throw new Error('같은 학생명이 중복 선택되었습니다.');
    }
    names.add(student.studentName);
  }

  const { data, error } = await supabase.rpc('create_reservations_batch', {
    p_slot_ids: uniqueSlotIds,
    p_phone_number: trimmedPhoneNumber,
    p_students: normalizedStudents,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function cancelReservationsByPhone(input: { phoneNumber: string; slotIds: string[]; studentNames: string[] }) {
  const phoneNumber = input.phoneNumber.trim();
  const slotIds = [...new Set(input.slotIds.filter(Boolean))];
  const studentNames = [...new Set(input.studentNames.map((name) => name.trim()).filter(Boolean))];

  if (!phoneNumber) {
    throw new Error('전화번호가 필요합니다.');
  }
  if (!slotIds.length) {
    throw new Error('취소할 일정이 없습니다.');
  }
  if (!studentNames.length) {
    throw new Error('취소할 학생을 선택해주세요.');
  }

  const { data: reservations, error: fetchError } = await supabase
    .from('reservations')
    .select('*')
    .eq('phone_number', phoneNumber)
    .in('slot_id', slotIds)
    .in('student_name', studentNames);

  if (fetchError) throw new Error(fetchError.message);
  if (!reservations || reservations.length === 0) {
    throw new Error('취소할 신청 내역을 찾지 못했습니다.');
  }

  const reservationIds = reservations.map((item) => item.id);
  const countsBySlot = reservations.reduce<Record<string, number>>((acc, reservation) => {
    acc[reservation.slot_id] = (acc[reservation.slot_id] ?? 0) + 1;
    return acc;
  }, {});

  const { data: targetSlots, error: slotsError } = await supabase
    .from('slots')
    .select('*')
    .in('id', Object.keys(countsBySlot));

  if (slotsError) throw new Error(slotsError.message);

  const { error: deleteError } = await supabase
    .from('reservations')
    .delete()
    .in('id', reservationIds);

  if (deleteError) throw new Error(deleteError.message);

  for (const slot of targetSlots ?? []) {
    const decreaseBy = countsBySlot[slot.id] ?? 0;
    const nextReservedCount = Math.max(0, (slot.reserved_count ?? 0) - decreaseBy);

    const { error: updateError } = await supabase
      .from('slots')
      .update({
        reserved_count: nextReservedCount,
        is_closed: nextReservedCount >= slot.capacity,
        updated_at: nowIso(),
      })
      .eq('id', slot.id);

    if (updateError) throw new Error(updateError.message);
  }

  return {
    canceledCount: reservations.length,
    canceledSlotIds: Object.keys(countsBySlot),
    canceledStudentNames: studentNames,
  };
}

export async function deleteReservation(id: string) {
  if (!id?.trim()) {
    throw new Error('삭제할 신청 id가 없습니다.');
  }

  const { data: reservation, error: fetchReservationError } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchReservationError || !reservation) {
    throw new Error('존재하지 않는 신청입니다.');
  }

  const { data: slot, error: fetchSlotError } = await supabase
    .from('slots')
    .select('*')
    .eq('id', reservation.slot_id)
    .single();

  if (fetchSlotError || !slot) {
    throw new Error('연결된 일정을 찾을 수 없습니다.');
  }

  const { error: deleteError } = await supabase
    .from('reservations')
    .delete()
    .eq('id', id);

  if (deleteError) throw new Error(deleteError.message);

  const nextReservedCount = Math.max(0, slot.reserved_count - 1);
  const { error: updateError } = await supabase
    .from('slots')
    .update({
      reserved_count: nextReservedCount,
      is_closed: nextReservedCount >= slot.capacity,
      updated_at: nowIso(),
    })
    .eq('id', slot.id);

  if (updateError) throw new Error(updateError.message);
}