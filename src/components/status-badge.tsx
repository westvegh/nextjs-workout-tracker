import { Badge } from "@/components/badge";

type Status = "planned" | "in_progress" | "completed" | string | null;

const LABELS: Record<string, string> = {
  planned: "Planned",
  in_progress: "In progress",
  completed: "Completed",
};

export function StatusBadge({ status }: { status: Status }) {
  if (!status) return null;
  const label = LABELS[status] ?? status;
  const variant =
    status === "completed"
      ? "success"
      : status === "in_progress"
      ? "info"
      : "muted";
  return <Badge variant={variant}>{label}</Badge>;
}
