import type { SprintStatus } from "@/hooks/useSprints"

export const SPRINT_STATUS_CONFIG: Record<SprintStatus, { label: string; color: string; bg: string }> = {
  planning:  { label: "Planning",  color: "white", bg: "#8A8480" },
  active:    { label: "Active",    color: "white", bg: "var(--brand)" },
  completed: { label: "Completed", color: "white", bg: "#5A8A78" },
}
