export default function SettingsLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-16 rounded bg-border-light" />
      <div className="mt-6 flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg border border-border bg-white" />
        ))}
      </div>
    </div>
  );
}
