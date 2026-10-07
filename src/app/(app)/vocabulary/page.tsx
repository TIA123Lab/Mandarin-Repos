'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Layers } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '@/lib/app-context';
import { buttonVariants } from '@/components/ui/button';
import { TrackerPage, Meta, Pill, type TrackerConfig } from '@/components/tracker-page';
import { dueLabel } from '@/lib/srs';

const sb = createClient();
const LEVELS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `HSK ${n}` }));

function ReviewCTA() {
  const { userId } = useApp();
  const { data } = useQuery({
    queryKey: ['due-count', userId],
    queryFn: async () => {
      const { count, error } = await sb.from('vocabulary').select('id', { count: 'exact', head: true })
        .eq('user_id', userId).lte('next_review', new Date().toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });
  return (
    <Link href="/vocabulary/review" className={buttonVariants({ variant: 'soft' })}>
      <Layers className="h-4 w-4" />Review{data ? ` (${data} due)` : ''}
    </Link>
  );
}

const config: TrackerConfig = {
  table: 'vocabulary', title: 'Vocabulary', singular: 'Word', subtitle: 'Bank kosakata pribadi dengan flashcard spaced repetition.',
  headerExtra: <ReviewCTA />,
  searchFields: ['chinese', 'pinyin', 'meaning', 'example'],
  sorts: [
    { value: 'created_at.desc', label: 'Newest' }, { value: 'created_at.asc', label: 'Oldest' },
    { value: 'chinese.asc', label: 'Chinese' }, { value: 'meaning.asc', label: 'Meaning A–Z' },
    { value: 'hsk_level.asc', label: 'HSK level' }, { value: 'next_review.asc', label: 'Next review' },
  ],
  filters: [{ field: 'hsk_level', label: 'HSK', options: LEVELS }, { field: 'category', label: 'Category' }],
  fields: [
    { name: 'chinese', label: 'Chinese', required: true, maxLength: 50, half: true, placeholder: '你好' },
    { name: 'pinyin', label: 'Pinyin', maxLength: 80, half: true, placeholder: 'nǐ hǎo' },
    { name: 'meaning', label: 'Meaning', required: true, maxLength: 200, placeholder: 'Halo' },
    { name: 'hsk_level', label: 'HSK Level', type: 'select', required: true, options: LEVELS, half: true },
    { name: 'category', label: 'Category', maxLength: 40, half: true, placeholder: 'Greeting' },
    { name: 'example', label: 'Example', maxLength: 300, placeholder: '你好，我叫 Tiara。' },
    { name: 'example_translation', label: 'Translation', maxLength: 300, placeholder: 'Halo, nama saya Tiara.' },
  ],
  render: (r) => (
    <>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-2xl font-bold">{r.chinese}</span>
        {r.pinyin && <span className="text-sm text-muted-foreground">{r.pinyin}</span>}
      </div>
      <p className="text-sm font-medium">{r.meaning}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2"><Pill>HSK {r.hsk_level}</Pill>{r.category && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{r.category}</span>}</div>
      {r.example && <p className="mt-2 text-sm">{r.example}<span className="block text-xs text-muted-foreground">{r.example_translation}</span></p>}
      <Meta items={[r.review_count > 0 ? `Reviewed ${r.review_count}×` : 'New', dueLabel(r.next_review)]} />
    </>
  ),
};
export default function VocabularyPage() { return <TrackerPage config={config} />; }
