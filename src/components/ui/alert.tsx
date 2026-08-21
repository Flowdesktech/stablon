import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  neutral: {
    icon: Info,
    className: "border-border bg-surface-muted text-foreground",
    iconClassName: "text-muted-foreground",
  },
  info: {
    icon: Info,
    className: "border-info/25 bg-info-muted text-foreground",
    iconClassName: "text-info",
  },
  success: {
    icon: CheckCircle2,
    className: "border-success/25 bg-success-muted text-foreground",
    iconClassName: "text-success",
  },
  warning: {
    icon: TriangleAlert,
    className: "border-warning/25 bg-warning-muted text-foreground",
    iconClassName: "text-warning",
  },
  danger: {
    icon: AlertCircle,
    className: "border-danger/25 bg-danger-muted text-foreground",
    iconClassName: "text-danger",
  },
} satisfies Record<
  string,
  { icon: LucideIcon; className: string; iconClassName: string }
>;

export function Alert({
  title,
  description,
  variant = "neutral",
  action,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  variant?: keyof typeof variants;
  action?: React.ReactNode;
  className?: string;
}) {
  const config = variants[variant];
  const Icon = config.icon;
  return (
    <div
      role={variant === "danger" ? "alert" : "status"}
      className={cn(
        "flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-start",
        config.className,
        className
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", config.iconClassName)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
