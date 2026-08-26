import type { ReactNode } from "react";
import type { Readiness, Status } from "@/types/auth";

const STATUS_STYLES: Record<Status, string> = {
  Draft: "bg-slate-100 text-slate-600",
  "In Review": "bg-blue-100 text-blue-700",
  Prepared: "bg-violet-100 text-violet-700",
  "Documentation Complete": "bg-emerald-100 text-emerald-700",
  Returned: "bg-red-100 text-red-700",
};

const READINESS_STYLES: Record<Readiness, { badge: string; dot: string }> = {
  Ready: { badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  "Needs Review": { badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  "Not Ready": { badge: "bg-red-100 text-red-700", dot: "bg-red-500" },
};

interface BadgeProps {
  children: ReactNode;
  className?: string;
}

export function Badge({ children, className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  return <Badge className={STATUS_STYLES[status]}>{status}</Badge>;
}

export function ReadinessBadge({ readiness }: { readiness: Readiness }) {
  const styles = READINESS_STYLES[readiness];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
      {readiness}
    </span>
  );
}
