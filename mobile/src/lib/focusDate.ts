export function formatFocusDay(
  isoDate: string,
  locale: string
): { accessible: string; visible: string } {
  const fallback = { accessible: isoDate, visible: isoDate };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return fallback;
  const date = new Date(`${isoDate}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== isoDate)
    return fallback;

  try {
    const weekday = new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      timeZone: 'UTC',
    }).format(date);
    if (
      typeof weekday !== 'string' ||
      !weekday.trim() ||
      /^(undefined|null)$/i.test(weekday.trim())
    )
      return fallback;
    const day = String(date.getUTCDate());
    return { accessible: `${weekday} ${isoDate}`, visible: `${day}\n${weekday}` };
  } catch {
    return fallback;
  }
}
