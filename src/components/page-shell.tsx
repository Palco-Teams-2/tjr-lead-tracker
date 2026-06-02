export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-sidebar p-2">
      <div className="min-h-[calc(100svh-1rem)] rounded-xl bg-white p-6">{children}</div>
    </div>
  );
}
