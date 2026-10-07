import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Akun yang dibuat sebelum schema.sql dijalankan belum punya data awal → buat sekarang (idempotent).
  const { data: s } = await supabase.from('study_settings').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!s) await supabase.rpc('bootstrap_me');

  return <AppShell userId={user.id} email={user.email ?? ''}>{children}</AppShell>;
}
