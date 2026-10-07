'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, PartyPopper } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '@/lib/app-context';
import { intervalLabel, schedule, type Rating } from '@/lib/srs';
import type { VocabItem } from '@/lib/types';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';

const sb = createClient();
const BUTTONS: { r: Rating; label: string; cls: string; key: string }[] = [
  { r: 'again', label: '❌ Again', cls: 'border-destructive/50 hover:bg-destructive/10', key: '1' },
  { r: 'hard', label: '🟡 Hard', cls: 'border-amber-500/50 hover:bg-amber-500/10', key: '2' },
  { r: 'good', label: '🟢 Good', cls: 'border-jade/60 hover:bg-jade/10', key: '3' },
  { r: 'easy', label: '🔵 Easy', cls: 'border-sky-500/50 hover:bg-sky-500/10', key: '4' },
];

export default function ReviewPage() {
  const { userId } = useApp();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [queue, setQueue] = useState<VocabItem[] | null>(null);
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const [initial, setInitial] = useState(0);

  const load = useCallback(async () => {
    setError('');
    const { data, error } = await sb.from('vocabulary').select('*').eq('user_id', userId)
      .lte('next_review', new Date().toISOString()).order('next_review').limit(30);
    if (error) { setError(error.message); return; }
    setQueue(data as VocabItem[]); setInitial(data.length); setDone(0); setRevealed(false);
  }, [userId]);
  useEffect(() => { load(); }, [load]);

  const card = queue?.[0];

  const rate = useCallback(async (rating: Rating) => {
    if (!card) return;
    const s = schedule(card, rating);
    const patch = { last_reviewed: new Date().toISOString(), next_review: s.next_review, review_count: card.review_count + 1, difficulty: s.difficulty, ease_factor: s.ease_factor, interval_days: s.interval_days };
    setQueue((q) => { if (!q) return q; const [first, ...rest] = q; return rating === 'again' ? [...rest, { ...first, ...patch }] : rest; });
    if (rating !== 'again') setDone((d) => d + 1);
    setRevealed(false);
    const [u, l] = await Promise.all([
      sb.from('vocabulary').update(patch).eq('id', card.id),
      sb.from('vocabulary_reviews').insert({ user_id: userId, vocabulary_id: card.id, rating, interval_days: s.interval_days, ease_factor: s.ease_factor }),
    ]);
    const err = u.error ?? l.error;
    if (err) toast({ title: 'Review not saved', description: err.message, kind: 'error' });
    else qc.invalidateQueries({ queryKey: ['due-count'] });
  }, [card, userId, qc, toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!card || (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); setRevealed(true); }
      const b = BUTTONS.find((x) => x.key === e.key);
      if (b && revealed) rate(b.r);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, revealed, rate]);

  const back = <Link href="/vocabulary" className={buttonVariants({ variant: 'ghost', size: 'sm' })}><ArrowLeft className="h-4 w-4" />Vocabulary</Link>;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!queue) return <Skeleton className="mx-auto h-80 max-w-lg" />;

  if (!card) {
    return (
      <div className="mx-auto max-w-lg">
        {back}
        <Card className="mt-3 flex flex-col items-center gap-3 px-6 py-14 text-center">
          <PartyPopper className="h-10 w-10 text-primary" />
          <p className="text-xl font-bold">{initial ? 'Review selesai! 🎉' : 'Tidak ada kartu yang perlu direview'}</p>
          <p className="text-sm text-muted-foreground">{initial ? `${done} kartu direview hari ini.` : 'Semua kosakata sudah terjadwal. Tambah kata baru atau kembali besok.'}</p>
          <Link href="/vocabulary" className={buttonVariants()}>Back to Vocabulary</Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      {back}
      <div className="mb-3 mt-3"><div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>{done} / {initial}</span><span>{queue.length} left</span></div><Progress value={done} max={initial} /></div>
      <Card className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
        <p className="text-6xl font-bold sm:text-7xl">{card.chinese}</p>
        {revealed ? (
          <div className="space-y-1">
            {card.pinyin && <p className="text-2xl text-primary">{card.pinyin}</p>}
            <p className="text-xl font-semibold">{card.meaning}</p>
            {card.example && <p className="pt-3 text-sm">{card.example}<span className="block text-xs text-muted-foreground">{card.example_translation}</span></p>}
          </div>
        ) : (
          <Button size="lg" className="mt-4" onClick={() => setRevealed(true)}>Show Answer</Button>
        )}
      </Card>
      {revealed && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BUTTONS.map((b) => (
            <button key={b.r} onClick={() => rate(b.r)} className={`rounded-xl border bg-card px-2 py-3 text-sm font-semibold transition-colors ${b.cls}`}>
              {b.label}<span className="block text-xs font-normal text-muted-foreground">{intervalLabel(card, b.r)}</span>
            </button>
          ))}
        </div>
      )}
      <p className="mt-3 hidden text-center text-xs text-muted-foreground sm:block">Shortcut: Space = show answer · 1–4 = rate</p>
    </div>
  );
}
