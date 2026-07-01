import type { SprintStatus } from "@/hooks/useSprints"

//三個 Sprint 狀態對應的顯示文字和顏色

export const SPRINT_STATUS_CONFIG: Record<SprintStatus, { label: string; color: string; bg: string }> = {
  planning:  { label: "Planning",  color: "white", bg: "#8A8480" },
  active:    { label: "Active",    color: "white", bg: "var(--brand)" },
  completed: { label: "Completed", color: "white", bg: "#5A8A78" },
}
