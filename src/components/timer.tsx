'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pause, Play, RotateCcw, Square } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '@/lib/app-context';
import { useSettings } from '@/lib/hooks';
import { pad, todayISO } from '@/lib/dates';
import { MINUTE_SKILLS, SKILLS, SKILL_LABEL, type Skill } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/controls';
import { useToast } from '@/components/ui/toast';

const sb = createClient();
const PRESETS = { '25/5': [25, 5], '50/10': [50, 10], '60/10': [60, 10] } as const;
type Preset = keyof typeof PRESETS;
type Phase = 'study' | 'break';

interface TimerCtx {
  preset: Preset; setPreset: (p: Preset) => void; skill: Skill; setSkill: (s: Skill) => void;
  phase: Phase; running: boolean; remaining: number; total: number;
  start: () => void; pause: () => void; reset: () => void; finish: () => void;
}
const Ctx = createContext<TimerCtx | null>(null);
export const useTimer = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTimer outside TimerProvider');
  return c;
};

function beep() {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    [0, 0.3, 0.6].forEach((t) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = 880; g.gain.value = 0.08;
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.18);
    });
  } catch { /* audio tidak tersedia */ }
}
function notify(title: string, body: string) {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try { new Notification(title, { body }); } catch { /* beberapa browser mobile tidak mengizinkan */ }
  }
}
export const fmtClock = (s: number) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;

// Timer hidup di level shell, jadi tetap berjalan saat pindah halaman.
export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useApp();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: settings } = useSettings();
  const [preset, setPresetState] = useState<Preset>('25/5');
  const [skill, setSkill] = useState<Skill>('vocabulary');
  const [phase, setPhase] = useState<Phase>('study');
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(25 * 60);
  const endAt = useRef(0);
  const synced = useRef(false);
  const total = PRESETS[preset][phase === 'study' ? 0 : 1] * 60;

  useEffect(() => {
    if (settings && !synced.current) {
      synced.current = true;
      const p = settings.pomodoro_preset as Preset;
      if (PRESETS[p]) { setPresetState(p); setRemaining(PRESETS[p][0] * 60); }
    }
  }, [settings]);

  const save = useCallback(async (minutes: number) => {
    if (minutes < 1) return false;
    const row: Record<string, unknown> = {
      user_id: userId, session_date: todayISO(), duration_minutes: minutes,
      activities: [skill], source: 'timer', notes: `Study timer · ${SKILL_LABEL[skill]}`,
    };
    if (MINUTE_SKILLS.includes(skill)) row[`${skill}_minutes`] = minutes;
    const { error } = await sb.from('study_sessions').insert(row);
    if (error) { toast({ title: 'Could not save session', description: error.message, kind: 'error' }); return false; }
    qc.invalidateQueries();
    return true;
  }, [userId, skill, qc, toast]);

  const complete = useCallback(async () => {
    setRunning(false);
    beep();
    if (phase === 'study') {
      const mins = PRESETS[preset][0];
      const ok = await save(mins);
      toast({ title: '🔔 Study Session Completed', description: ok ? `${mins} minutes saved. Take a ${PRESETS[preset][1]}-minute break.` : undefined, kind: ok ? 'success' : 'info' });
      notify('🔔 Study Session Completed', `${mins} minutes saved.`);
      const br = PRESETS[preset][1] * 60;
      setPhase('break'); setRemaining(br); endAt.current = Date.now() + br * 1000; setRunning(true);
    } else {
      toast({ title: 'Break over', description: 'Ready for the next session?' });
      notify('Break over', 'Ready for the next session?');
      setPhase('study'); setRemaining(PRESETS[preset][0] * 60);
    }
  }, [phase, preset, save, toast]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const rem = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setRemaining(rem);
      if (rem <= 0) { clearInterval(id); complete(); }
    }, 500);
    return () => clearInterval(id);
  }, [running, complete]);

  useEffect(() => {
    document.title = running ? `${fmtClock(remaining)} · ${phase === 'study' ? 'Study' : 'Break'}` : 'Mandarin Learning Dashboard';
  }, [running, remaining, phase]);

  const start = useCallback(() => {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
    endAt.current = Date.now() + remaining * 1000;
    setRunning(true);
  }, [remaining]);
  const pause = useCallback(() => setRunning(false), []);
  const reset = useCallback(() => { setRunning(false); setPhase('study'); setRemaining(PRESETS[preset][0] * 60); }, [preset]);
  const setPreset = useCallback((p: Preset) => {
    if (running) return;
    setPresetState(p); setPhase('study'); setRemaining(PRESETS[p][0] * 60);
  }, [running]);
  const finish = useCallback(async () => {
    if (phase !== 'study') { reset(); return; }
    const mins = Math.floor((total - remaining) / 60);
    setRunning(false);
    if (mins < 1) { toast({ title: 'Belajar minimal 1 menit dulu', description: 'Sesi di bawah 1 menit tidak disimpan.' }); return; }
    if (await save(mins)) toast({ title: 'Session saved', description: `${mins} minutes recorded.`, kind: 'success' });
    reset();
  }, [phase, total, remaining, save, reset, toast]);

  const value = useMemo(() => ({ preset, setPreset, skill, setSkill, phase, running, remaining, total, start, pause, reset, finish }),
    [preset, setPreset, skill, phase, running, remaining, total, start, pause, reset, finish]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function TimerCard({ compact = false }: { compact?: boolean }) {
  const t = useTimer();
  const r = 54, circ = 2 * Math.PI * r;
  const frac = t.total > 0 ? t.remaining / t.total : 0;
  const started = t.running || t.remaining < t.total;
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          <circle cx="60" cy="60" r={r} fill="none" stroke={t.phase === 'study' ? 'hsl(var(--primary))' : 'hsl(var(--jade))'} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - frac)} style={{ transition: 'stroke-dashoffset .5s linear' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums">{fmtClock(t.remaining)}</span>
          <span className="text-xs text-muted-foreground">{t.phase === 'study' ? 'Focus' : 'Break'}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {t.running ? (
          <Button onClick={t.pause} variant="outline"><Pause className="h-4 w-4" />Pause</Button>
        ) : (
          <Button onClick={t.start}><Play className="h-4 w-4" />{started ? 'Resume' : 'Start Timer'}</Button>
        )}
        {started && t.phase === 'study' && <Button onClick={t.finish} variant="soft" title="Stop and save elapsed time"><Square className="h-4 w-4" />Finish</Button>}
        {started && <Button onClick={t.reset} variant="ghost" size="icon" aria-label="Reset"><RotateCcw className="h-4 w-4" /></Button>}
      </div>
      {!compact && (
        <div className="grid w-full grid-cols-2 gap-2">
          <Select value={t.preset} onChange={(e) => t.setPreset(e.target.value as Preset)} disabled={t.running} aria-label="Timer preset">
            <option value="25/5">25 / 5 min</option><option value="50/10">50 / 10 min</option><option value="60/10">60 / 10 min</option>
          </Select>
          <Select value={t.skill} onChange={(e) => t.setSkill(e.target.value as Skill)} aria-label="What are you studying">
            {SKILLS.map((s) => <option key={s} value={s}>{SKILL_LABEL[s]}</option>)}
          </Select>
        </div>
      )}
    </div>
  );
}

export function TimerPill() {
  const t = useTimer();
  if (!t.running) return null;
  return (
    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tabular-nums text-primary">
      ⏱ {fmtClock(t.remaining)} · {t.phase === 'study' ? 'Focus' : 'Break'}
    </span>
  );
}
