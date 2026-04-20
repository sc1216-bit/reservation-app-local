import { cookies } from 'next/headers';

export const ADMIN_COOKIE_NAME = 'reservation_admin_auth';

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE_NAME)?.value === 'authenticated';
}
