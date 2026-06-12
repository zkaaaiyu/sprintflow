//dashboard 左上角donut chart
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"

type Props = {
  total: number
  todo: number
  in_progress: number
  review: number
  done: number
}

// DonutChart 專用色盤，與 badge 顏色獨立管理
const STATUS_CONFIG = [
  { key: "in_progress", label: "IN PROGRESS", color: "#B3795F" },
  { key: "done",        label: "DONE",        color: "#6F9E8A" },
  { key: "review",      label: "REVIEW",      color: "#E2BF6A" },
  { key: "todo",        label: "TO DO",       color: "#6B7280" },
]

export default function DonutChart({ total, todo, in_progress, review, done }: Props) {
  const values: Record<string, number> = { in_progress, done, review, todo }
  const hasData = total > 0

  // recharts 需要的資料格式
  const data = STATUS_CONFIG.map((s) => ({ ...s, value: values[s.key] ?? 0 }))

  return (
    // min-w-0 讓 flex 子元素可以縮小到 0，不被內容撐開
    <div className="flex items-center gap-8 min-w-0">
      {/* Donut 圖：shrink-0 保持固定大小 */}
      <div className="relative w-32 h-32 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={hasData ? data : [{ value: 1, color: "var(--subtle-bg)", key: "empty", label: "" }]}
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={58}
              dataKey="value"
              strokeWidth={0}
              startAngle={90}
              endAngle={-270}
            >
              {hasData
                ? data.map((entry) => <Cell key={entry.key} fill={entry.color} />)
                : <Cell fill="var(--subtle-bg)" />
              }
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* 中間文字：總任務數 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold leading-none">{total}</span>
          <span className="text-[10px] text-muted-foreground mt-0.5 tracking-wide">TASKS</span>
        </div>
      </div>

      {/* 狀態統計 2x2 */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 min-w-0 overflow-hidden">
        {data.map((d) => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0
          return (
            <div key={d.key} className="flex items-center gap-1.5 min-w-0 hover:scale-[1.05] origin-left transition-all cursor-default">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <div className="min-w-0 overflow-hidden">
                <p className="text-xs text-muted-foreground whitespace-nowrap">{d.label}</p>
                <p className="text-base font-bold leading-none whitespace-nowrap">{pct}%</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
