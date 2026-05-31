import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"

type Props = {
  total: number
  todo: number
  in_progress: number
  review: number
  done: number
}

// 各狀態對應顏色
const STATUS_CONFIG = [
  { key: "in_progress", label: "IN PROGRESS", color: "#F97316" },
  { key: "done",        label: "DONE",        color: "#73a38c" },
  { key: "review",      label: "REVIEW",      color: "#9B7EC8" },
  { key: "todo",        label: "TO DO",       color: "#E5E7EB" },
]

export default function DonutChart({ total, todo, in_progress, review, done }: Props) {
  const values: Record<string, number> = { in_progress, done, review, todo }
  const hasData = total > 0

  // recharts 需要的資料格式
  const data = STATUS_CONFIG.map((s) => ({ ...s, value: values[s.key] ?? 0 }))

  return (
    // min-w-0 讓 flex 子元素可以縮小到 0，不被內容撐開
    <div className="flex items-center gap-4 min-w-0">
      {/* Donut 圖：shrink-0 保持固定大小 */}
      <div className="relative w-32 h-32 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={hasData ? data : [{ value: 1, color: "#F3F4F6", key: "empty", label: "" }]}
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
                : <Cell fill="#F3F4F6" />
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

      {/* 狀態統計 2x2：min-w-0 + overflow-hidden 允許縮放，whitespace-nowrap 防止換行 */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 min-w-0 overflow-hidden flex-1">
        {data.map((d) => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0
          return (
            <div key={d.key} className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <div className="min-w-0 overflow-hidden">
                <p className="text-[10px] text-muted-foreground whitespace-nowrap">{d.label}</p>
                <p className="text-lg font-bold leading-none whitespace-nowrap">{pct}%</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
