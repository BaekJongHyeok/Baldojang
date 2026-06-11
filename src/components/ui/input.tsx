type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({
  label,
  error,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[13px] font-medium text-ink-secondary"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`h-10 rounded-input border border-border bg-surface-card px-3 text-[15px] text-ink placeholder:text-ink-faint outline-none transition-colors duration-150 focus:border-accent focus:ring-1 focus:ring-accent/20 ${error ? "border-status-danger" : ""} ${className}`}
        {...props}
      />
      {error && <p className="text-[13px] text-status-danger">{error}</p>}
    </div>
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
};

export function Select({
  label,
  className = "",
  id,
  children,
  ...props
}: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="text-[13px] font-medium text-ink-secondary"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`h-10 rounded-input border border-border bg-surface-card px-3 text-[15px] text-ink outline-none transition-colors duration-150 focus:border-accent focus:ring-1 focus:ring-accent/20 ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
