export default function CalendarLoading() {
  return (
    <div className="animate-pulse -mx-4 -mt-5 sm:-mx-6 lg:-mx-8 lg:-mt-6">
      <div className="border-b border-border bg-white px-4 py-2.5 lg:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-14 rounded-md bg-border-light" />
            <div className="h-7 w-16 rounded-md bg-border-light" />
            <div className="hidden h-5 w-32 rounded bg-border-light sm:block" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-16 rounded-md bg-border-light" />
            <div className="hidden h-7 w-20 rounded-md bg-border-light lg:block" />
          </div>
        </div>
      </div>
      <div className="bg-white px-2 pt-2">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex" style={{ height: 48 }}>
            <div className="w-[48px] lg:w-[56px] shrink-0" />
            <div className="flex-1 border-t border-border-light" />
          </div>
        ))}
      </div>
    </div>
  );
}
