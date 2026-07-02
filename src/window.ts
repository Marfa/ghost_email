export interface CollectionWindow {
  from: Date;
  to: Date;
  isFirstRun: boolean;
}

const MS_PER_DAY = 86_400_000;

/** Период сбора: после lastRun или последние fallbackDays дней при первом запуске. */
export function getCollectionWindow(
  lastRunAt: Date | null,
  now: Date,
  fallbackDays = 7,
): CollectionWindow {
  if (lastRunAt) {
    return { from: lastRunAt, to: now, isFirstRun: false };
  }

  const from = new Date(now.getTime() - fallbackDays * MS_PER_DAY);
  return { from, to: now, isFirstRun: true };
}

/** ISO UTC для NQL-фильтра Ghost (кавычки добавляет вызывающий). */
export function toGhostFilterDate(date: Date): string {
  return date.toISOString();
}
