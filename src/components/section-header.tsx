import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
};

export function SectionHeader({
  title,
  subtitle,
  meta,
  actionHref,
  actionLabel,
  className,
}: Props) {
  return (
    <div className={cn("flex flex-col gap-1 md:flex-row md:items-end md:justify-between", className)}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {meta}
        {actionHref && (
          <Link
            href={actionHref}
            className="text-primary underline-offset-4 hover:underline"
          >
            {actionLabel ?? "查看全部 →"}
          </Link>
        )}
      </div>
    </div>
  );
}
