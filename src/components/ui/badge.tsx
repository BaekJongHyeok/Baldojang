type BadgeProps = {
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  children: React.ReactNode;
  className?: string;
};

const variants = {
  default: "bg-border-light text-ink-secondary",
  primary: "bg-primary-light text-primary",
  success: "bg-success-light text-success",
  warning: "bg-warning-light text-warning",
  danger: "bg-danger-light text-danger",
} as const;

export function Badge({ variant = "default", children, className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[11px] font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
