export type ReservationSlot = {
  id: string;
  date: string;
  day_of_week: string;
  label: string;
  start_time: string;
  end_time: string;
  capacity: number;
  reserved_count: number;
  is_closed: boolean;
  open_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Reservation = {
  id: string;
  slot_id: string;
  school_name: string;
  student_name: string;
  phone_number: string;
  created_at: string;
};

export type StudentInput = {
  schoolName: string;
  studentName: string;
};

export type DataStore = {
  slots: ReservationSlot[];
  reservations: Reservation[];
};
