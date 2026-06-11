import type { TaskStatus } from "@/hooks/useTasks"

export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  todo:        { label: "To Do",       color: "white", bg: "rgba(149, 144, 142, 0.85)" },
  in_progress: { label: "In Progress", color: "white", bg: "rgba(181, 132, 119, 0.85)" },
  review:      { label: "Review",      color: "white", bg: "rgba(201, 172, 122, 0.85)" },
  done:        { label: "Done",        color: "white", bg: "rgba(110, 144, 126, 0.85)" },
}
