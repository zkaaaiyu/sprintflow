// getDaysRemaining — 依到期日算出剩餘天數的顯示文字與顏色
import { BRAND } from "@/lib/colors"

export function getDaysRemaining(dueDate: Date): { label: string; color: string } {
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0)
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0)   return { label: "Overdue",       color: "var(--overdue)" }
  if (diff === 0) return { label: "Due today",     color: "var(--overdue)" }
  if (diff <= 3)  return { label: `${diff}d left`, color: BRAND }
  return               { label: `${diff}d left`, color: "var(--muted-foreground)" }
}
