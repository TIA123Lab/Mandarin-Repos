'use client';
import { TrackerPage, Meta, Pill, type TrackerConfig } from '@/components/tracker-page';

const LEVELS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `HSK ${n}` }));

const config: TrackerConfig = {
  table: 'grammar', title: 'Grammar', singular: 'Grammar', subtitle: 'Kumpulan pola grammar beserta contoh kalimat.',
  searchFields: ['pattern', 'meaning', 'example', 'translation'],
  sorts: [{ value: 'created_at.desc', label: 'Newest' }, { value: 'pattern.asc', label: 'Pattern A–Z' }, { value: 'hsk_level.asc', label: 'HSK level' }],
  filters: [{ field: 'hsk_level', label: 'HSK', options: LEVELS }],
  fields: [
    { name: 'pattern', label: 'Grammar', required: true, maxLength: 80, half: true, placeholder: '了' },
    { name: 'hsk_level', label: 'Level', type: 'select', required: true, options: LEVELS, half: true },
    { name: 'meaning', label: 'Meaning', type: 'textarea', required: true, rows: 2, placeholder: 'Menunjukkan perubahan keadaan / tindakan yang sudah selesai.' },
    { name: 'example', label: 'Example', placeholder: '我吃饭了。' },
    { name: 'pinyin', label: 'Pinyin', placeholder: 'Wǒ chīfàn le.' },
    { name: 'translation', label: 'Translation', placeholder: 'Saya sudah makan.' },
    { name: 'notes', label: 'Notes', type: 'textarea', rows: 2 },
  ],
  render: (r) => (
    <>
      <div className="flex flex-wrap items-center gap-2"><span className="text-xl font-bold">{r.pattern}</span><Pill>HSK {r.hsk_level}</Pill></div>
      <p className="mt-1 text-sm">{r.meaning}</p>
      {r.example && <div className="mt-2 rounded-xl bg-muted px-3 py-2 text-sm"><p className="font-medium">{r.example}</p>{r.pinyin && <p className="text-xs text-muted-foreground">{r.pinyin}</p>}{r.translation && <p className="text-xs">{r.translation}</p>}</div>}
      {r.notes && <Meta items={[r.notes]} />}
    </>
  ),
};
export default function GrammarPage() { return <TrackerPage config={config} />; }
