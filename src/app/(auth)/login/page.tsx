'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RecordForm, type Field } from '@/components/record-form';

const fields: Field[] = [
  { name: 'email', label: 'Email', type: 'email', required: true, autoComplete: 'email' },
  { name: 'password', label: 'Password', type: 'password', required: true, autoComplete: 'current-password' },
];

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  return (
    <>
      <h2 className="mb-4 text-lg font-semibold">Login</h2>
      {params.get('error') && <p className="mb-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">Link tidak valid atau sudah kedaluwarsa. Silakan coba lagi.</p>}
      <RecordForm fields={fields} submitLabel="Login" onSubmit={async (v) => {
        const { error } = await createClient().auth.signInWithPassword({ email: v.email, password: v.password });
        if (error) return error.message === 'Invalid login credentials' ? 'Email atau password salah.' : error.message;
        router.replace('/dashboard');
        router.refresh();
      }} />
      <div className="mt-4 flex justify-between text-sm">
        <Link href="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
        <Link href="/register" className="text-primary hover:underline">Create account</Link>
      </div>
    </>
  );
}
export default function LoginPage() { return <Suspense><LoginForm /></Suspense>; }
