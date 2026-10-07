'use client';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

interface T { id: number; title: string; description?: string; kind?: 'success' | 'error' | 'info' }
const Ctx = createContext<{ toast: (t: Omit<T, 'id'>) => void }>({ toast: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<T[]>([]);
  const toast = useCallback((t: Omit<T, 'id'>) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { ...t, id }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 4500);
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={cn('pointer-events-auto w-full max-w-sm rounded-2xl border bg-card px-4 py-3 shadow-lg', t.kind === 'error' && 'border-destructive/60', t.kind === 'success' && 'border-jade/60')}>
            <p className="text-sm font-semibold">{t.title}</p>
            {t.description && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
