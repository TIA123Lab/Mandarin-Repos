'use client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/controls';
import { Dialog } from '@/components/ui/dialog';
import { isValidISODate, todayISO } from '@/lib/dates';

export type FieldType = 'text' | 'email' | 'password' | 'textarea' | 'number' | 'date' | 'time' | 'select' | 'checkbox';
export interface Field {
  name: string; label: string; type?: FieldType; required?: boolean;
  min?: number; max?: number; step?: number; int?: boolean; minLength?: number; maxLength?: number;
  options?: { value: string; label: string }[]; placeholder?: string; hint?: string;
  half?: boolean; rows?: number; autoComplete?: string; noFuture?: boolean;
}
type Values = Record<string, any>;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function initValues(fields: Field[], initial?: Values): Values {
  const v: Values = {};
  for (const f of fields) {
    const raw = initial?.[f.name];
    if (f.type === 'checkbox') v[f.name] = Boolean(raw ?? false);
    else if (raw === null || raw === undefined) v[f.name] = f.type === 'date' && f.required ? todayISO() : '';
    else v[f.name] = f.type === 'time' ? String(raw).slice(0, 5) : String(raw);
  }
  return v;
}

export function validateFields(fields: Field[], values: Values): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const v = values[f.name];
    const blank = v === '' || v === null || v === undefined;
    if (f.type === 'checkbox') continue;
    if (blank) { if (f.required) errors[f.name] = `${f.label} is required.`; continue; }
    const s = String(v);
    if (f.type === 'number') {
      const n = Number(s);
      if (!Number.isFinite(n)) errors[f.name] = `${f.label} must be a number.`;
      else if (f.int && !Number.isInteger(n)) errors[f.name] = `${f.label} must be a whole number.`;
      else if (f.min !== undefined && n < f.min) errors[f.name] = `${f.label} must be at least ${f.min}.`;
      else if (f.max !== undefined && n > f.max) errors[f.name] = `${f.label} must be at most ${f.max}.`;
    } else if (f.type === 'date') {
      if (!isValidISODate(s)) errors[f.name] = `${f.label} is not a valid date.`;
      else if (f.noFuture && s > todayISO()) errors[f.name] = `${f.label} cannot be in the future.`;
    } else if (f.type === 'email') {
      if (!EMAIL_RE.test(s.trim())) errors[f.name] = 'Enter a valid email address.';
    } else if (f.type === 'select' && f.options && !f.options.some((o) => o.value === s)) {
      errors[f.name] = `Choose a valid ${f.label.toLowerCase()}.`;
    }
    if (!errors[f.name] && f.minLength && s.trim().length < f.minLength) errors[f.name] = `${f.label} must be at least ${f.minLength} characters.`;
    if (!errors[f.name] && f.maxLength && s.length > f.maxLength) errors[f.name] = `${f.label} must be at most ${f.maxLength} characters.`;
    if (!errors[f.name] && f.required && f.type !== 'password' && s.trim() === '') errors[f.name] = `${f.label} is required.`;
  }
  return errors;
}

function coerce(fields: Field[], values: Values): Values {
  const out: Values = {};
  for (const f of fields) {
    const v = values[f.name];
    if (f.type === 'checkbox') out[f.name] = Boolean(v);
    else if (v === '' || v === null || v === undefined) out[f.name] = null;
    else if (f.type === 'number') out[f.name] = Number(v);
    else if (f.type === 'password') out[f.name] = String(v);
    else out[f.name] = String(v).trim();
  }
  return out;
}

interface Props {
  fields: Field[]; initial?: Values; submitLabel?: string; onCancel?: () => void;
  /** Return a string to show as form error; return nothing on success. Receives typed values. */
  onSubmit: (values: Values, raw: Values) => Promise<string | void>;
  extraValidate?: (raw: Values) => Record<string, string>;
}

export function RecordForm({ fields, initial, submitLabel = 'Save', onCancel, onSubmit, extraValidate }: Props) {
  const [values, setValues] = useState<Values>(() => initValues(fields, initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (name: string, v: any) => {
    setValues((x) => ({ ...x, [name]: v }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: '' }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs = { ...validateFields(fields, values), ...(extraValidate?.(values) ?? {}) };
    Object.keys(errs).forEach((k) => !errs[k] && delete errs[k]);
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const msg = await onSubmit(coerce(fields, values), values);
      if (msg) setFormError(msg);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        const id = `f-${f.name}`;
        const err = errors[f.name];
        const span = f.half ? '' : 'sm:col-span-2';
        if (f.type === 'checkbox') {
          return (
            <label key={f.name} htmlFor={id} className={`flex cursor-pointer items-center gap-3 text-sm font-medium ${span}`}>
              <input id={id} type="checkbox" className="h-5 w-5 accent-[hsl(var(--primary))]" checked={values[f.name]} onChange={(e) => set(f.name, e.target.checked)} />
              {f.label}
            </label>
          );
        }
        const common = { id, name: f.name, 'aria-invalid': !!err, placeholder: f.placeholder, autoComplete: f.autoComplete };
        return (
          <div key={f.name} className={span}>
            <Label htmlFor={id}>{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
            {f.type === 'textarea' ? (
              <Textarea {...common} rows={f.rows ?? 3} value={values[f.name]} onChange={(e) => set(f.name, e.target.value)} />
            ) : f.type === 'select' ? (
              <Select {...common} value={values[f.name]} onChange={(e) => set(f.name, e.target.value)}>
                {!f.required && <option value="">—</option>}
                {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            ) : (
              <Input
                {...common}
                type={f.type === 'number' ? 'number' : f.type ?? 'text'}
                inputMode={f.type === 'number' ? (f.int ? 'numeric' : 'decimal') : undefined}
                step={f.type === 'number' ? f.step ?? (f.int ? 1 : 'any') : undefined}
                value={values[f.name]}
                onChange={(e) => set(f.name, e.target.value)}
              />
            )}
            {f.hint && !err && <p className="mt-1 text-xs text-muted-foreground">{f.hint}</p>}
            {err && <p className="mt-1 text-xs font-medium text-destructive" role="alert">{err}</p>}
          </div>
        );
      })}
      {formError && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive sm:col-span-2" role="alert">{formError}</p>}
      <div className="flex justify-end gap-2 pt-1 sm:col-span-2">
        {onCancel && <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>}
        <Button type="submit" disabled={busy} className="min-w-28">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}{submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function FormDialog({ open, onClose, title, ...props }: Props & { open: boolean; onClose: () => void; title: string }) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      {/* key memaksa form di-reset setiap kali dialog dibuka */}
      <RecordForm key={String(open) + JSON.stringify(props.initial ?? {})} {...props} onCancel={onClose} />
    </Dialog>
  );
}
