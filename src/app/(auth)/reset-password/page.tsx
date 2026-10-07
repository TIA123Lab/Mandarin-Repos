'use client';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { RecordForm, type Field } from '@/components/record-form';

const fields: Field[] = [
  { name: 'password', label: 'New password', type: 'password', required: true, minLength: 8, autoComplete: 'new-password' },
  { name: 'confirm', label: 'Confirm new password', type: 'password', required: true, autoComplete: 'new-password' },
];

export default function ResetPasswordPage() {
  const router = useRouter();
  return (
    <>
      <h2 className="mb-4 text-lg font-semibold">Set a new password</h2>
      <RecordForm fields={fields} submitLabel="Update password"
        extraValidate={(v) => (v.password !== v.confirm ? { confirm: 'Passwords do not match.' } : {})}
        onSubmit={async (v) => {
          const { error } = await createClient().auth.updateUser({ password: v.password });
          if (error) return error.message;
          router.replace('/dashboard');
          router.refresh();
        }} />
    </>
  );
}
