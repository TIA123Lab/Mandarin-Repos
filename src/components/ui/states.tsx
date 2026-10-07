import { AlertTriangle, Inbox } from 'lucide-react';
import { Button } from './button';
import { Card } from './card';
import { cn } from '@/lib/utils';

export const Skeleton = ({ className }: { className?: string }) => <div className={cn('animate-pulse rounded-xl bg-muted', className)} />;

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <Inbox className="h-8 w-8 text-muted-foreground" />
      <p className="font-semibold">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </Card>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-2 border-destructive/40 px-6 py-10 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <p className="font-semibold">Data tidak bisa dimuat</p>
      <p className="max-w-md text-sm text-muted-foreground">{message ?? 'Terjadi kesalahan. Periksa koneksi internet dan konfigurasi Supabase, lalu coba lagi.'}</p>
      {onRetry && <Button variant="outline" onClick={onRetry} className="mt-2">Try again</Button>}
    </Card>
  );
}
