'use client';
import { TrackerPage, Meta, Pill, type TrackerConfig } from '@/components/tracker-page';
import { fmtDate } from '@/lib/dates';

const countHan = (s: string) => (s.match(/[\u3400-\u9fff]/g) ?? []).length;

const config: TrackerConfig = {
  table: 'writing_sessions', title: 'Writing', singular: 'Writing', subtitle: 'Latihan menulis Mandarin dengan pinyin dan terjemahan.',
  searchFields: ['topic', 'chinese_text', 'translation'],
  sorts: [{ value: 'session_date.desc', label: 'Newest' }, { value: 'session_date.asc', label: 'Oldest' }, { value: 'self_score.desc', label: 'Highest score' }],
  chart: { field: 'self_score', dateField: 'session_date', label: 'Self score (/10)', max: 10 },
  statsColumns: 'word_count,self_score',
  stats: (rows) => {
    const sc = rows.filter((r) => r.self_score !== null);
    return [
      { label: 'Entries', value: String(rows.length) },
      { label: 'Characters written', value: rows.reduce((a, r) => a + (r.word_count ?? 0), 0).toLocaleString() },
      { label: 'Average score', value: sc.length ? `${(sc.reduce((a, r) => a + Number(r.self_score), 0) / sc.length).toFixed(1)}/10` : '—' },
    ];
  },
  // Jika word count dikosongkan, hitung otomatis jumlah karakter Han.
  transform: (v) => ({ ...v, word_count: v.word_count ?? countHan(v.chinese_text ?? ''), duration_minutes: v.duration_minutes ?? 0 }),
  fields: [
    { name: 'session_date', label: 'Date', type: 'date', required: true, noFuture: true, half: true },
    { name: 'topic', label: 'Topic', required: true, maxLength: 120, half: true, placeholder: 'My Daily Routine' },
    { name: 'chinese_text', label: 'Chinese Text', type: 'textarea', required: true, rows: 4, placeholder: '我每天早上六点起床。' },
    { name: 'pinyin', label: 'Pinyin', type: 'textarea', rows: 2, placeholder: 'Wǒ měitiān zǎoshang liù diǎn qǐchuáng.' },
    { name: 'translation', label: 'Translation', type: 'textarea', rows: 2, placeholder: 'Saya bangun setiap pagi pukul enam.' },
    { name: 'word_count', label: 'Word Count', type: 'number', int: true, min: 0, half: true, hint: 'Kosongkan untuk dihitung otomatis.' },
    { name: 'self_score', label: 'Self Score (0–10)', type: 'number', min: 0, max: 10, step: 0.5, half: true },
    { name: 'duration_minutes', label: 'Duration (min)', type: 'number', int: true, min: 0, max: 1440, half: true, hint: 'Opsional, ikut dihitung ke waktu belajar.' },
  ],
  render: (r) => (
    <>
      <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{r.topic}</span>{r.self_score !== null && <Pill>{Number(r.self_score)}/10</Pill>}</div>
      <Meta items={[fmtDate(r.session_date), r.word_count !== null && `${r.word_count} chars`]} />
      <div className="mt-2 rounded-xl bg-muted px-3 py-2 text-sm"><p className="whitespace-pre-wrap font-medium">{r.chinese_text}</p>{r.pinyin && <p className="whitespace-pre-wrap text-xs text-muted-foreground">{r.pinyin}</p>}{r.translation && <p className="whitespace-pre-wrap text-xs">{r.translation}</p>}</div>
    </>
  ),
};
export default function WritingPage() { return <TrackerPage config={config} />; }
