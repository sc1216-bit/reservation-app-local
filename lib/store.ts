import { Reservation, ReservationSlot, StudentInput } from './types';
import { dayOfWeekKo, nowIso, randomId } from './utils';
import { supabase } from './supabase';

const REQUIRED_SLOT_COUNT = 5;

type SlotInput = {
  date: string;
  timeLabel: string;
  capacity: number;
  openAt?: string | null;
};

type UpdateSlotInput = SlotInput & {
  id: string;
};

type BulkUpdateSlotsInput = {
  ids: string[];
  date?: string;
  timeLabel?: string;
  openAt?: string | null;
  applyOpenAt?: boolean;
};

function normalizeOpenAt(openAt?: string | null) {
  const value = openAt?.trim();
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('신청 시작 시간이 올바르지 않습니다.');
  }
  return parsed.toISOString();
}

function normalizeSlotInput(input: SlotInput) {
  if (!input.date?.trim()) throw new Error('날짜를 입력해주세요.');
  if (!input.timeLabel?.trim()) throw new Error('일정 이름을 입력해주세요.');
  if (!Number.isFinite(input.capacity) || input.capacity < 1) {
    throw new Error('정원은 1명 이상이어야 합니다.');
  }

  return {
    date: input.date.trim(),
    day_of_week: dayOfWeekKo(input.date.trim()),
    time_label: input.timeLabel.trim(),
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
    time_label: normalized.time_label,
    capacity: normalized.capacity,
    reserved_count: 0,
    is_closed: false,
    open_at: normalized.open_at,
    created_at: now,
    updated_at: now,
  };
}

async function ensureNoDuplicateSlot(input: { date: string; time_label: string }, ignoreId?: string) {
  let query = supabase
    .from('slots')
    .select('id')
    .eq('date', input.date)
    .eq('time_label', input.time_label)
    .limit(1);

  if (ignoreId) {
    query = query.neq('id', ignoreId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (data && data.length > 0) {
    throw new Error('같은 날짜와 시간대의 일정이 이미 존재합니다.');
  }
}

export async function listSlots() {
  const { data, error } = await supabase
    .from('slots')
    .select('*')
    .order('date', { ascending: true })
    .order('time_label', { ascending: true });

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

export async function createSlot(input: SlotInput) {
  const slot = toSlotRow(input);
  await ensureNoDuplicateSlot({ date: slot.date, time_label: slot.time_label });

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
    const key = `${slot.date}__${slot.time_label}`;
    if (seen.has(key)) {
      throw new Error(`${index + 2}행: 업로드 파일 안에 같은 날짜와 시간대가 중복되어 있습니다.`);
    }
    seen.add(key);
    await ensureNoDuplicateSlot({ date: slot.date, time_label: slot.time_label });
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

  await ensureNoDuplicateSlot({ date: normalized.date, time_label: normalized.time_label }, input.id);

  const payload = {
    date: normalized.date,
    day_of_week: normalized.day_of_week,
    time_label: normalized.time_label,
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
  const hasTimeLabel = typeof input.timeLabel === 'string' && input.timeLabel.trim().length > 0;
  const applyOpenAt = Boolean(input.applyOpenAt);

  if (!hasDate && !hasTimeLabel && !applyOpenAt) {
    throw new Error('일괄 수정할 날짜, 제목 또는 신청 시작 설정을 입력해주세요.');
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
  const normalizedTimeLabel = hasTimeLabel ? input.timeLabel!.trim() : undefined;
  const normalizedOpenAt = applyOpenAt ? normalizeOpenAt(input.openAt) : undefined;

  const proposed = existingSlots.map((slot) => ({
    ...slot,
    date: normalizedDate ?? slot.date,
    day_of_week: normalizedDayOfWeek ?? slot.day_of_week,
    time_label: normalizedTimeLabel ?? slot.time_label,
    open_at: applyOpenAt ? normalizedOpenAt ?? null : slot.open_at,
    updated_at: nowIso(),
  }));

  const seen = new Set<string>();
  for (const slot of proposed) {
    const key = `${slot.date}__${slot.time_label}`;
    if (seen.has(key)) {
      throw new Error('일괄 수정 결과에 같은 날짜와 시간대의 일정이 중복됩니다.');
    }
    seen.add(key);
  }

  for (const slot of proposed) {
    await ensureNoDuplicateSlot({ date: slot.date, time_label: slot.time_label }, slot.id);
  }

  for (const slot of proposed) {
    const { error } = await supabase
      .from('slots')
      .update({
        date: slot.date,
        day_of_week: slot.day_of_week,
        time_label: slot.time_label,
        open_at: slot.open_at,
        updated_at: slot.updated_at,
      })
      .eq('id', slot.id);

    if (error) throw new Error(error.message);
  }

  return proposed as ReservationSlot[];
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
    throw new Error('연결된 일정이 존재하지 않습니다.');
  }

  const { error: deleteError } = await supabase
    .from('reservations')
    .delete()
    .eq('id', id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const nextReservedCount = Math.max(0, (slot.reserved_count ?? 0) - 1);

  const { error: updateSlotError } = await supabase
    .from('slots')
    .update({
      reserved_count: nextReservedCount,
      is_closed: nextReservedCount >= slot.capacity,
      updated_at: nowIso(),
    })
    .eq('id', slot.id);

  if (updateSlotError) {
    throw new Error(updateSlotError.message);
  }
}
