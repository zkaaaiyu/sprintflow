//dashboard 右上角月曆
import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

// 取得某年某月的天數
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

// 取得某月第一天是星期幾（轉換為 Monday-first：0=Mon, 6=Sun）
function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"]
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export default function CalendarPanel() {
  const today = new Date()
  const [viewDate, setViewDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  )

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))

  // 補齊月初空格 + 當月日期
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const isToday = (day: number) =>
    year === today.getFullYear() &&
    month === today.getMonth() &&
    day === today.getDate()

  return (
    <div>
      {/* 月份 header + 前後切換 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">
          {MONTH_NAMES[month]} {year}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={prevMonth}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={nextMonth}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* 星期標題列 */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-center text-[11px] text-muted-foreground font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      {/* 日期格子 */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => (
          <div key={i} className="flex items-center justify-center">
            {day ? (
              <div
                className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium transition-colors cursor-pointer
                  ${isToday(day)
                    ? "bg-brand text-white"
                    : "hover:bg-accent text-foreground"
                  }`}
              >
                {day}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
