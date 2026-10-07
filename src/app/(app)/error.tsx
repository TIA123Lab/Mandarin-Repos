'use client';
import { ErrorState } from '@/components/ui/states';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState message={error.message} onRetry={reset} />;
}
