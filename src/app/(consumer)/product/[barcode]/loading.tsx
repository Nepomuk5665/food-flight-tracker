export default function ProductLoading() {
  return (
    <div className="space-y-4 animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent">
      <div className="mb-2 h-5 w-16 bg-surface-dim" />

      <div className="flex h-10 w-full gap-1 bg-surface-dim p-1" />

      <div className="space-y-4 border border-border bg-white p-4">
        <div className="space-y-2">
          <div className="h-8 w-3/4 bg-surface-dim" />
          <div className="h-4 w-1/2 bg-surface-dim" />
          <div className="h-4 w-1/3 bg-surface-dim" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-24 bg-surface-dim" />
        </div>
      </div>

      <div className="grid gap-4 border border-border bg-white p-4 sm:grid-cols-[140px_1fr]">
        <div className="min-h-[140px] bg-surface-dim" />
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-3 w-20 bg-surface-dim" />
            <div className="h-4 w-32 bg-surface-dim" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-16 bg-surface-dim" />
            <div className="flex gap-2">
              <div className="h-6 w-16 bg-surface-dim" />
              <div className="h-6 w-20 bg-surface-dim" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-24 bg-surface-dim" />
            <div className="h-6 w-32 bg-surface-dim" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3 border border-border bg-surface p-4">
          <div className="h-3 w-20 bg-surface-dim" />
          <div className="h-12 w-20 bg-surface-dim" />
        </div>
        <div className="space-y-3 border border-border bg-surface p-4">
          <div className="h-3 w-20 bg-surface-dim" />
          <div className="h-12 w-20 bg-surface-dim" />
        </div>
      </div>

      <div className="space-y-4 border border-border bg-surface p-4">
        <div className="space-y-2">
          <div className="h-3 w-24 bg-surface-dim" />
          <div className="flex flex-wrap gap-2">
            <div className="h-6 w-20 bg-surface-dim" />
            <div className="h-6 w-24 bg-surface-dim" />
            <div className="h-6 w-16 bg-surface-dim" />
            <div className="h-6 w-32 bg-surface-dim" />
            <div className="h-6 w-20 bg-surface-dim" />
          </div>
        </div>
      </div>
    </div>
  );
}
