export default function CalendarLoading() {
  return (
    <div className="animate-pulse -mx-4 -mt-6 sm:-mx-6 lg:-mx-8 lg:-mt-8">
      <div className="border-b border-border bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="h-7 w-24 rounded-md bg-border-light" />
          <div className="h-7 w-32 rounded-md bg-border-light" />
          <div className="h-5 w-12 rounded bg-border-light" />
        </div>
        <div className="mt-2 h-5 w-36 rounded bg-border-light" />
      </div>
      <div className="mx-2 mt-2 flex flex-col gap-1">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-[48px] rounded-md bg-border-light" />
        ))}
      </div>
    </div>
  );
}
