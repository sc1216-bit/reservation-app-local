import type { Reservation, ReservationSlot } from '@/lib/types';
import type { GuardianProfile } from '@/components/ReservationForm';

export type Step = 'auth' | 'consent' | 'profile' | 'slots';

export type ReservationGroup = {
  studentName: string;
  schoolName: string;
  slotIds: string[];
  reservations: Reservation[];
};

export type CommonCompletedSlotIds = Set<string>;

export type SlotStepStudent = GuardianProfile['students'][number];

export type { GuardianProfile, Reservation, ReservationSlot };
