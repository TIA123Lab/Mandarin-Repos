'use client';
import { TrackerPage, Meta, Pill, type TrackerConfig } from '@/components/tracker-page';
import { fmtDate, fmtMinutes } from '@/lib/dates';

const config: TrackerConfig = {
  table: 'speaking_sessions', title: 'Speaking', singular: 'Speaking', subtitle: 'Catat latihan berbicara dan nilai dirimu sendiri (0–10).',
  searchFields: ['topic', 'notes'],
  sorts: [{ value: 'session_date.desc', label: 'Newest' }, { value: 'session_date.asc', label: 'Oldest' }, { value: 'self_score.desc', label: 'Highest score' }],
  chart: { field: 'self_score', dateField: 'session_date', label: 'Self score (/10)', max: 10 },
  statsColumns: 'duration_minutes,self_score',
  stats: (rows) => {
    const scored = rows.filter((r) => r.self_score !== null);
    return [
      { label: 'Sessions', value: String(rows.length) },
      { label: 'Total time', value: fmtMinutes(rows.reduce((a, r) => a + r.duration_minutes, 0)) },
      { label: 'Average score', value: scored.length ? `${(scored.reduce((a, r) => a + Number(r.self_score), 0) / scored.length).toFixed(1)}/10` : '—' },
    ];
  },
  fields: [
    { name: 'session_date', label: 'Date', type: 'date', required: true, noFuture: true, half: true },
    { name: 'duration_minutes', label: 'Duration (min)', type: 'number', required: true, int: true, min: 0, max: 1440, half: true },
    { name: 'topic', label: 'Topic', required: true, maxLength: 120, placeholder: 'Introduce Myself' },
    { name: 'self_score', label: 'Self score (0–10)', type: 'number', min: 0, max: 10, step: 0.5, half: true },
    { name: 'notes', label: 'Notes', type: 'textarea', rows: 2 },
  ],
  render: (r) => (
    <>
      <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{r.topic}</span>{r.self_score !== null && <Pill>{Number(r.self_score)}/10</Pill>}</div>
      <Meta items={[fmtDate(r.session_date), fmtMinutes(r.duration_minutes)]} />
      {r.notes && <p className="mt-1 text-sm">{r.notes}</p>}
    </>
  ),
};
export default function SpeakingPage() { return <TrackerPage config={config} />; }
