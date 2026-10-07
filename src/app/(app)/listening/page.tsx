'use client';
import { TrackerPage, Meta, Pill, type TrackerConfig } from '@/components/tracker-page';
import { fmtDate, fmtMinutes } from '@/lib/dates';

const LEVELS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `HSK ${n}` }));

const config: TrackerConfig = {
  table: 'listening_sessions', title: 'Listening', singular: 'Listening', subtitle: 'Catat latihan listening dan pantau skor dari waktu ke waktu.',
  searchFields: ['material', 'source', 'notes'],
  sorts: [{ value: 'session_date.desc', label: 'Newest' }, { value: 'session_date.asc', label: 'Oldest' }, { value: 'score.desc', label: 'Highest score' }],
  filters: [{ field: 'hsk_level', label: 'HSK', options: LEVELS }],
  chart: { field: 'score', dateField: 'session_date', label: 'Score (%)', max: 100 },
  statsColumns: 'duration_minutes,score',
  stats: (rows) => {
    const scored = rows.filter((r) => r.score !== null);
    return [
      { label: 'Sessions', value: String(rows.length) },
      { label: 'Total time', value: fmtMinutes(rows.reduce((a, r) => a + r.duration_minutes, 0)) },
      { label: 'Average score', value: scored.length ? `${Math.round(scored.reduce((a, r) => a + Number(r.score), 0) / scored.length)}%` : '—' },
    ];
  },
  fields: [
    { name: 'session_date', label: 'Date', type: 'date', required: true, noFuture: true, half: true },
    { name: 'duration_minutes', label: 'Duration (min)', type: 'number', required: true, int: true, min: 0, max: 1440, half: true },
    { name: 'material', label: 'Material', required: true, maxLength: 120, placeholder: 'HSK Listening Practice 1' },
    { name: 'hsk_level', label: 'Level', type: 'select', options: LEVELS, half: true },
    { name: 'score', label: 'Score (%)', type: 'number', min: 0, max: 100, half: true },
    { name: 'source', label: 'Source', maxLength: 120, placeholder: 'YouTube, buku, aplikasi…' },
    { name: 'notes', label: 'Notes', type: 'textarea', rows: 2 },
  ],
  render: (r) => (
    <>
      <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{r.material}</span>{r.hsk_level && <Pill>HSK {r.hsk_level}</Pill>}{r.score !== null && <Pill>{Number(r.score)}%</Pill>}</div>
      <Meta items={[fmtDate(r.session_date), fmtMinutes(r.duration_minutes), r.source]} />
      {r.notes && <p className="mt-1 text-sm">{r.notes}</p>}
    </>
  ),
};
export default function ListeningPage() { return <TrackerPage config={config} />; }
