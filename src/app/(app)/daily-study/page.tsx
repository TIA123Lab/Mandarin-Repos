'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '@/lib/app-context';
import { useDays, useGoals } from '@/lib/hooks';
import { fmtDate, fmtMinutes, todayISO } from '@/lib/dates';
import { SKILL_LABEL, type StudySession } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/page-header';
import { GoalBars } from '@/components/goal-bars';
import { TimerCard } from '@/components/timer';
import { StudyCalendar } from '@/components/study-calendar';

const sb = createClient();

export default function DailyStudyPage() {
  const { userId, openEntry } = useApp();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [limit, setLimit] = useState(15);
  const goals = useGoals();
  const days = useDays(120);
  const today = todayISO();
  const todayRow = days.data?.find((d) => d.activity_date === today);

  const sessions = useQuery({
    queryKey: ['sessions', userId, limit],
    queryFn: async () => {
      const { data, error } = await sb.from('study_sessions').select('*').eq('user_id', userId)
        .order('session_date', { ascending: false }).order('created_at', { ascending: false }).limit(limit + 1);
      if (error) throw error;
      return data as StudySession[];
    },
  });

  async function remove(s: StudySession) {
    if (!window.confirm('Delete this study session?')) return;
    const { error } = await sb.from('study_sessions').delete().eq('id', s.id);
    if (error) { toast({ title: 'Delete failed', description: error.message, kind: 'error' }); return; }
    qc.invalidateQueries();
    toast({ title: 'Session deleted' });
  }

  const rows = sessions.data?.slice(0, limit) ?? [];
  const minutesByDate = Object.fromEntries((days.data ?? []).map((r) => [r.activity_date, r.study_minutes]));

  return (
    <div>
      <PageHeader title="Daily Study" subtitle="Catat belajar hari ini, pantau target, dan jalankan timer."
        actions={<Button onClick={() => openEntry()}><Plus className="h-4 w-4" />Add Study</Button>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>TODAY&apos;S GOAL · {todayRow ? fmtMinutes(todayRow.study_minutes) : '0m'} studied</CardTitle></CardHeader>
          <CardContent><GoalBars goals={goals.data ?? []} today={todayRow} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>⏱ STUDY TIMER</CardTitle></CardHeader>
          <CardContent><TimerCard /></CardContent>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader><CardTitle>📅 STUDY CALENDAR</CardTitle></CardHeader>
        <CardContent><StudyCalendar minutesByDate={minutesByDate} /></CardContent>
      </Card>

      <h2 className="mb-3 mt-6 text-lg font-semibold">Study log</h2>
      {sessions.isError ? <ErrorState message={(sessions.error as Error).message} onRetry={() => sessions.refetch()} />
        : sessions.isLoading ? <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>
        : rows.length === 0 ? <EmptyState title="Belum ada sesi belajar" description="Tekan Add Study untuk mencatat sesi pertamamu." action={<Button onClick={() => openEntry()}><Plus className="h-4 w-4" />Add Study</Button>} />
        : (
          <div className="space-y-3">
            {rows.map((s) => (
              <Card key={s.id} className="flex items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{fmtDate(s.session_date)} · {fmtMinutes(s.duration_minutes)}
                    {s.is_sample && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">SAMPLE</span>}
                    {s.source === 'timer' && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">TIMER</span>}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {s.activities.map((a) => SKILL_LABEL[a]).join(', ')}
                    {s.vocab_count > 0 && ` · ${s.vocab_count} words`}{s.grammar_count > 0 && ` · ${s.grammar_count} grammar`}
                  </p>
                  {s.notes && <p className="mt-1 text-sm">{s.notes}</p>}
                </div>
                <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => openEntry(s)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => remove(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </Card>
            ))}
            {(sessions.data?.length ?? 0) > limit && <Button variant="outline" className="w-full" onClick={() => setLimit((l) => l + 15)}>Load more</Button>}
          </div>
        )}
    </div>
  );
}
