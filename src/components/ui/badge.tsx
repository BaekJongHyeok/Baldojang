type BadgeProps = {
  variant?: "default" | "success" | "warning" | "danger" | "info";
  children: React.ReactNode;
  className?: string;
};

const variantStyles = {
  default: "bg-warm-100 text-ink-secondary",
  success: "bg-status-success-subtle text-status-success",
  warning: "bg-status-warning-subtle text-status-warning",
  danger: "bg-status-danger-subtle text-status-danger",
  info: "bg-status-info-subtle text-status-info",
} as const;

export function Badge({
  variant = "default",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-badge px-2 py-0.5 text-[11px] font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
