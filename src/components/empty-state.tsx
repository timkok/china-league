import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon,
  actionHref,
  actionLabel,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-md border border-dashed bg-muted/30 px-6 py-10 text-center",
        className
      )}
    >
      {icon && <div className="mb-3 text-3xl" aria-hidden>{icon}</div>}
      <div className="text-sm font-medium">{title}</div>
      {description && (
        <p className="mt-1 max-w-md text-xs text-muted-foreground">{description}</p>
      )}
      {actionHref && (
        <Link
          href={actionHref}
          className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {actionLabel ?? "查看更多"}
        </Link>
      )}
    </div>
  );
}
