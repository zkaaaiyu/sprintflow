// dashboard 左上角即將到期任務
import { useNavigate } from "react-router-dom"
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

  if (diff < 0)  return { label: "OVERDUE", color: "var(--overdue)" }
  if (diff === 0) return { label: "TODAY",  color: "var(--overdue)" }
  if (diff <= 3)  return { label: dateStr,  color: BRAND }
  return                 { label: dateStr,  color: "var(--muted-foreground)" }
}

const MAX_VISIBLE = 2

export default function UpcomingDeadlines({ tasks }: { tasks: UpcomingTask[] }) {
  const navigate = useNavigate()

  const visibleTasks = tasks.slice(0, MAX_VISIBLE)
  const hiddenTasks  = tasks.slice(MAX_VISIBLE)

  // 隱藏任務中最早到期且有 sprintId 的任務
  const targetTask = hiddenTasks.find((t) => t.sprintId !== null)

  return (
    <div className="flex flex-col min-w-0">
      <p className="text-sm font-semibold mb-3">Upcoming Deadlines</p>

      {tasks.length === 0 ? (
        <p className="text-xs text-muted-foreground mt-2">No deadlines in the next 7 days</p>
      ) : (
        <div className="space-y-1">
          {visibleTasks.map((task) => {
            const { label, color } = formatDueDate(task.dueDate)
            const canNavigate = task.sprintId !== null
            return (
              <div
                key={task.id}
                onClick={() => canNavigate && navigate(`/projects/${task.projectId}/sprints/${task.sprintId}`)}
                className={`flex items-center justify-between gap-3 px-2 py-2 rounded-lg transition-all ${canNavigate ? "cursor-pointer hover:scale-[1.02]" : ""}`}
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

          {/* 超過 3 筆時顯示「view N more」連結，靠右對齊 */}
          {hiddenTasks.length > 0 && targetTask && (
            <div className="flex justify-center pt-1">
              <button
                onClick={() => navigate(`/projects/${targetTask.projectId}/sprints/${targetTask.sprintId}`)}
                className="text-[11px] text-muted-foreground hover:text-brand hover:scale-110 transition-all inline-block"
              >
                view {hiddenTasks.length} more task{hiddenTasks.length > 1 ? "s" : ""} in sprint →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
