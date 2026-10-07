'use client';
import Link from 'next/link';
import { Flame, Plus } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { useDays, useGoals, useLevels, useProfile, useSettings, useStreak } from '@/lib/hooks';
import { effectiveStreak, levelComponents, progressPct, sumDays } from '@/lib/stats';
import { fmtHours, fmtMinutes, greeting, monthLabel, monthStart, toISO, todayISO } from '@/lib/dates';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { GoalBars } from '@/components/goal-bars';
import { StudyCalendar } from '@/components/study-calendar';
import { TimerCard } from '@/components/timer';

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <Card className="px-4 py-3.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums leading-tight">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

export default function DashboardPage() {
  const { openEntry } = useApp();
  const settings = useSettings(); const profile = useProfile(); const levels = useLevels();
  const goals = useGoals(); const streak = useStreak(); const days = useDays(120);
  const queries = [settings, profile, levels, goals, streak, days];
  const failed = queries.find((q) => q.isError);
  if (failed) return <ErrorState message={(failed.error as Error).message} onRetry={() => queries.forEach((q) => q.refetch())} />;
  if (queries.some((q) => q.isLoading) || !settings.data) {
    return <div className="space-y-4"><Skeleton className="h-16" /><div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-64" /></div>;
  }

  const s = settings.data;
  const today = todayISO();
  const rows = days.data ?? [];
  const todayRow = rows.find((r) => r.activity_date === today);
  const monthRows = rows.filter((r) => r.activity_date >= toISO(monthStart()));
  const totals = sumDays(monthRows);
  const level = levels.data?.find((l) => l.level === s.current_hsk_level);
  const comps = levelComponents(totals, level);
  const pct = progressPct(comps);
  const st = effectiveStreak(streak.data, today);
  const minutesByDate = Object.fromEntries(rows.map((r) => [r.activity_date, r.study_minutes]));
  const nowHM = new Date().toTimeString().slice(0, 5);
  const todayMin = todayRow?.study_minutes ?? 0;
  const showReminder = s.reminder_enabled && nowHM >= s.reminder_time.slice(0, 5) && todayMin < s.daily_target_minutes;
  const name = profile.data?.display_name?.split(' ')[0] ?? '';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{greeting()}{name && `, ${name}`} 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">Mandarin Learning Dashboard · “Consistency beats intensity.”</p>
        </div>
        <Button size="lg" className="hidden md:inline-flex" onClick={() => openEntry()}><Plus className="h-5 w-5" />Add Study</Button>
      </div>

      {showReminder && (
        <div className="rounded-2xl border border-flame/40 bg-flame/10 px-4 py-3 text-sm">
          <p className="font-semibold">Sudah waktunya belajar Mandarin 🇨🇳</p>
          <p className="text-muted-foreground">Target hari ini {s.daily_target_minutes} menit — sisa {Math.max(0, s.daily_target_minutes - todayMin)} menit.</p>
        </div>
      )}

      {/* Streak + Today's goal */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-flame/15 to-transparent lg:col-span-1">
          <CardContent className="flex items-center gap-4">
            <Flame className="h-12 w-12 text-flame" aria-hidden />
            <div>
              <p className="text-3xl font-extrabold tabular-nums">{st.current} <span className="text-base font-semibold">Day Streak</span></p>
              <p className="text-sm text-muted-foreground">{st.studiedToday ? 'Streak hari ini aman. Mantap! 💪' : '🔥 Jangan putus streak kamu!'}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Longest: {streak.data?.longest_streak ?? 0} days</p>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>🎯 TODAY&apos;S GOAL</CardTitle><Button size="sm" onClick={() => openEntry()}><Plus className="h-4 w-4" />Add Study</Button></CardHeader>
          <CardContent><GoalBars goals={goals.data ?? []} today={todayRow} /></CardContent>
        </Card>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Current Goal" value={level?.title ?? `HSK 3.0 Level ${s.current_hsk_level}`} />
        <Stat label="Current Month" value={monthLabel()} />
        <Stat label="Study Time" value={fmtMinutes(totals.study)} sub="this month" />
        <Stat label="Vocabulary Learned" value={`${totals.vocab} / ${level?.vocab_target ?? 0}`} sub="this month" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>📚 HSK PROGRESS</CardTitle><Link href="/roadmap" className="text-xs font-medium text-primary hover:underline">Roadmap</Link></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="mb-1.5 flex justify-between text-sm"><span className="font-semibold">HSK {s.current_hsk_level}</span><span className="font-bold tabular-nums">{pct}%</span></div>
              <Progress value={pct} className="h-3" />
              <p className="mt-1 text-xs text-muted-foreground">Monthly Progress</p>
            </div>
            {comps.map((c) => (
              <div key={c.key} className="text-xs">
                <div className="mb-1 flex justify-between text-muted-foreground"><span>{c.label}</span><span className="tabular-nums">{Math.round(Math.min(c.ratio, 1) * 100)}%</span></div>
                <Progress value={c.ratio * 100} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>⏱ STUDY TIMER</CardTitle></CardHeader>
          <CardContent><TimerCard /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>📊 THIS MONTH</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              {[
                ['Study days', `${totals.days}`], ['Study hours', fmtHours(totals.study)], ['Vocabulary', `${totals.vocab}`], ['Grammar', `${totals.grammar}`],
                ['Listening', fmtHours(totals.listening)], ['Speaking', fmtHours(totals.speaking)], ['Reading', fmtHours(totals.reading)], ['Writing', fmtHours(totals.writing)],
              ].map(([k, v]) => <div key={k} className="flex justify-between border-b pb-2 last:border-0 last:pb-0"><dt className="text-muted-foreground">{k}</dt><dd className="font-semibold tabular-nums">{v}</dd></div>)}
            </dl>
            <Link href="/monthly-review" className={buttonVariants({ variant: 'soft', className: 'mt-4 w-full' })}>Open Monthly Review</Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>📅 STUDY CALENDAR</CardTitle></CardHeader>
        <CardContent><StudyCalendar minutesByDate={minutesByDate} /></CardContent>
      </Card>
    </div>
  );
}
