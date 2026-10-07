'use client';
import { useEffect, useRef } from 'react';
import { addDays, mondayOf, toISO, todayISO } from '@/lib/dates';
import { cn } from '@/lib/utils';

const LEVELS = ['bg-muted', 'bg-jade/25', 'bg-jade/50', 'bg-jade/75', 'bg-jade'];
const level = (m: number | undefined) => (m === undefined ? 0 : m >= 90 ? 4 : m >= 60 ? 3 : m >= 30 ? 2 : 1);

/** Kalender ala GitHub contribution graph. minutesByDate: hanya hari yang punya aktivitas yang ada di map. */
export function StudyCalendar({ minutesByDate, weeks = 20 }: { minutesByDate: Record<string, number>; weeks?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ left: ref.current.scrollWidth }); }, []);
  const today = new Date();
  const todayStr = todayISO();
  const start = addDays(mondayOf(today), -(weeks - 1) * 7);
  const cols = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));

  return (
    <div>
      <div ref={ref} className="overflow-x-auto pb-2">
        <div className="inline-flex gap-1">
          <div className="mr-1 flex flex-col gap-1 pt-5 text-[10px] leading-none text-muted-foreground">
            {['Mon', '', 'Wed', '', 'Fri', '', 'Sun'].map((l, i) => <span key={i} className="flex h-3.5 items-center">{l}</span>)}
          </div>
          {cols.map((col, w) => {
            const first = col[0];
            const showMonth = w === 0 || first.getMonth() !== cols[w - 1][0].getMonth();
            return (
              <div key={w} className="flex flex-col gap-1">
                <span className="h-4 text-[10px] leading-4 text-muted-foreground">{showMonth ? first.toLocaleDateString('en-US', { month: 'short' }) : ''}</span>
                {col.map((d) => {
                  const iso = toISO(d);
                  if (iso > todayStr) return <span key={iso} className="h-3.5 w-3.5" />;
                  const m = minutesByDate[iso];
                  return (
                    <span
                      key={iso}
                      title={m === undefined ? `${iso} · no study` : `${iso} · ${m} min`}
                      className={cn('h-3.5 w-3.5 rounded-[4px]', LEVELS[level(m)], iso === todayStr && 'ring-2 ring-primary ring-offset-1 ring-offset-card')}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
        Less {LEVELS.map((c) => <span key={c} className={cn('h-3 w-3 rounded-[3px]', c)} />)} More
      </div>
    </div>
  );
}
