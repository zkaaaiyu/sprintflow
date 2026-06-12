import type { Priority } from "@/hooks/useTasks"

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  low:    { label: "Low",    color: "white", bg: "rgba(149, 144, 142, 0.85)" },
  medium: { label: "Medium", color: "white", bg: "rgba(125, 153, 177, 0.85)" },
  high:   { label: "High",   color: "white", bg: "rgba(181, 132, 119, 0.85)" },
  urgent: { label: "Urgent", color: "white", bg: "rgba(179, 82, 82, 0.85)" },
}