import type { DayTotals, HskLevel, Streak } from './types';
import { toISO, addDays } from './dates';

export interface Totals {
  days: number; study: number; vocab: number; grammar: number;
  listening: number; speaking: number; reading: number; writing: number;
}

export function sumDays(rows: DayTotals[]): Totals {
  const t: Totals = { days: rows.length, study: 0, vocab: 0, grammar: 0, listening: 0, speaking: 0, reading: 0, writing: 0 };
  for (const r of rows) {
    t.study += r.study_minutes; t.vocab += r.vocab_count; t.grammar += r.grammar_count;
    t.listening += r.listening_minutes; t.speaking += r.speaking_minutes;
    t.reading += r.reading_minutes; t.writing += r.writing_minutes;
  }
  return t;
}

export interface Component { key: string; label: string; value: number; target: number; unit: string; ratio: number }

export function levelComponents(t: Totals, lv?: HskLevel): Component[] {
  if (!lv) return [];
  const raw = [
    { key: 'vocabulary', label: 'Vocabulary', value: t.vocab, target: Number(lv.vocab_target), unit: 'words' },
    { key: 'grammar', label: 'Grammar', value: t.grammar, target: Number(lv.grammar_target), unit: 'points' },
    { key: 'listening', label: 'Listening', value: t.listening / 60, target: Number(lv.listening_hours_target), unit: 'h' },
    { key: 'reading', label: 'Reading', value: t.reading / 60, target: Number(lv.reading_hours_target), unit: 'h' },
    { key: 'speaking', label: 'Speaking', value: t.speaking / 60, target: Number(lv.speaking_hours_target), unit: 'h' },
    { key: 'writing', label: 'Writing', value: t.writing / 60, target: Number(lv.writing_hours_target), unit: 'h' },
    { key: 'study', label: 'Study time', value: t.study / 60, target: Number(lv.study_hours_target), unit: 'h' },
  ];
  return raw.map((c) => ({ ...c, ratio: c.target > 0 ? c.value / c.target : 1 }));
}

// Rata-rata capaian semua komponen (tiap komponen dibatasi maksimal 100%).
export const progressPct = (cs: Component[]) =>
  cs.length ? Math.round((cs.reduce((a, c) => a + Math.min(1, c.ratio), 0) / cs.length) * 100) : 0;

export function performance(pct: number, expectedPct: number) {
  const ratio = expectedPct > 0 ? pct / expectedPct : 1;
  if (ratio >= 0.9) return { key: 'excellent', label: 'Excellent', emoji: '🟢' } as const;
  if (ratio >= 0.6) return { key: 'good', label: 'Good', emoji: '🟡' } as const;
  return { key: 'needs_improvement', label: 'Needs Improvement', emoji: '🔴' } as const;
}

const TIPS: Record<string, string> = {
  vocabulary: 'Tambah kosakata baru sekitar 20 kata per hari dan rutin buka flashcard.',
  grammar: 'Pelajari minimal 1 grammar setiap hari dan buat contoh kalimatnya sendiri.',
  listening: 'Tingkatkan listening minimal 30 menit setiap hari.',
  reading: 'Tingkatkan reading minimal 20 menit setiap hari.',
  speaking: 'Tingkatkan speaking minimal 15 menit setiap hari.',
  writing: 'Tulis minimal 10 menit setiap hari, walau hanya 2–3 kalimat.',
};

export function recommendations(comps: Component[], expectedPct: number, studyDays: number, elapsedDays: number): string[] {
  const out: string[] = [];
  const pace = Math.max(expectedPct / 100, 0.01);
  const skills = comps.filter((c) => c.key !== 'study');
  const strong = skills.filter((c) => c.ratio / pace >= 0.9);
  const weak = skills.filter((c) => c.ratio / pace < 0.6).sort((a, b) => a.ratio - b.ratio);
  const names = (l: Component[]) => l.map((c) => c.label.toLowerCase()).join(' dan ');

  if (strong.length && weak.length) {
    out.push(`${strong.map((c) => c.label).join(' dan ')} kamu sudah bagus, tetapi ${names(weak)} masih rendah. ${TIPS[weak[0].key]}`);
    if (weak[1]) out.push(TIPS[weak[1].key]);
  } else if (weak.length) {
    out.push(`${weak.map((c) => c.label).join(', ')} masih tertinggal dari target. ${TIPS[weak[0].key]}`);
  } else if (strong.length) {
    out.push('Semua skill sesuai atau di atas target. Pertahankan ritme ini dan mulai pelajari materi level berikutnya.');
  } else {
    out.push('Progres kamu sudah berjalan. Naikkan sedikit durasi belajar harian agar target bulan ini tercapai.');
  }
  if (elapsedDays > 3 && studyDays / elapsedDays < 0.6) {
    out.push(`Kamu baru belajar ${studyDays} dari ${elapsedDays} hari. Belajar tiap hari, walau hanya 15 menit, lebih efektif daripada sesi panjang yang jarang.`);
  }
  return out;
}

export function effectiveStreak(s: Streak | null | undefined, today: string) {
  if (!s || !s.last_study_date) return { current: 0, studiedToday: false };
  const yesterday = toISO(addDays(new Date(today + 'T00:00:00'), -1));
  return {
    current: s.last_study_date >= yesterday ? s.current_streak : 0,
    studiedToday: s.last_study_date === today,
  };
}

export interface Badge { id: string; emoji: string; title: string; description: string; current: number; target: number }

export function computeBadges(all: Totals, longestStreak: number, levelsCompleted: number): Badge[] {
  return [
    { id: 'first', emoji: '🏆', title: 'First Study', description: 'Catat sesi belajar pertama', current: all.days, target: 1 },
    { id: 's7', emoji: '🔥', title: '7 Day Streak', description: 'Belajar 7 hari berturut-turut', current: longestStreak, target: 7 },
    { id: 's30', emoji: '🔥', title: '30 Day Streak', description: 'Belajar 30 hari berturut-turut', current: longestStreak, target: 30 },
    { id: 'v100', emoji: '📚', title: '100 Vocabulary', description: 'Pelajari 100 kosakata', current: all.vocab, target: 100 },
    { id: 'v500', emoji: '📚', title: '500 Vocabulary', description: 'Pelajari 500 kosakata', current: all.vocab, target: 500 },
    { id: 'l10', emoji: '🎧', title: '10 Hours Listening', description: 'Total listening 10 jam', current: all.listening / 60, target: 10 },
    { id: 'sp10', emoji: '🗣️', title: '10 Hours Speaking', description: 'Total speaking 10 jam', current: all.speaking / 60, target: 10 },
    { id: 'hsk', emoji: '🏅', title: 'HSK Level Completed', description: 'Selesaikan satu level HSK', current: levelsCompleted, target: 1 },
  ];
}
