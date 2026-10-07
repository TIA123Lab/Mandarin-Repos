'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '@/lib/app-context';
import { addDays, todayISO, toISO } from '@/lib/dates';
import type { DailyGoal, DayTotals, HskLevel, MonthlyProgress, Profile, Settings, Streak } from '@/lib/types';

const sb = createClient();

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export function useSettings() {
  const { userId } = useApp();
  return useQuery({
    queryKey: ['settings', userId],
    queryFn: async () => unwrap(await sb.from('study_settings').select('*').eq('user_id', userId).single()) as Settings,
  });
}
export function useProfile() {
  const { userId } = useApp();
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => unwrap(await sb.from('profiles').select('id,display_name').eq('id', userId).single()) as Profile,
  });
}
export function useLevels() {
  const { userId } = useApp();
  return useQuery({
    queryKey: ['levels', userId],
    queryFn: async () => unwrap(await sb.from('hsk_levels').select('*').eq('user_id', userId).order('level')) as HskLevel[],
  });
}
export function useGoals() {
  const { userId } = useApp();
  return useQuery({
    queryKey: ['goals', userId],
    queryFn: async () => unwrap(await sb.from('daily_goals').select('*').eq('user_id', userId)) as DailyGoal[],
  });
}
export function useStreak() {
  const { userId } = useApp();
  return useQuery({
    queryKey: ['streak', userId],
    queryFn: async () => {
      const res = await sb.from('streaks').select('current_streak,longest_streak,last_study_date').eq('user_id', userId).maybeSingle();
      if (res.error) throw new Error(res.error.message);
      return (res.data ?? null) as Streak | null;
    },
  });
}
/** Total harian dari view daily_progress. daysBack=null → seluruh riwayat (satu baris per hari belajar). */
export function useDays(daysBack: number | null) {
  const { userId } = useApp();
  return useQuery({
    queryKey: ['days', userId, daysBack],
    queryFn: async () => {
      let q = sb.from('daily_progress').select('*').eq('user_id', userId).order('activity_date');
      if (daysBack !== null) q = q.gte('activity_date', toISO(addDays(new Date(), -daysBack)));
      return unwrap(await q) as DayTotals[];
    },
  });
}
export function useDaysRange(from: string, to: string) {
  const { userId } = useApp();
  return useQuery({
    queryKey: ['days', userId, from, to],
    queryFn: async () =>
      unwrap(await sb.from('daily_progress').select('*').eq('user_id', userId).gte('activity_date', from).lte('activity_date', to).order('activity_date')) as DayTotals[],
  });
}
export function useMonthlyProgress() {
  const { userId } = useApp();
  return useQuery({
    queryKey: ['monthly', userId],
    queryFn: async () =>
      unwrap(await sb.from('monthly_progress').select('*').eq('user_id', userId).order('month_start', { ascending: false }).limit(24)) as MonthlyProgress[],
  });
}
export { todayISO };
