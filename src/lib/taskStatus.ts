import type { TaskStatus } from "@/hooks/useTasks"

export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  todo:        { label: "To Do",       color: "#6B7280", bg: "#F3F4F6" },
  in_progress: { label: "In Progress", color: "#688CB7", bg: "#EFF6FF" },
  review:      { label: "Review",      color: "#837DAF", bg: "#F5F3FF" },
  done:        { label: "Done",        color: "#6F9E8A", bg: "#ECFDF5" },
}
