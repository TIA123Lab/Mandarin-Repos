'use client';
import { TrackerPage, Meta, Pill, type TrackerConfig } from '@/components/tracker-page';
import { fmtDate, fmtMinutes } from '@/lib/dates';

const config: TrackerConfig = {
  table: 'reading_sessions', title: 'Reading', singular: 'Reading', subtitle: 'Catat bacaan: halaman, jumlah kata, durasi, dan tingkat pemahaman.',
  searchFields: ['material', 'notes'],
  sorts: [{ value: 'session_date.desc', label: 'Newest' }, { value: 'session_date.asc', label: 'Oldest' }, { value: 'comprehension_pct.desc', label: 'Best comprehension' }],
  chart: { field: 'comprehension_pct', dateField: 'session_date', label: 'Comprehension (%)', max: 100 },
  statsColumns: 'pages,words,comprehension_pct',
  stats: (rows) => {
    const c = rows.filter((r) => r.comprehension_pct !== null);
    return [
      { label: 'Total pages', value: String(rows.reduce((a, r) => a + (r.pages ?? 0), 0)) },
      { label: 'Total words', value: rows.reduce((a, r) => a + (r.words ?? 0), 0).toLocaleString() },
      { label: 'Avg comprehension', value: c.length ? `${Math.round(c.reduce((a, r) => a + Number(r.comprehension_pct), 0) / c.length)}%` : '—' },
    ];
  },
  fields: [
    { name: 'session_date', label: 'Date', type: 'date', required: true, noFuture: true, half: true },
    { name: 'duration_minutes', label: 'Duration (min)', type: 'number', required: true, int: true, min: 0, max: 1440, half: true },
    { name: 'material', label: 'Material', required: true, maxLength: 160, placeholder: 'Graded reader, artikel, komik…' },
    { name: 'pages', label: 'Pages', type: 'number', int: true, min: 0, half: true },
    { name: 'words', label: 'Words', type: 'number', int: true, min: 0, half: true },
    { name: 'comprehension_pct', label: 'Comprehension (%)', type: 'number', min: 0, max: 100, half: true },
    { name: 'notes', label: 'Notes', type: 'textarea', rows: 2 },
  ],
  render: (r) => (
    <>
      <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{r.material}</span>{r.comprehension_pct !== null && <Pill>{Number(r.comprehension_pct)}%</Pill>}</div>
      <Meta items={[fmtDate(r.session_date), fmtMinutes(r.duration_minutes), r.pages !== null && `${r.pages} pages`, r.words !== null && `${r.words} words`]} />
      {r.notes && <p className="mt-1 text-sm">{r.notes}</p>}
    </>
  ),
};
export default function ReadingPage() { return <TrackerPage config={config} />; }
