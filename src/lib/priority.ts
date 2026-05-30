import type { Priority } from "@/hooks/useTasks"

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  low:    { label: "Low",    color: "#6B7280", bg: "#F3F4F6" },
  medium: { label: "Medium", color: "#688CB7", bg: "#EFF6FF" },
  high:   { label: "High",   color: "#D87A4A", bg: "#FFF7ED" },
  urgent: { label: "Urgent", color: "#D86464", bg: "#FEF2F2" },
}
