export default function RetentionLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-32 rounded bg-border-light" />
      <div className="mt-5 flex flex-col gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-lg border border-border bg-white" />
        ))}
      </div>
    </div>
  );
}
