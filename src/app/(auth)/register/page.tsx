'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { RecordForm, type Field } from '@/components/record-form';

const fields: Field[] = [
  { name: 'name', label: 'Name', required: true, maxLength: 60, autoComplete: 'name' },
  { name: 'email', label: 'Email', type: 'email', required: true, autoComplete: 'email' },
  { name: 'password', label: 'Password', type: 'password', required: true, minLength: 8, autoComplete: 'new-password', hint: 'Minimal 8 karakter.' },
  { name: 'confirm', label: 'Confirm Password', type: 'password', required: true, autoComplete: 'new-password' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  if (sent) {
    return (
      <div className="text-center">
        <p className="text-lg font-semibold">Cek email kamu 📬</p>
        <p className="mt-2 text-sm text-muted-foreground">Kami mengirim link konfirmasi. Setelah dikonfirmasi, kamu bisa login.</p>
        <Link href="/login" className="mt-4 inline-block text-sm text-primary hover:underline">Back to login</Link>
      </div>
    );
  }
  return (
    <>
      <h2 className="mb-4 text-lg font-semibold">Register</h2>
      <RecordForm fields={fields} submitLabel="Create account"
        extraValidate={(v) => (v.password !== v.confirm ? { confirm: 'Passwords do not match.' } : {})}
        onSubmit={async (v) => {
          const { data, error } = await createClient().auth.signUp({
            email: v.email, password: v.password,
            options: { data: { name: v.name }, emailRedirectTo: `${window.location.origin}/auth/callback` },
          });
          if (error) return error.message;
          if (data.session) { router.replace('/dashboard'); router.refresh(); } else setSent(true);
        }} />
      <p className="mt-4 text-center text-sm text-muted-foreground">Sudah punya akun? <Link href="/login" className="text-primary hover:underline">Login</Link></p>
    </>
  );
}
