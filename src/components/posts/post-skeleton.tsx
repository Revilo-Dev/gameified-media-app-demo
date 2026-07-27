export function PostSkeleton() {
  return (
    <div className="rounded-[1.75rem] border border-border bg-surface p-4">
      <div className="flex gap-3">
        <div className="skeleton h-10 w-10 rounded-2xl" />
        <div className="flex-1 space-y-3">
          <div className="space-y-2">
            <div className="skeleton h-4 w-40 rounded-full" />
            <div className="skeleton h-3 w-28 rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="skeleton h-3 w-full rounded-full" />
            <div className="skeleton h-3 w-[92%] rounded-full" />
            <div className="skeleton h-3 w-[64%] rounded-full" />
          </div>
          <div className="skeleton h-48 w-full rounded-3xl" />
          <div className="flex gap-2">
            <div className="skeleton h-8 w-28 rounded-full" />
            <div className="skeleton h-8 w-20 rounded-full" />
            <div className="skeleton h-8 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
