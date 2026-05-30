import type { Priority } from "@/hooks/useTasks"

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  low:    { label: "Low",    color: "#6B7280", bg: "#F3F4F6" },
  medium: { label: "Medium", color: "#3B82F6", bg: "#EFF6FF" },
  high:   { label: "High",   color: "#F97316", bg: "#FFF7ED" },
  urgent: { label: "Urgent", color: "#EF4444", bg: "#FEF2F2" },
}
