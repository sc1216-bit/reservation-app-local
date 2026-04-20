create extension if not exists pgcrypto;

create table if not exists public.slots (
  id text primary key,
  date date not null,
  day_of_week text not null,
  time_label text not null,
  capacity integer not null check (capacity > 0),
  reserved_count integer not null default 0 check (reserved_count >= 0),
  is_closed boolean not null default false,
  open_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists slots_unique_date_time_label
  on public.slots (date, time_label);

create table if not exists public.reservations (
  id text primary key,
  slot_id text not null references public.slots(id) on delete cascade,
  school_name text not null,
  student_name text not null,
  phone_number text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists reservations_unique_per_slot_student
  on public.reservations (slot_id, phone_number, student_name);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists slots_touch_updated_at on public.slots;
create trigger slots_touch_updated_at
before update on public.slots
for each row
execute function public.touch_updated_at();

create or replace function public.create_reservations_batch(
  p_slot_ids text[],
  p_phone_number text,
  p_students jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_required_slot_count integer := 5;
  v_unique_slot_count integer;
  v_slot_count integer;
  v_distinct_date_count integer;
  v_student_count integer;
  v_phone_number text := btrim(p_phone_number);
  v_now timestamptz := now();
  v_slot record;
  v_student record;
  v_existing_duplicate boolean;
  v_existing_same_day boolean;
  v_inserted_count integer := 0;
  v_student_names text[] := '{}';
begin
  if array_length(p_slot_ids, 1) is distinct from v_required_slot_count then
    raise exception '%개의 일정을 선택해야 신청할 수 있습니다.', v_required_slot_count;
  end if;

  select count(distinct slot_id)
    into v_unique_slot_count
  from unnest(p_slot_ids) as slot_id;

  if v_unique_slot_count <> v_required_slot_count then
    raise exception '중복되지 않은 일정 5개를 선택해주세요.';
  end if;

  if v_phone_number = '' then
    raise exception '전화번호를 입력해주세요.';
  end if;

  v_student_count := coalesce(jsonb_array_length(p_students), 0);
  if v_student_count < 1 then
    raise exception '학생 정보를 1명 이상 입력해주세요.';
  end if;

  for v_student in
    select
      btrim(coalesce(value->>'schoolName', '')) as school_name,
      btrim(coalesce(value->>'studentName', '')) as student_name
    from jsonb_array_elements(p_students)
  loop
    if v_student.school_name = '' or v_student.student_name = '' then
      raise exception '모든 학생의 학교와 학생명을 입력해주세요.';
    end if;

    if v_student.student_name = any(v_student_names) then
      raise exception '같은 학생명이 중복 선택되었습니다.';
    end if;

    v_student_names := array_append(v_student_names, v_student.student_name);
  end loop;

  select count(*)
    into v_slot_count
  from public.slots
  where id = any(p_slot_ids);

  if v_slot_count <> v_required_slot_count then
    raise exception '선택한 일정 중 존재하지 않는 일정이 있습니다.';
  end if;

  select count(distinct date)
    into v_distinct_date_count
  from public.slots
  where id = any(p_slot_ids);

  if v_distinct_date_count <> v_required_slot_count then
    raise exception '같은 날에는 1타임만 선택 가능합니다. 다른 날짜를 선택해주세요.';
  end if;

  for v_slot in
    select *
    from public.slots
    where id = any(p_slot_ids)
    order by date asc, time_label asc
    for update
  loop
    if v_slot.open_at is not null and v_slot.open_at > v_now then
      raise exception '% % 일정은 아직 신청할 수 없습니다.', v_slot.date, v_slot.time_label;
    end if;

    if v_slot.is_closed or v_slot.reserved_count >= v_slot.capacity then
      update public.slots
      set is_closed = true,
          updated_at = now()
      where id = v_slot.id;

      raise exception '% % 일정은 이미 마감되었습니다.', v_slot.date, v_slot.time_label;
    end if;

    if v_slot.reserved_count + v_student_count > v_slot.capacity then
      raise exception '% % 일정의 남은 자리가 부족합니다.', v_slot.date, v_slot.time_label;
    end if;

    for v_student in
      select
        btrim(coalesce(value->>'schoolName', '')) as school_name,
        btrim(coalesce(value->>'studentName', '')) as student_name
      from jsonb_array_elements(p_students)
    loop
      select exists(
        select 1
        from public.reservations r
        where r.slot_id = v_slot.id
          and r.phone_number = v_phone_number
          and r.student_name = v_student.student_name
      )
      into v_existing_duplicate;

      if v_existing_duplicate then
        raise exception '% 학생은 % % 일정에 이미 신청했습니다.', v_student.student_name, v_slot.date, v_slot.time_label;
      end if;

      select exists(
        select 1
        from public.reservations r
        join public.slots s on s.id = r.slot_id
        where r.phone_number = v_phone_number
          and r.student_name = v_student.student_name
          and s.date = v_slot.date
          and r.slot_id <> v_slot.id
      )
      into v_existing_same_day;

      if v_existing_same_day then
        raise exception '% 학생은 이미 같은 날 다른 시간대를 신청했습니다. 하루에 1타임만 선택 가능합니다.', v_student.student_name;
      end if;
    end loop;
  end loop;

  for v_slot in
    select *
    from public.slots
    where id = any(p_slot_ids)
    order by date asc, time_label asc
  loop
    for v_student in
      select
        btrim(coalesce(value->>'schoolName', '')) as school_name,
        btrim(coalesce(value->>'studentName', '')) as student_name
      from jsonb_array_elements(p_students)
    loop
      insert into public.reservations (
        id,
        slot_id,
        school_name,
        student_name,
        phone_number,
        created_at
      ) values (
        gen_random_uuid()::text,
        v_slot.id,
        v_student.school_name,
        v_student.student_name,
        v_phone_number,
        now()
      );

      v_inserted_count := v_inserted_count + 1;
    end loop;

    update public.slots
    set reserved_count = reserved_count + v_student_count,
        is_closed = (reserved_count + v_student_count) >= capacity,
        updated_at = now()
    where id = v_slot.id;
  end loop;

  return jsonb_build_object(
    'success', true,
    'insertedCount', v_inserted_count,
    'slotCount', v_required_slot_count,
    'studentCount', v_student_count
  );
end;
$$;

revoke all on function public.create_reservations_batch(text[], text, jsonb) from public;
grant execute on function public.create_reservations_batch(text[], text, jsonb) to service_role;
