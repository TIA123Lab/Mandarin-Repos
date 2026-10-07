'use client';
import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '@/lib/app-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/controls';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/page-header';
import { FormDialog, type Field } from '@/components/record-form';
import { ScoreLine } from '@/components/charts';

const sb = createClient();

export interface TrackerConfig {
  table: string; title: string; subtitle: string; singular: string;
  fields: Field[];
  render: (row: any) => React.ReactNode;
  searchFields: string[];
  sorts: { value: string; label: string }[];
  /** options kosong → diambil dari nilai unik di database */
  filters?: { field: string; label: string; options?: { value: string; label: string }[] }[];
  chart?: { field: string; dateField: string; label: string; max: number };
  statsColumns?: string;
  stats?: (rows: any[]) => { label: string; value: string }[];
  transform?: (values: Record<string, any>) => Record<string, any>;
  headerExtra?: React.ReactNode;
  pageSize?: number;
}

function DistinctSelect({ table, field, label, value, onChange }: { table: string; field: string; label: string; value: string; onChange: (v: string) => void }) {
  const { data } = useQuery({
    queryKey: ['distinct', table, field],
    queryFn: async () => {
      const { data, error } = await sb.from(table).select(field).not(field, 'is', null).limit(1000);
      if (error) throw error;
      return Array.from(new Set((data as any[]).map((r) => String(r[field])))).sort();
    },
  });
  return (
    <Select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="sm:w-44">
      <option value="">{label}: all</option>
      {data?.map((v) => <option key={v} value={v}>{v}</option>)}
    </Select>
  );
}

export function TrackerPage({ config }: { config: TrackerConfig }) {
  const { userId } = useApp();
  const qc = useQueryClient();
  const { toast } = useToast();
  const size = config.pageSize ?? 15;
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [sort, setSort] = useState(config.sorts[0].value);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<any | 'new' | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setTerm(search.trim().replace(/[,()%*]/g, ' ').trim()); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const list = useQuery({
    queryKey: ['rows', config.table, term, sort, filters, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let q = sb.from(config.table).select('*', { count: 'exact' }).eq('user_id', userId);
      if (term) q = q.or(config.searchFields.map((f) => `${f}.ilike.%${term}%`).join(','));
      for (const [k, v] of Object.entries(filters)) if (v) q = q.eq(k, v);
      const [col, dir] = sort.split('.');
      q = q.order(col, { ascending: dir === 'asc' });
      if (col !== 'created_at') q = q.order('created_at', { ascending: false });
      const { data, count, error } = await q.range(page * size, page * size + size - 1);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  const stats = useQuery({
    queryKey: ['stats', config.table],
    enabled: !!config.stats,
    queryFn: async () => {
      const { data, error } = await sb.from(config.table).select(config.statsColumns!).eq('user_id', userId).limit(5000);
      if (error) throw error;
      return data as any[];
    },
  });

  const chart = useQuery({
    queryKey: ['chart', config.table],
    enabled: !!config.chart,
    queryFn: async () => {
      const c = config.chart!;
      const { data, error } = await sb.from(config.table).select(`${c.dateField},${c.field}`).eq('user_id', userId)
        .not(c.field, 'is', null).order(c.dateField, { ascending: false }).limit(30);
      if (error) throw error;
      return (data as any[]).reverse().map((r) => ({ label: String(r[c.dateField]).slice(5), value: Number(r[c.field]) }));
    },
  });

  async function submit(values: Record<string, any>) {
    const payload = config.transform ? config.transform(values) : values;
    const { error } = editing === 'new'
      ? await sb.from(config.table).insert({ ...payload, user_id: userId })
      : await sb.from(config.table).update(payload).eq('id', editing.id);
    if (error) return error.code === '23505' ? 'This entry already exists.' : error.message;
    qc.invalidateQueries();
    toast({ title: `${config.singular} ${editing === 'new' ? 'added' : 'updated'}`, kind: 'success' });
    setEditing(null);
  }

  async function remove(row: any) {
    if (!window.confirm(`Delete this ${config.singular.toLowerCase()}?`)) return;
    const { error } = await sb.from(config.table).delete().eq('id', row.id);
    if (error) { toast({ title: 'Delete failed', description: error.message, kind: 'error' }); return; }
    qc.invalidateQueries();
    toast({ title: `${config.singular} deleted` });
  }

  const total = list.data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / size));
  const hasFilter = !!term || Object.values(filters).some(Boolean);
  const statItems = stats.data && config.stats ? config.stats(stats.data) : [];

  return (
    <div>
      <PageHeader title={config.title} subtitle={config.subtitle}
        actions={<>{config.headerExtra}<Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" />Add {config.singular}</Button></>} />

      {statItems.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {statItems.map((s) => (
            <Card key={s.label} className="px-4 py-3"><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold tabular-nums">{s.value}</p></Card>
          ))}
        </div>
      )}

      {config.chart && chart.data && chart.data.length > 1 && (
        <Card className="mb-4">
          <CardHeader><CardTitle>{config.chart.label} progress (last {chart.data.length} entries)</CardTitle></CardHeader>
          <CardContent className="pt-2"><ScoreLine data={chart.data} max={config.chart.max} name={config.chart.label} /></CardContent>
        </Card>
      )}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search" placeholder="Search…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {config.filters?.map((f) =>
          f.options ? (
            <Select key={f.field} aria-label={f.label} className="sm:w-40" value={filters[f.field] ?? ''} onChange={(e) => { setFilters((x) => ({ ...x, [f.field]: e.target.value })); setPage(0); }}>
              <option value="">{f.label}: all</option>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          ) : (
            <DistinctSelect key={f.field} table={config.table} field={f.field} label={f.label} value={filters[f.field] ?? ''} onChange={(v) => { setFilters((x) => ({ ...x, [f.field]: v })); setPage(0); }} />
          ),
        )}
        <Select aria-label="Sort" className="sm:w-44" value={sort} onChange={(e) => { setSort(e.target.value); setPage(0); }}>
          {config.sorts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
      </div>

      {list.isError ? (
        <ErrorState message={(list.error as Error).message} onRetry={() => list.refetch()} />
      ) : list.isLoading ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : list.data && list.data.rows.length === 0 ? (
        <EmptyState
          title={hasFilter ? 'Tidak ada hasil' : `Belum ada ${config.singular.toLowerCase()}`}
          description={hasFilter ? 'Coba ubah kata kunci atau filter.' : `Tambahkan ${config.singular.toLowerCase()} pertamamu.`}
          action={!hasFilter && <Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" />Add {config.singular}</Button>}
        />
      ) : (
        <div className={`space-y-3 ${list.isPlaceholderData ? 'opacity-60' : ''}`}>
          {list.data?.rows.map((row: any) => (
            <Card key={row.id} className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">{config.render(row)}</div>
              <div className="flex shrink-0">
                <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => setEditing(row)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => remove(row)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </Card>
          ))}
          {pages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" />Prev</Button>
              <span className="text-xs text-muted-foreground">Page {page + 1} of {pages} · {total} items</span>
              <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next<ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}
        </div>
      )}

      <FormDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? `Add ${config.singular}` : `Edit ${config.singular}`}
        fields={config.fields}
        initial={editing && editing !== 'new' ? editing : undefined}
        onSubmit={submit}
      />
    </div>
  );
}

export const Meta = ({ items }: { items: (string | null | undefined | false)[] }) => (
  <p className="mt-0.5 text-xs text-muted-foreground">{items.filter(Boolean).join(' · ')}</p>
);
export const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{children}</span>
);
