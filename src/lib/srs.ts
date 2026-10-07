// Spaced repetition sederhana (varian SM-2).
// again : ulang 10 menit lagi, interval reset, ease turun
// hard  : interval x1.2 (min 1 hari), ease turun sedikit
// good  : 1 hari untuk kartu baru, selanjutnya interval x ease
// easy  : 3 hari untuk kartu baru, selanjutnya interval x ease x 1.3, ease naik
export type Rating = 'again' | 'hard' | 'good' | 'easy';

export interface SrsState { interval_days: number; ease_factor: number }
export interface SrsResult extends SrsState { next_review: string; difficulty: Rating }

export function schedule(card: SrsState, rating: Rating, now = new Date()): SrsResult {
  let ease = Number(card.ease_factor) || 2.5;
  let interval = card.interval_days || 0;
  let next: Date;

  switch (rating) {
    case 'again':
      ease = Math.max(1.3, ease - 0.2);
      interval = 0;
      next = new Date(now.getTime() + 10 * 60 * 1000);
      break;
    case 'hard':
      ease = Math.max(1.3, ease - 0.15);
      interval = Math.max(1, Math.round(interval * 1.2));
      next = new Date(now.getTime() + interval * 86400000);
      break;
    case 'good':
      interval = interval === 0 ? 1 : Math.max(interval + 1, Math.round(interval * ease));
      next = new Date(now.getTime() + interval * 86400000);
      break;
    case 'easy':
      ease = Math.min(3.0, ease + 0.15);
      interval = interval === 0 ? 3 : Math.max(interval + 2, Math.round(interval * ease * 1.3));
      next = new Date(now.getTime() + interval * 86400000);
      break;
  }
  return { interval_days: interval, ease_factor: Math.round(ease * 100) / 100, next_review: next.toISOString(), difficulty: rating };
}

export function intervalLabel(card: SrsState, rating: Rating) {
  const r = schedule(card, rating);
  return rating === 'again' ? '10m' : `${r.interval_days}d`;
}

export function dueLabel(nextReview: string) {
  const ms = new Date(nextReview).getTime() - Date.now();
  if (ms <= 0) return 'Due now';
  const days = Math.ceil(ms / 86400000);
  return days <= 1 ? 'Due tomorrow' : `Due in ${days}d`;
}
