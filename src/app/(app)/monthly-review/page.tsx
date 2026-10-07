'use client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '@/lib/app-context';
import { useDaysRange, useLevels, useMonthlyProgress, useSettings } from '@/lib/hooks';
import { daysInMonth, fmtHours, monthEnd, monthLabel, monthStart, toISO } from '@/lib/dates';
import { levelComponents, performance, progressPct, recommendations, sumDays } from '@/lib/stats';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/page-header';

const sb = createClient();

export default function MonthlyReviewPage() {
  const { userId } = useApp();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [offset, setOffset] = useState(0);
  const base = new Date(new Date().getFullYear(), new Date().getMonth() + offset, 1);
  const from = toISO(monthStart(base)); const to = toISO(monthEnd(base));
  const days = useDaysRange(from, to); const levels = useLevels(); const settings = useSettings(); const history = useMonthlyProgress();
  const qs = [days, levels, settings];
  const failed = qs.find((q) => q.isError);
  if (failed) return <ErrorState message={(failed.error as Error).message} onRetry={() => qs.forEach((q) => q.refetch())} />;
  if (qs.some((q) => q.isLoading) || !days.data || !levels.data || !settings.data) return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-72" /></div>;

  const lv = levels.data.find((l) => l.level === settings.data.current_hsk_level);
  const t = sumDays(days.data);
  const comps = levelComponents(t, lv);
  const pct = progressPct(comps);
  const dim = daysInMonth(base);
  const isCurrent = offset === 0;
  const elapsed = isCurrent ? new Date().getDate() : dim;
  const expected = (elapsed / dim) * 100;
  const perf = performance(pct, isCurrent ? expected : 100);
  const recs = recommendations(comps, isCurrent ? expected : 100, t.days, elapsed);
  const get = (k: string) => comps.find((c) => c.key === k);
  const rows: [string, string][] = [
    ['Study Days', `${t.days}/${dim}`], ['Study Hours', fmtHours(t.study)],
    ['Vocabulary', `${t.vocab} / ${lv?.vocab_target ?? 0}`], ['Listening', fmtHours(t.listening)], ['Speaking', fmtHours(t.speaking)],
    ['Reading', fmtHours(t.reading)], ['Writing', fmtHours(t.writing)], ['Grammar', `${Math.round(Math.min(get('grammar')?.ratio ?? 0, 1) * 100)}%`],
  ];

  async function saveSnapshot() {
    const { error } = await sb.from('monthly_progress').upsert({
      user_id: userId, month_start: from, hsk_level: settings.data!.current_hsk_level, progress_pct: pct, study_days: t.days, study_minutes: t.study,
      vocab_count: t.vocab, grammar_count: t.grammar, listening_minutes: t.listening, speaking_minutes: t.speaking,
      reading_minutes: t.reading, writing_minutes: t.writing, performance: perf.key,
    }, { onConflict: 'user_id,month_start' });
    if (error) { toast({ title: 'Failed to save', description: error.message, kind: 'error' }); return; }
    qc.invalidateQueries({ queryKey: ['monthly'] });
    toast({ title: 'Monthly snapshot saved', kind: 'success' });
  }

  return (
    <div>
      <PageHeader title="Monthly Review" subtitle="Evaluasi bulanan terhadap target level HSK."
        actions={<div className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => setOffset((o) => o - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-36 text-center text-sm font-semibold">{monthLabel(base)}</span>
          <Button variant="outline" size="icon" aria-label="Next month" disabled={offset >= 0} onClick={() => setOffset((o) => o + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Target: HSK {settings.data.current_hsk_level}</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-1.5 flex justify-between text-sm"><span className="text-muted-foreground">Progress</span><span className="text-xl font-bold tabular-nums">{pct}%</span></div>
            <Progress value={pct} className="h-3" />
            <dl className="mt-5 space-y-2.5 text-sm">
              {rows.map(([k, v]) => <div key={k} className="flex justify-between border-b pb-2 last:border-0"><dt className="text-muted-foreground">{k}</dt><dd className="font-semibold tabular-nums">{v}</dd></div>)}
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">Dihitung terhadap target level yang sedang aktif.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Monthly Performance</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-2xl font-bold">{perf.emoji} {perf.label}</p>
            {isCurrent && <p className="text-xs text-muted-foreground">Dibandingkan dengan kecepatan ideal: {Math.round(expected)}% di hari ke-{elapsed} dari {dim}.</p>}
            <div className="space-y-2">{recs.map((r, i) => <p key={i} className="rounded-xl bg-muted px-3 py-2.5 text-sm">{r}</p>)}</div>
            <Button variant="soft" className="w-full" onClick={saveSnapshot}>Save snapshot of this month</Button>
          </CardContent>
        </Card>
      </div>
      {(history.data?.length ?? 0) > 0 && (
        <Card className="mt-4">
          <CardHeader><CardTitle>Saved snapshots</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {history.data!.map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                <span className="font-medium">{h.month_start.slice(0, 7)} · HSK {h.hsk_level}{h.is_completed && ' 🏅'}</span>
                <span className="tabular-nums text-muted-foreground">{Math.round(Number(h.progress_pct))}% · {h.study_days} days</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
