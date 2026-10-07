'use client';
import { Progress } from '@/components/ui/progress';
import { SKILL_LABEL, type DailyGoal, type DayTotals, type Skill } from '@/lib/types';
import { cn } from '@/lib/utils';

export function goalValue(skill: Skill, d?: DayTotals): number {
  if (!d) return 0;
  switch (skill) {
    case 'vocabulary': return d.vocab_count;
    case 'grammar': return d.grammar_count;
    case 'listening': return d.listening_minutes;
    case 'speaking': return d.speaking_minutes;
    case 'reading': return d.reading_minutes;
    case 'writing': return d.writing_minutes;
  }
}
const ORDER: Skill[] = ['vocabulary', 'grammar', 'listening', 'speaking', 'reading', 'writing'];

export function GoalBars({ goals, today }: { goals: DailyGoal[]; today?: DayTotals }) {
  const active = goals.filter((g) => g.is_active).sort((a, b) => ORDER.indexOf(a.skill) - ORDER.indexOf(b.skill));
  if (!active.length) return <p className="text-sm text-muted-foreground">Belum ada target harian aktif. Atur di Settings.</p>;
  const allDone = active.every((g) => goalValue(g.skill, today) >= Number(g.target));
  return (
    <div className="space-y-4">
      {allDone && <p className="rounded-xl bg-jade/15 px-3 py-2 text-sm font-semibold text-jade">🎉 Daily Goal Completed!</p>}
      {active.map((g) => {
        const v = goalValue(g.skill, today);
        const done = v >= Number(g.target);
        return (
          <div key={g.id}>
            <div className="mb-1.5 flex items-baseline justify-between text-sm">
              <span className="font-medium">{SKILL_LABEL[g.skill]}</span>
              <span className={cn('tabular-nums text-muted-foreground', done && 'font-semibold text-jade')}>
                {Math.round(v * 10) / 10} / {Number(g.target)} {g.unit}
              </span>
            </div>
            <Progress value={v} max={Number(g.target)} barClassName={done ? 'bg-jade' : undefined} />
          </div>
        );
      })}
    </div>
  );
}
