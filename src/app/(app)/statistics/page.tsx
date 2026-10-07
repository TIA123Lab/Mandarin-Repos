'use client';
import { useDays, useLevels, useSettings, useStreak } from '@/lib/hooks';
import { addDays, daysInMonth, mondayOf, monthStart, toISO, todayISO, parseISO } from '@/lib/dates';
import { effectiveStreak, levelComponents, progressPct, sumDays } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { PageHeader } from '@/components/page-header';
import { ActivityDonut, ProgressLine, WeeklyBar } from '@/components/charts';

export default function StatisticsPage() {
  const days = useDays(null); const streak = useStreak(); const settings = useSettings(); const levels = useLevels();
  const qs = [days, streak, settings, levels];
  const failed = qs.find((q) => q.isError);
  if (failed) return <ErrorState message={(failed.error as Error).message} onRetry={() => qs.forEach((q) => q.refetch())} />;
  if (qs.some((q) => q.isLoading) || !days.data || !settings.data) return <div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;

  const rows = days.data;
  const t = sumDays(rows);
  const st = effectiveStreak(streak.data, todayISO());

  // Study hours per week (12 minggu terakhir, mulai Senin)
  const thisMonday = mondayOf(new Date());
  const weeks = Array.from({ length: 12 }, (_, i) => addDays(thisMonday, -(11 - i) * 7));
  const bucket: Record<string, number> = Object.fromEntries(weeks.map((w) => [toISO(w), 0]));
  for (const r of rows) { const k = toISO(mondayOf(parseISO(r.activity_date))); if (k in bucket) bucket[k] += r.study_minutes; }
  const weekly = weeks.map((w) => ({ label: `${w.getDate()}/${w.getMonth() + 1}`, hours: Math.round((bucket[toISO(w)] / 60) * 10) / 10 }));

  // Study activity: jumlah hari latihan per aktivitas
  const donut = [
    { name: 'Vocabulary', value: rows.filter((r) => r.vocab_count > 0).length, color: '#0d9488' },
    { name: 'Listening', value: rows.filter((r) => r.listening_minutes > 0).length, color: '#2563eb' },
    { name: 'Speaking', value: rows.filter((r) => r.speaking_minutes > 0).length, color: '#f97316' },
    { name: 'Reading', value: rows.filter((r) => r.reading_minutes > 0).length, color: '#7c3aed' },
    { name: 'Writing', value: rows.filter((r) => r.writing_minutes > 0).length, color: '#db2777' },
    { name: 'Grammar', value: rows.filter((r) => r.grammar_count > 0).length, color: '#ca8a04' },
  ];

  // Monthly progress: akumulasi progres bulan ini vs target pace
  const level = levels.data?.find((l) => l.level === settings.data.current_hsk_level);
  const ms = toISO(monthStart());
  const monthRows = rows.filter((r) => r.activity_date >= ms);
  const dim = daysInMonth();
  const todayDay = new Date().getDate();
  const line = Array.from({ length: todayDay }, (_, i) => {
    const cutoff = toISO(new Date(new Date().getFullYear(), new Date().getMonth(), i + 1));
    return { day: i + 1, actual: progressPct(levelComponents(sumDays(monthRows.filter((r) => r.activity_date <= cutoff)), level)), pace: Math.round(((i + 1) / dim) * 100) };
  });

  const cards: [string, string][] = [
    ['Total Study Days', String(t.days)], ['Total Study Hours', (t.study / 60).toFixed(1)], ['Current Streak', `🔥 ${st.current}`],
    ['Longest Streak', String(streak.data?.longest_streak ?? 0)], ['Vocabulary Learned', String(t.vocab)], ['Grammar Learned', String(t.grammar)],
    ['Listening Hours', (t.listening / 60).toFixed(1)], ['Speaking Hours', (t.speaking / 60).toFixed(1)],
    ['Reading Hours', (t.reading / 60).toFixed(1)], ['Writing Hours', (t.writing / 60).toFixed(1)],
  ];

  return (
    <div>
      <PageHeader title="Statistics" subtitle="Ringkasan seluruh riwayat belajarmu." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map(([k, v]) => <Card key={k} className="px-4 py-3"><p className="text-xs text-muted-foreground">{k}</p><p className="mt-1 text-2xl font-bold tabular-nums">{v}</p></Card>)}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Study Hours per Week</CardTitle></CardHeader><CardContent><WeeklyBar data={weekly} /></CardContent></Card>
        <Card><CardHeader><CardTitle>Study Activity (days practiced)</CardTitle></CardHeader><CardContent><ActivityDonut data={donut} /></CardContent></Card>
        <Card className="lg:col-span-2"><CardHeader><CardTitle>Monthly Progress · HSK {settings.data.current_hsk_level}</CardTitle></CardHeader><CardContent><ProgressLine data={line} /></CardContent></Card>
      </div>
    </div>
  );
}
