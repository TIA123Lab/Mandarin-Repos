'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '@/lib/app-context';
import { useDays, useSettings, useStreak } from '@/lib/hooks';
import { computeBadges, sumDays } from '@/lib/stats';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';

const sb = createClient();

export default function AchievementsPage() {
  const { userId } = useApp();
  const days = useDays(null); const streak = useStreak(); const settings = useSettings();
  const completed = useQuery({
    queryKey: ['completed-levels', userId],
    queryFn: async () => {
      const { count, error } = await sb.from('monthly_progress').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_completed', true);
      if (error) throw error;
      return count ?? 0;
    },
  });
  const qs = [days, streak, settings, completed];
  const failed = qs.find((q) => q.isError);
  if (failed) return <ErrorState message={(failed.error as Error).message} onRetry={() => qs.forEach((q) => q.refetch())} />;
  if (qs.some((q) => q.isLoading) || !days.data || !settings.data) return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-36" />)}</div>;

  const levelsDone = Math.max(settings.data.current_hsk_level - 1, completed.data ?? 0);
  const badges = computeBadges(sumDays(days.data), streak.data?.longest_streak ?? 0, levelsDone);
  const unlocked = badges.filter((b) => b.current >= b.target).length;

  return (
    <div>
      <PageHeader title="Achievements" subtitle={`${unlocked} dari ${badges.length} badge terbuka.`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {badges.map((b) => {
          const ok = b.current >= b.target;
          return (
            <Card key={b.id} className={cn('flex flex-col items-center gap-2 p-4 text-center', ok ? 'border-jade/50 bg-jade/5' : 'opacity-70')}>
              <span className={cn('text-4xl', !ok && 'opacity-40 grayscale')} aria-hidden>{ok ? b.emoji : '🔒'}</span>
              <p className="text-sm font-semibold">{b.title}</p>
              <p className="text-xs text-muted-foreground">{b.description}</p>
              {ok ? <p className="text-xs font-semibold text-jade">Unlocked</p> : (
                <div className="w-full"><Progress value={b.current} max={b.target} className="h-1.5" /><p className="mt-1 text-[11px] tabular-nums text-muted-foreground">{Math.round(b.current * 10) / 10} / {b.target}</p></div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
