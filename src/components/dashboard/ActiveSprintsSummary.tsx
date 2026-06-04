// dashboard 左下角 active sprint 管理
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Clock } from "lucide-react"
import { BRAND } from "@/lib/colors"
import type { ActiveSprintSummary } from "@/hooks/useActiveSprintsSummary"

type Props = {
  summaries: ActiveSprintSummary[]
  loading: boolean
}

export default function ActiveSprintsSummary({ summaries, loading }: Props) {
  const navigate = useNavigate()
  const [animated, setAnimated] = useState(false)  // 控制進度條動畫

  useEffect(() => {
    if (!loading && summaries.length > 0) {
      const t = setTimeout(() => setAnimated(true), 80)
      return () => clearTimeout(t)
    }
    setAnimated(false)
  }, [loading, summaries.length])

  return (
    <div>
      <div className="mb-4">
        <h3 className="font-semibold text-sm" style={{ color: BRAND }}>Active Sprints</h3>
      </div>

      {loading ? (
        // Skeleton
        <div className="space-y-5">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-3.5 bg-muted rounded w-2/5" />
              <div className="h-2 bg-muted rounded w-full" />
              <div className="h-2.5 bg-muted rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : summaries.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No active sprints</p>
      ) : (
        <div className="space-y-3">
          {summaries.map((s) => (
            // 每個 sprint 用卡片包起來
            <div
              key={s.sprintId}
              className="border border-border rounded-xl p-4 cursor-pointer hover:scale-[1.02] hover:shadow-md transition-all"
              onClick={() => navigate(`/projects/${s.projectId}/sprints/${s.sprintId}`)}
            >
              {/* 標題列：專案名稱 + 剩餘天數 */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  {/* 專案顏色圓點 */}
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.projectColor }} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{s.projectName}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.sprintName}</p>
                  </div>
                </div>

                {/* 剩餘天數 */}
                {s.daysLeft !== null && (
                  <div className={`flex items-center gap-1 shrink-0 text-xs ${s.daysLeft <= 2 ? "text-destructive" : "text-muted-foreground"}`}>
                    <Clock className="w-3 h-3" />
                    <span>{s.daysLeft > 0 ? `${s.daysLeft}d left` : s.daysLeft === 0 ? "Due today" : "Overdue"}</span>
                  </div>
                )}
              </div>

              {/* 進度條（縮短，不佔滿整行） + 百分比 + SP 統計 */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: animated ? `${s.percentage}%` : "0%",
                      backgroundColor: s.projectColor,
                      transition: "width 900ms cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  />
                </div>
                <span
                  className="text-xs font-semibold shrink-0"
                  style={{ color: s.percentage > 0 ? s.projectColor : undefined }}
                >
                  {s.percentage}%
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {s.doneSP} / {s.totalSP} SP
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
