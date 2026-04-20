import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin';
import { createSlot, deleteSlot, deleteSlots, listReservations, listSlots, updateSlot, updateSlotsBulk } from '@/lib/store';

export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get('scope');
  if (scope === 'public') {
    const slots = await listSlots();
    return NextResponse.json({ slots });
  }

  const authed = await isAdminAuthenticated();
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (scope === 'reservations') {
    const reservations = await listReservations();
    return NextResponse.json({ reservations });
  }

  const slots = await listSlots();
  return NextResponse.json({ slots });
}

export async function POST(request: NextRequest) {
  const authed = await isAdminAuthenticated();
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { date, timeLabel, capacity, openAt } = await request.json();
    const slot = await createSlot({ date, timeLabel, capacity: Number(capacity), openAt });
    return NextResponse.json({ success: true, slot });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '등록 실패' }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  const authed = await isAdminAuthenticated();
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id, date, timeLabel, capacity, openAt } = await request.json();
    const slot = await updateSlot({ id, date, timeLabel, capacity: Number(capacity), openAt });
    return NextResponse.json({ success: true, slot });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '수정 실패' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const authed = await isAdminAuthenticated();
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const slots = await updateSlotsBulk({
      ids: Array.isArray(body.ids) ? body.ids : [],
      date: typeof body.date === 'string' ? body.date : undefined,
      timeLabel: typeof body.timeLabel === 'string' ? body.timeLabel : undefined,
      openAt: Object.prototype.hasOwnProperty.call(body, 'openAt') ? body.openAt : undefined,
      applyOpenAt: Object.prototype.hasOwnProperty.call(body, 'openAt'),
    });
    return NextResponse.json({ success: true, count: slots.length, slots });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '일괄 수정 실패' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const authed = await isAdminAuthenticated();
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    if (Array.isArray(body.ids)) {
      await deleteSlots(body.ids);
      return NextResponse.json({ success: true });
    }
    await deleteSlot(body.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '삭제 실패' }, { status: 400 });
  }
}
