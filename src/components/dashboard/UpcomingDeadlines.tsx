import { BRAND } from "@/lib/colors"
import type { UpcomingTask } from "@/hooks/useUpcomingTasks"

// 計算剩餘天數並回傳顯示用文字與顏色
function formatDueDate(date: Date): { label: string; color: string } {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(date)
  due.setHours(0, 0, 0, 0)
  const diff = Math.ceil((due.getTime() - now.getTime()) / 86400000)

  const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()

  if (diff < 0)  return { label: "OVERDUE", color: "#CC6161" }
  if (diff === 0) return { label: "TODAY",  color: "#CC6161" }
  if (diff <= 3)  return { label: dateStr,  color: BRAND }
  return                 { label: dateStr,  color: "#6B7280" }
}

export default function UpcomingDeadlines({ tasks }: { tasks: UpcomingTask[] }) {
  return (
    <div className="flex flex-col min-w-0">
      <p className="text-sm font-semibold mb-3">Upcoming Deadlines</p>

      {tasks.length === 0 ? (
        <p className="text-xs text-muted-foreground mt-2">No deadlines in the next 7 days</p>
      ) : (
        <div className="space-y-0">
          {tasks.slice(0, 5).map((task) => {
            const { label, color } = formatDueDate(task.dueDate)
            return (
              <div
                key={task.id}
                className="flex items-center justify-between gap-3 py-2.5 border-b border-border last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  {/* 專案名稱 */}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: task.projectColor }}
                    />
                    <p className="text-[11px] text-muted-foreground truncate">{task.projectName}</p>
                  </div>
                </div>
                {/* 到期日標籤 */}
                <span
                  className="text-[11px] font-semibold shrink-0 px-1.5 py-0.5 rounded"
                  style={{ color, backgroundColor: `${color}20` }}
                >
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
