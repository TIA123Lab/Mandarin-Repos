export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">中</span>
          <h1 className="text-2xl font-bold tracking-tight">Mandarin Learning Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">1 Month = 1 HSK Level</p>
        </div>
        <div className="rounded-3xl border bg-card p-6 shadow-sm">{children}</div>
      </div>
    </main>
  );
}
