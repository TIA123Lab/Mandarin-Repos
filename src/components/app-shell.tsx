'use client';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useQueryClient } from '@tanstack/react-query';
import {
  BarChart3, BookMarked, BookOpen, CalendarCheck, ClipboardList, Headphones, Home, Languages, LogOut, Map as MapIcon,
  Menu, Mic, Moon, PenLine, Plus, Settings as SettingsIcon, Sun, Trophy, X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AppProvider } from '@/lib/app-context';
import type { StudySession } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { StudyEntryDialog } from '@/components/study-entry-dialog';
import { TimerPill, TimerProvider } from '@/components/timer';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/daily-study', label: 'Daily Study', icon: CalendarCheck },
  { href: '/vocabulary', label: 'Vocabulary', icon: BookMarked },
  { href: '/grammar', label: 'Grammar', icon: Languages },
  { href: '/listening', label: 'Listening', icon: Headphones },
  { href: '/speaking', label: 'Speaking', icon: Mic },
  { href: '/reading', label: 'Reading', icon: BookOpen },
  { href: '/writing', label: 'Writing', icon: PenLine },
  { href: '/roadmap', label: 'HSK Roadmap', icon: MapIcon },
  { href: '/statistics', label: 'Statistics', icon: BarChart3 },
  { href: '/monthly-review', label: 'Monthly Review', icon: ClipboardList },
  { href: '/achievements', label: 'Achievements', icon: Trophy },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
];
const BOTTOM = [NAV[0], NAV[1], null, NAV[2], NAV[9]] as const; // Home, Study, (+), Vocab, Stats

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
      <Sun className="hidden h-5 w-5 dark:block" /><Moon className="h-5 w-5 dark:hidden" />
    </Button>
  );
}

export function AppShell({ userId, email, children }: { userId: string; email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const [menu, setMenu] = useState(false);
  const [entry, setEntry] = useState<{ open: boolean; session?: StudySession }>({ open: false });
  const openEntry = useCallback((session?: StudySession) => setEntry({ open: true, session }), []);
  const active = (href: string) => pathname === href || pathname.startsWith(href + '/');

  async function signOut() {
    await createClient().auth.signOut();
    qc.clear();
    router.replace('/login');
    router.refresh();
  }

  const link = (n: (typeof NAV)[number], onClick?: () => void) => (
    <Link key={n.href} href={n.href} onClick={onClick}
      className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors', active(n.href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
      <n.icon className="h-5 w-5" />{n.label}
    </Link>
  );

  return (
    <AppProvider value={{ userId, email, openEntry }}>
      <TimerProvider>
        <div className="min-h-dvh">
          {/* Sidebar desktop */}
          <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-card p-4 md:flex">
            <Link href="/dashboard" className="mb-6 flex items-center gap-3 px-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">中</span>
              <span className="leading-tight"><span className="block text-sm font-bold">Mandarin OS</span><span className="text-xs text-muted-foreground">1 Month = 1 HSK Level</span></span>
            </Link>
            <nav className="flex-1 space-y-1 overflow-y-auto">{NAV.map((n) => link(n))}</nav>
            <div className="mt-3 border-t pt-3">
              <p className="truncate px-3 text-xs text-muted-foreground">{email}</p>
              <button onClick={signOut} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"><LogOut className="h-5 w-5" />Sign out</button>
            </div>
          </aside>

          <div className="md:pl-64">
            <header className="safe-top sticky top-0 z-30 flex items-center justify-between border-b bg-background/85 px-4 py-2.5 backdrop-blur md:px-8">
              <span className="flex items-center gap-2 md:hidden"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">中</span><span className="text-sm font-bold">Mandarin OS</span></span>
              <span className="hidden md:block" />
              <div className="flex items-center gap-1.5">
                <TimerPill />
                <Button className="hidden md:inline-flex" onClick={() => openEntry()}><Plus className="h-4 w-4" />Add Study</Button>
                <ThemeToggle />
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu" onClick={() => setMenu(true)}><Menu className="h-5 w-5" /></Button>
              </div>
            </header>
            <main className="mx-auto max-w-6xl px-4 py-5 pb-32 md:px-8 md:pb-10">{children}</main>
          </div>

          {/* Bottom nav mobile */}
          <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur md:hidden" aria-label="Primary">
            <ul className="grid grid-cols-5 items-end px-2 pt-1.5">
              {BOTTOM.map((n, i) =>
                n === null ? (
                  <li key="add" className="flex justify-center">
                    <button onClick={() => openEntry()} aria-label="Add Study" className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background"><Plus className="h-7 w-7" /></button>
                  </li>
                ) : (
                  <li key={n.href}>
                    <Link href={n.href} className={cn('flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium', active(n.href) ? 'text-primary' : 'text-muted-foreground')}>
                      <n.icon className="h-5 w-5" />{n.label.split(' ')[0]}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>

          {/* Drawer mobile */}
          {menu && (
            <div className="fixed inset-0 z-50 md:hidden">
              <div className="absolute inset-0 bg-black/50" onClick={() => setMenu(false)} />
              <div className="safe-top absolute inset-y-0 right-0 flex w-72 flex-col bg-card p-4 shadow-xl">
                <div className="mb-3 flex items-center justify-between"><span className="font-bold">Menu</span><Button variant="ghost" size="icon" aria-label="Close menu" onClick={() => setMenu(false)}><X className="h-5 w-5" /></Button></div>
                <nav className="flex-1 space-y-1 overflow-y-auto">{NAV.map((n) => link(n, () => setMenu(false)))}</nav>
                <p className="mt-2 truncate px-3 text-xs text-muted-foreground">{email}</p>
                <button onClick={signOut} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"><LogOut className="h-5 w-5" />Sign out</button>
              </div>
            </div>
          )}

          <StudyEntryDialog open={entry.open} session={entry.session} onClose={() => setEntry({ open: false })} />
        </div>
      </TimerProvider>
    </AppProvider>
  );
}
