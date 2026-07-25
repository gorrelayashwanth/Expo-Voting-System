import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "healthy" | "down" | "success" | "error" | string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const ok = status === "healthy" || status === "success" || status === "up";
  const text = label ?? (ok ? "Up" : "Down");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        ok
          ? "bg-success text-success-foreground"
          : "bg-danger text-danger-foreground",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {text}
    </span>
  );
}
