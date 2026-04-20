export function formatKoreanDate(dateString: string, dayOfWeek: string) {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}(${dayOfWeek})`;
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function dayOfWeekKo(dateString: string) {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[new Date(dateString).getDay()];
}

export function nowIso() {
  return new Date().toISOString();
}

export function randomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
