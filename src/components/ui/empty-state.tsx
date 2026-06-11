import Link from "next/link";
import { Button } from "./button";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  action?:
    | { label: string; onClick: () => void }
    | { label: string; href: string };
};

export function EmptyState({ icon, title, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      {icon && <div className="mb-3 text-ink-faint">{icon}</div>}
      <p className="text-[15px] text-ink-tertiary">{title}</p>
      {action &&
        ("href" in action ? (
          <Link href={action.href} className="mt-4">
            <Button variant="secondary" size="sm">
              {action.label}
            </Button>
          </Link>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
    </div>
  );
}
