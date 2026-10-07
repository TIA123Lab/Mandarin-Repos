'use client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '@/lib/app-context';
import { useGoals, useProfile, useSettings } from '@/lib/hooks';
import { SKILL_LABEL, type DailyGoal } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/controls';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/page-header';
import { RecordForm, type Field } from '@/components/record-form';

const sb = createClient();
const LEVELS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `HSK 3.0 Level ${n}` }));
const FIELDS: Field[] = [
  { name: 'display_name', label: 'Name', required: true, maxLength: 60, half: true },
  { name: 'daily_target_minutes', label: 'Daily study target (minutes)', type: 'number', required: true, int: true, min: 0, max: 1440, half: true },
  { name: 'reminder_time', label: 'Preferred study time (reminder)', type: 'time', required: true, half: true },
  { name: 'reminder_enabled', label: 'Show study reminder on dashboard', type: 'checkbox', half: true },
  { name: 'current_hsk_level', label: 'Current HSK level', type: 'select', required: true, options: LEVELS, half: true },
  { name: 'target_hsk_level', label: 'Target HSK level', type: 'select', required: true, options: LEVELS, half: true },
  { name: 'monthly_goal_hours', label: 'Monthly goal (study hours)', type: 'number', min: 0, max: 744, half: true, hint: 'Opsional.' },
  { name: 'pomodoro_preset', label: 'Default Pomodoro', type: 'select', required: true, half: true, options: [{ value: '25/5', label: '25 / 5 minutes' }, { value: '50/10', label: '50 / 10 minutes' }, { value: '60/10', label: '60 / 10 minutes' }] },
  { name: 'theme', label: 'Theme', type: 'select', required: true, half: true, options: [{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }] },
  { name: 'language', label: 'Language', type: 'select', required: true, half: true, options: [{ value: 'id', label: 'Bahasa Indonesia' }, { value: 'en', label: 'English' }], hint: 'Disimpan sebagai preferensi; teks antarmuka saat ini belum diterjemahkan penuh.' },
  { name: 'timezone', label: 'Timezone', required: true, half: true, placeholder: 'Asia/Makassar', hint: 'Dipakai server untuk menghitung streak.' },
];

function GoalsEditor({ goals }: { goals: DailyGoal[] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [vals, setVals] = useState(() => Object.fromEntries(goals.map((g) => [g.id, { target: String(g.target), active: g.is_active }])));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function save() {
    for (const g of goals) { const n = Number(vals[g.id].target); if (!Number.isFinite(n) || n < 0 || n > 10000) { setErr(`${SKILL_LABEL[g.skill]}: target must be a number between 0 and 10000.`); return; } }
    setErr(''); setBusy(true);
    const results = await Promise.all(goals.map((g) => sb.from('daily_goals').update({ target: Number(vals[g.id].target), is_active: vals[g.id].active }).eq('id', g.id)));
    setBusy(false);
    const e = results.find((r) => r.error)?.error;
    if (e) { setErr(e.message); return; }
    qc.invalidateQueries();
    toast({ title: 'Daily goals saved', kind: 'success' });
  }
  return (
    <div className="space-y-3">
      {goals.map((g) => (
        <div key={g.id} className="flex items-center gap-3">
          <label className="flex w-28 items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={vals[g.id].active} onChange={(e) => setVals((v) => ({ ...v, [g.id]: { ...v[g.id], active: e.target.checked } }))} />
            {SKILL_LABEL[g.skill]}
          </label>
          <Input type="number" inputMode="decimal" min={0} aria-label={`${SKILL_LABEL[g.skill]} target`} className="max-w-28" value={vals[g.id].target} onChange={(e) => setVals((v) => ({ ...v, [g.id]: { ...v[g.id], target: e.target.value } }))} />
          <span className="text-sm text-muted-foreground">{g.unit}/day</span>
        </div>
      ))}
      {err && <p className="text-sm font-medium text-destructive" role="alert">{err}</p>}
      <Button onClick={save} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save goals</Button>
    </div>
  );
}

export default function SettingsPage() {
  const { userId, email } = useApp();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { setTheme } = useTheme();
  const settings = useSettings(); const profile = useProfile(); const goals = useGoals();
  const qs = [settings, profile, goals];
  const failed = qs.find((q) => q.isError);
  if (failed) return <ErrorState message={(failed.error as Error).message} onRetry={() => qs.forEach((q) => q.refetch())} />;
  if (qs.some((q) => q.isLoading) || !settings.data || !profile.data) return <div className="space-y-4"><Skeleton className="h-96" /></div>;

  async function rpc(fn: 'seed_sample_sessions' | 'remove_sample_sessions', msg: string) {
    const { error } = await sb.rpc(fn);
    if (error) { toast({ title: 'Failed', description: error.message, kind: 'error' }); return; }
    qc.invalidateQueries();
    toast({ title: msg, kind: 'success' });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" subtitle={email} />
      <Card className="mb-4">
        <CardHeader><CardTitle>Personalization</CardTitle></CardHeader>
        <CardContent>
          <RecordForm
            fields={FIELDS}
            initial={{ ...settings.data, display_name: profile.data.display_name, current_hsk_level: String(settings.data.current_hsk_level), target_hsk_level: String(settings.data.target_hsk_level) }}
            submitLabel="Save settings"
            extraValidate={(v) => (Number(v.target_hsk_level) < Number(v.current_hsk_level) ? { target_hsk_level: 'Target level must be ≥ current level.' } : {})}
            onSubmit={async (v) => {
              const { display_name, ...rest } = v;
              const a = await sb.from('profiles').update({ display_name }).eq('id', userId);
              const b = await sb.from('study_settings').update({ ...rest, current_hsk_level: Number(rest.current_hsk_level), target_hsk_level: Number(rest.target_hsk_level) }).eq('user_id', userId);
              const err = a.error ?? b.error;
              if (err) return err.message;
              setTheme(rest.theme);
              qc.invalidateQueries();
              toast({ title: 'Settings saved', kind: 'success' });
            }}
          />
        </CardContent>
      </Card>
      <Card className="mb-4">
        <CardHeader><CardTitle>Daily goals</CardTitle></CardHeader>
        <CardContent>{goals.data && <GoalsEditor goals={goals.data} />}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Sample data</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Isi 5 sesi belajar contoh agar kalender, streak, dan grafik langsung terlihat. Sesi contoh ditandai SAMPLE dan bisa dihapus kapan saja.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => rpc('seed_sample_sessions', 'Sample sessions added')}>Load sample sessions</Button>
            <Button variant="outline" onClick={() => rpc('remove_sample_sessions', 'Sample sessions removed')}>Remove sample sessions</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
