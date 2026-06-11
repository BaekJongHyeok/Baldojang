type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ label, error, className = "", id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={inputId} className="text-[12px] font-medium text-ink-secondary">{label}</label>}
      <input
        id={inputId}
        className={`h-9 rounded-md border border-border bg-white px-3 text-[14px] text-ink placeholder:text-ink-disabled outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20 ${error ? "border-danger" : ""} ${className}`}
        {...props}
      />
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
};

export function Select({ label, className = "", id, children, ...props }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={selectId} className="text-[12px] font-medium text-ink-secondary">{label}</label>}
      <select
        id={selectId}
        className={`h-9 rounded-md border border-border bg-white px-3 text-[14px] text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20 ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
