import Link from "next/link";
import { Button } from "./button";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  action?: { label: string; onClick: () => void } | { label: string; href: string };
};

export function EmptyState({ icon, title, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      {icon && <div className="mb-2 text-ink-disabled">{icon}</div>}
      <p className="text-[14px] text-ink-caption">{title}</p>
      {action && ("href" in action ? (
        <Link href={action.href} className="mt-3">
          <Button variant="secondary" size="sm">{action.label}</Button>
        </Link>
      ) : (
        <Button variant="secondary" size="sm" className="mt-3" onClick={action.onClick}>{action.label}</Button>
      ))}
    </div>
  );
}
