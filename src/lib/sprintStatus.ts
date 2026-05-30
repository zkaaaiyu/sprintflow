import type { SprintStatus } from "@/hooks/useSprints"

export const SPRINT_STATUS_CONFIG: Record<SprintStatus, { label: string; color: string; bg: string }> = {
  planning:  { label: "Planning",  color: "#6B7280", bg: "#F3F4F6" },
  active:    { label: "Active",    color: "#CF7749", bg: "#FFF7ED" },
  completed: { label: "Completed", color: "#6F9E8A", bg: "#ECFDF5" },
}
