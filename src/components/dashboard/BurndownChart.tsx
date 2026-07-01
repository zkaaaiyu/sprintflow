import { useState, useEffect, useRef } from "react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts"
import { Check, ChevronDown } from "lucide-react"
import { BRAND } from "@/lib/colors"
import { useBurndownData } from "@/hooks/useBurndownData"
import type { ActiveSprintSummary } from "@/hooks/useActiveSprintsSummary"

type Props = {
  summaries: ActiveSprintSummary[]
}

export default function BurndownChart({ summaries }: Props) {
  const defaultId = summaries.length > 0    //預設選中的 Sprint
    ? (() => {
        const sorted = [...summaries].sort((a, b) =>
          (b.startDate?.getTime() ?? 0) - (a.startDate?.getTime() ?? 0)
        )
        // 優先選有任務的 sprint，沒有才 fallback 到最新的
        return (sorted.find((s) => s.totalTasks > 0) ?? sorted[0]).sprintId
      })()
    : "" // 沒有任何 summaries → 空字串

  const [selectedId, setSelectedId] = useState(defaultId)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const userSelected = useRef(false)

  // 只要使用者沒有手動選過，就跟著 defaultId 更新（解決資料延遲導致的錯誤預設）
  useEffect(() => {
    if (defaultId && !userSelected.current) setSelectedId(defaultId)
  }, [defaultId])

  // 點擊外部關閉下拉選單
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [dropdownOpen])

  const selected = summaries.find((s) => s.sprintId === selectedId)  // 從 summaries 找出目前選中的那一筆完整資料
  const selectedLabel = selected ? `${selected.projectName} · ${selected.sprintName}` : "Select sprint" //顯示選中的是哪一個project 哪一個 sprint 

  // 把選中的 Sprint 資訊傳給 useBurndownData，讓它去查 Firestore 並計算點陣列
  const { data, loading } = useBurndownData(
    selected?.projectId ?? "",
    selected?.sprintId ?? "",
    selected?.startDate ?? null,
    selected?.endDate ?? null,
  )

  const tickInterval = data.length > 14 ? Math.ceil(data.length / 10) - 1 : 0

  return (
    <div className="h-full flex flex-col">
      {/* 標題列 + Sprint 選單 */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-sm shrink-0" style={{ color: BRAND }}>Burndown Chart</h3>

        {summaries.length > 0 ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:border-foreground transition-colors duration-300 max-w-[200px]"
            >
              <span className="truncate">{selectedLabel}</span>
              <ChevronDown className="w-3 h-3 shrink-0" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-3 min-w-[180px] bg-popover border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
                {summaries.map((s) => (
                  <button
                    key={s.sprintId}
                    onClick={() => { userSelected.current = true; setSelectedId(s.sprintId); setDropdownOpen(false) }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-accent transition-colors text-left"
                  >
                    <span>{s.projectName} · {s.sprintName}</span>
                    {s.sprintId === selectedId && <Check className="w-3 h-3 text-brand shrink-0 ml-2" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground">No active sprints</span>
        )}
      </div>

      {/* 圖表區 */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-full h-32 bg-muted animate-pulse rounded-lg" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            No data for this sprint
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                interval={tickInterval}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
              <Line
                type="monotone"
                dataKey="ideal"
                name="Ideal"
                stroke="#9CA3AF"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual"
                stroke={BRAND}
                strokeWidth={2}
                dot={{ r: 3, fill: BRAND, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
