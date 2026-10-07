'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, CheckCircle2, Lock, PlayCircle, Pencil } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '@/lib/app-context';
import { useDaysRange, useLevels, useSettings } from '@/lib/hooks';
import { monthEnd, monthStart, toISO } from '@/lib/dates';
import { levelComponents, progressPct, sumDays } from '@/lib/stats';
import type { HskLevel } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/page-header';
import { FormDialog, type Field } from '@/components/record-form';
import { cn } from '@/lib/utils';

const sb = createClient();
const num = (label: string, name: string, int = false): Field => ({ name, label, type: 'number', required: true, min: 0, max: 100000, int, half: true });
const FIELDS: Field[] = [
  { name: 'title', label: 'Title', required: true, maxLength: 60 },
  num('Vocabulary target (words)', 'vocab_target', true), num('Grammar target (points)', 'grammar_target', true),
  num('Listening (hours)', 'listening_hours_target'), num('Reading (hours)', 'reading_hours_target'),
  num('Speaking (hours)', 'speaking_hours_target'), num('Writing (hours)', 'writing_hours_target'),
  num('Study hours', 'study_hours_target'),
];

export default function RoadmapPage() {
  const { userId } = useApp();
  const qc = useQueryClient();
  const { toast } = useToast();
  const levels = useLevels(); const settings = useSettings();
  const month = useDaysRange(toISO(monthStart()), toISO(monthEnd()));
  const done = useQuery({
    queryKey: ['completed-set', userId],
    queryFn: async () => {
      const { data, error } = await sb.from('monthly_progress').select('hsk_level').eq('user_id', userId).eq('is_completed', true);
      if (error) throw error;
      return new Set((data as { hsk_level: number }[]).map((r) => r.hsk_level));
    },
  });
  const [editing, setEditing] = useState<HskLevel | null>(null);
  const qs = [levels, settings, month, done];
  const failed = qs.find((q) => q.isError);
  if (failed) return <ErrorState message={(failed.error as Error).message} onRetry={() => qs.forEach((q) => q.refetch())} />;
  if (qs.some((q) => q.isLoading) || !levels.data || !settings.data || !month.data) return <div className="space-y-3">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40" />)}</div>;

  const current = settings.data.current_hsk_level;
  const totals = sumDays(month.data);

  async function complete(lv: HskLevel) {
    const comps = levelComponents(totals, lv);
    const pct = progressPct(comps);
    if (!window.confirm(`Tandai ${lv.title} selesai${lv.level < 5 ? ` dan pindah ke Level ${lv.level + 1}` : ''}? (Progres bulan ini: ${pct}%)`)) return;
    const snap = {
      user_id: userId, month_start: toISO(monthStart()), hsk_level: lv.level, progress_pct: pct, study_days: totals.days, study_minutes: totals.study,
      vocab_count: totals.vocab, grammar_count: totals.grammar, listening_minutes: totals.listening, speaking_minutes: totals.speaking,
      reading_minutes: totals.reading, writing_minutes: totals.writing, is_completed: true,
    };
    const a = await sb.from('monthly_progress').upsert(snap, { onConflict: 'user_id,month_start' });
    const b = lv.level < 5 ? await sb.from('study_settings').update({ current_hsk_level: lv.level + 1 }).eq('user_id', userId) : { error: null };
    const err = a.error ?? b.error;
    if (err) { toast({ title: 'Failed', description: err.message, kind: 'error' }); return; }
    qc.invalidateQueries();
    toast({ title: `🏅 ${lv.title} completed!`, kind: 'success' });
  }

  return (
    <div>
      <PageHeader title="HSK Roadmap" subtitle="1 Month = 1 HSK Level. Target tiap level bisa kamu edit sendiri." />
      <div className="mx-auto max-w-2xl">
        {levels.data.map((lv, i) => {
          const status = lv.level < current || done.data?.has(lv.level) ? 'completed' : lv.level === current ? 'in_progress' : 'locked';
          const comps = status === 'in_progress' ? levelComponents(totals, lv) : [];
          const pct = status === 'completed' ? 100 : status === 'in_progress' ? progressPct(comps) : 0;
          return (
            <div key={lv.level}>
              <Card className={cn('p-5', status === 'in_progress' && 'border-primary/60 ring-1 ring-primary/30', status === 'locked' && 'opacity-70')}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Month {lv.month_number}</p>
                    <h2 className="text-lg font-bold">{lv.title}</h2>
                    <p className={cn('mt-1 inline-flex items-center gap-1.5 text-sm font-medium', status === 'completed' ? 'text-jade' : status === 'in_progress' ? 'text-primary' : 'text-muted-foreground')}>
                      {status === 'completed' ? <CheckCircle2 className="h-4 w-4" /> : status === 'in_progress' ? <PlayCircle className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      Status: {status === 'completed' ? 'Completed' : status === 'in_progress' ? 'In Progress' : 'Locked'}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" aria-label={`Edit targets ${lv.title}`} onClick={() => setEditing(lv)}><Pencil className="h-4 w-4" /></Button>
                </div>
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-sm"><span className="text-muted-foreground">Progress</span><span className="font-bold tabular-nums">{pct}%</span></div>
                  <Progress value={pct} barClassName={status === 'completed' ? 'bg-jade' : undefined} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
                  {[
                    ['Vocabulary', `${lv.vocab_target} words`], ['Grammar', `${lv.grammar_target} points`], ['Listening', `${lv.listening_hours_target} h`],
                    ['Reading', `${lv.reading_hours_target} h`], ['Speaking', `${lv.speaking_hours_target} h`], ['Writing', `${lv.writing_hours_target} h`], ['Study', `${lv.study_hours_target} h`],
                  ].map(([k, v]) => <div key={k}><dt className="text-xs text-muted-foreground">Target {k.toLowerCase()}</dt><dd className="font-medium">{v}</dd></div>)}
                </dl>
                {status === 'in_progress' && <Button className="mt-4 w-full" variant="soft" onClick={() => complete(lv)}>Mark level as completed</Button>}
              </Card>
              {i < levels.data.length - 1 && <div className="flex justify-center py-2 text-muted-foreground"><ArrowDown className="h-5 w-5" /></div>}
            </div>
          );
        })}
      </div>
      <FormDialog
        open={!!editing} onClose={() => setEditing(null)} title={`Edit targets · ${editing?.title ?? ''}`}
        fields={FIELDS} initial={editing ?? undefined}
        onSubmit={async (v) => {
          const { error } = await sb.from('hsk_levels').update(v).eq('user_id', userId).eq('level', editing!.level);
          if (error) return error.message;
          qc.invalidateQueries();
          toast({ title: 'Targets updated', kind: 'success' });
          setEditing(null);
        }}
      />
    </div>
  );
}
