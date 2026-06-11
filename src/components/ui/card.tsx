type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  padding?: "none" | "sm" | "md";
};

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-5",
} as const;

export function Card({
  padding = "md",
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-card bg-surface-card ${paddingStyles[padding]} ${className}`}
      {...props}
    />
  );
}
