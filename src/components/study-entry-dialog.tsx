'use client';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '@/lib/app-context';
import { isValidISODate, todayISO } from '@/lib/dates';
import { MINUTE_SKILLS, SKILLS, SKILL_LABEL, type Skill, type StudySession } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/controls';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

const sb = createClient();
const EMOJI: Record<Skill, string> = { vocabulary: '📚', grammar: '📝', listening: '🎧', speaking: '🗣️', reading: '📖', writing: '✍️' };
const MIN_KEYS = ['listening', 'speaking', 'reading', 'writing'] as const;

export function StudyEntryDialog({ open, onClose, session }: { open: boolean; onClose: () => void; session?: StudySession }) {
  const { userId } = useApp();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [date, setDate] = useState(todayISO());
  const [acts, setActs] = useState<Skill[]>([]);
  const [duration, setDuration] = useState('30');
  const [vocab, setVocab] = useState('');
  const [grammar, setGrammar] = useState('');
  const [mins, setMins] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({}); setFormError('');
    if (session) {
      setDate(session.session_date); setActs(session.activities); setDuration(String(session.duration_minutes));
      setVocab(session.vocab_count ? String(session.vocab_count) : ''); setGrammar(session.grammar_count ? String(session.grammar_count) : '');
      setMins(Object.fromEntries(MIN_KEYS.map((k) => [k, session[`${k}_minutes`] ? String(session[`${k}_minutes`]) : ''])));
      setNotes(session.notes ?? '');
    } else {
      setDate(todayISO()); setActs([]); setDuration('30'); setVocab(''); setGrammar(''); setMins({}); setNotes('');
    }
  }, [open, session]);

  const toggle = (s: Skill) => setActs((a) => (a.includes(s) ? a.filter((x) => x !== s) : [...a, s]));

  function num(v: string, label: string, max: number, key: string, errs: Record<string, string>): number {
    if (v.trim() === '') return 0;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) errs[key] = `${label} must be a whole number ≥ 0.`;
    else if (n > max) errs[key] = `${label} must be at most ${max}.`;
    return n;
  }

  async function save() {
    const errs: Record<string, string> = {};
    if (!isValidISODate(date)) errs.date = 'Choose a valid date.';
    else if (date > todayISO()) errs.date = 'Date cannot be in the future.';
    if (!acts.length) errs.acts = 'Pick at least one activity.';
    if (duration.trim() === '') errs.duration = 'Duration is required.';
    const dur = num(duration, 'Duration', 1440, 'duration', errs);
    const vc = acts.includes('vocabulary') ? num(vocab, 'New words', 1000, 'vocab', errs) : 0;
    const gc = acts.includes('grammar') ? num(grammar, 'Grammar lessons', 100, 'grammar', errs) : 0;
    const m: Record<string, number> = { listening: 0, speaking: 0, reading: 0, writing: 0 };
    const checkedMin = MIN_KEYS.filter((k) => acts.includes(k));
    for (const k of checkedMin) m[k] = num(mins[k] ?? '', `${SKILL_LABEL[k]} minutes`, 1440, k, errs);
    setErrors(errs); setFormError('');
    if (Object.keys(errs).length) return;

    // Menit skill yang dikosongkan dibagi rata dari total durasi.
    const blank = checkedMin.filter((k) => (mins[k] ?? '').trim() === '');
    if (blank.length && dur > 0) {
      const used = checkedMin.filter((k) => !blank.includes(k)).reduce((a, k) => a + m[k], 0);
      const each = Math.round(Math.max(dur - used, 0) / blank.length);
      blank.forEach((k) => (m[k] = each));
    }
    const row = {
      session_date: date, duration_minutes: dur, activities: acts, vocab_count: vc, grammar_count: gc,
      listening_minutes: m.listening, speaking_minutes: m.speaking, reading_minutes: m.reading, writing_minutes: m.writing,
      notes: notes.trim() || null,
    };
    setBusy(true);
    const { error } = session
      ? await sb.from('study_sessions').update(row).eq('id', session.id)
      : await sb.from('study_sessions').insert({ ...row, user_id: userId, source: 'manual' });
    setBusy(false);
    if (error) { setFormError(error.message); return; }
    qc.invalidateQueries();
    toast({ title: session ? 'Study updated' : 'Study saved 🔥', description: 'Dashboard sudah diperbarui.', kind: 'success' });
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title={session ? 'Edit study' : 'What did you study today?'}>
      <div className="space-y-4">
        <div>
          <div className="grid grid-cols-2 gap-2">
            {SKILLS.map((s) => (
              <button key={s} type="button" onClick={() => toggle(s)} aria-pressed={acts.includes(s)}
                className={cn('flex h-12 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors', acts.includes(s) ? 'border-primary bg-primary/10 text-primary' : 'bg-card hover:bg-muted')}>
                <span aria-hidden>{EMOJI[s]}</span>{SKILL_LABEL[s]}
              </button>
            ))}
          </div>
          {errors.acts && <p className="mt-1 text-xs font-medium text-destructive">{errors.acts}</p>}
        </div>

        {acts.some((a) => a === 'vocabulary' || a === 'grammar') && (
          <div className="grid grid-cols-2 gap-3">
            {acts.includes('vocabulary') && (
              <div><Label htmlFor="q-vocab">New words</Label>
                <Input id="q-vocab" type="number" inputMode="numeric" min={0} placeholder="0" value={vocab} onChange={(e) => setVocab(e.target.value)} aria-invalid={!!errors.vocab} />
                {errors.vocab && <p className="mt-1 text-xs text-destructive">{errors.vocab}</p>}</div>
            )}
            {acts.includes('grammar') && (
              <div><Label htmlFor="q-gram">Grammar lessons</Label>
                <Input id="q-gram" type="number" inputMode="numeric" min={0} placeholder="0" value={grammar} onChange={(e) => setGrammar(e.target.value)} aria-invalid={!!errors.grammar} />
                {errors.grammar && <p className="mt-1 text-xs text-destructive">{errors.grammar}</p>}</div>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="q-dur">Duration (minutes)</Label>
          <Input id="q-dur" type="number" inputMode="numeric" min={0} value={duration} onChange={(e) => setDuration(e.target.value)} aria-invalid={!!errors.duration} />
          <div className="mt-2 flex gap-2">
            {[15, 30, 45, 60].map((n) => <Button key={n} size="sm" variant={duration === String(n) ? 'soft' : 'outline'} onClick={() => setDuration(String(n))}>{n}m</Button>)}
          </div>
          {errors.duration && <p className="mt-1 text-xs font-medium text-destructive">{errors.duration}</p>}
        </div>

        {acts.some((a) => (MINUTE_SKILLS as string[]).includes(a)) && (
          <div>
            <Label>Minutes per skill <span className="font-normal text-muted-foreground">(kosongkan = dibagi rata dari durasi)</span></Label>
            <div className="grid grid-cols-2 gap-3">
              {MIN_KEYS.filter((k) => acts.includes(k)).map((k) => (
                <div key={k}>
                  <Input type="number" inputMode="numeric" min={0} placeholder={SKILL_LABEL[k]} aria-label={`${SKILL_LABEL[k]} minutes`} value={mins[k] ?? ''}
                    onChange={(e) => setMins((x) => ({ ...x, [k]: e.target.value }))} aria-invalid={!!errors[k]} />
                  {errors[k] && <p className="mt-1 text-xs text-destructive">{errors[k]}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label htmlFor="q-date">Date</Label>
            <Input id="q-date" type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={!!errors.date} />
            {errors.date && <p className="mt-1 text-xs font-medium text-destructive">{errors.date}</p>}</div>
        </div>
        <div><Label htmlFor="q-notes">Notes</Label>
          <Textarea id="q-notes" rows={2} placeholder="Belajar tentang penggunaan 了 dan 过." value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

        {formError && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive" role="alert">{formError}</p>}
        <Button size="lg" className="w-full" onClick={save} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save Study</Button>
      </div>
    </Dialog>
  );
}
