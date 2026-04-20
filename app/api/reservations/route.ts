import { NextRequest, NextResponse } from 'next/server';
import { cancelReservationsByPhone } from '@/lib/store';
import { getCurrentGuardianPhoneNumber } from '@/lib/session';

export async function DELETE(request: NextRequest) {
  try {
    const phoneNumber = await getCurrentGuardianPhoneNumber();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const result = await cancelReservationsByPhone({
      phoneNumber,
      slotIds: Array.isArray(body.slotIds) ? body.slotIds : [],
      studentNames: Array.isArray(body.studentNames) ? body.studentNames : [],
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '신청 취소 실패' },
      { status: 400 }
    );
  }
}