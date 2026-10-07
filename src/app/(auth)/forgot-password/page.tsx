'use client';
import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RecordForm, type Field } from '@/components/record-form';

const fields: Field[] = [{ name: 'email', label: 'Email', type: 'email', required: true, autoComplete: 'email' }];

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  return (
    <>
      <h2 className="mb-1 text-lg font-semibold">Forgot Password</h2>
      {sent ? (
        <p className="mt-3 rounded-xl bg-jade/15 px-3 py-3 text-sm">Jika email terdaftar, link reset password sudah dikirim. Cek inbox (dan folder spam).</p>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">Masukkan email, kami kirim link untuk membuat password baru.</p>
          <RecordForm fields={fields} submitLabel="Send reset link" onSubmit={async (v) => {
            const { error } = await createClient().auth.resetPasswordForEmail(v.email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` });
            if (error) return error.message;
            setSent(true);
          }} />
        </>
      )}
      <Link href="/login" className="mt-4 inline-block text-sm text-primary hover:underline">Back to login</Link>
    </>
  );
}
