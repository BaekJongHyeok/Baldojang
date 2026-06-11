import { Spinner } from "../spinner";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

const variantStyles = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  secondary: "bg-warm-100 text-ink hover:bg-warm-200",
  ghost: "text-ink-secondary hover:bg-warm-100",
  destructive: "bg-status-danger text-white hover:opacity-90",
} as const;

const sizeStyles = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-[10px]",
  md: "h-10 px-4 text-[15px] gap-2 rounded-button",
  lg: "h-12 px-6 text-[15px] gap-2 rounded-button",
} as const;

export function Button({
  variant = "primary",
  size = "md",
  loading,
  children,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 ease-out press-scale disabled:opacity-50 disabled:pointer-events-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
