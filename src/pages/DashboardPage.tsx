//整合所有 dashboard 組件 
import { useWorkspace } from "@/hooks/useWorkspace"
import { useActiveSprintTasks } from "@/hooks/useActiveSprintTasks"
import { useDashboardStats } from "@/hooks/useDashboardStats"
import { useUpcomingTasks } from "@/hooks/useUpcomingTasks"
import { useActiveSprintsSummary } from "@/hooks/useActiveSprintsSummary"
import DonutChart from "@/components/dashboard/DonutChart"
import UpcomingDeadlines from "@/components/dashboard/UpcomingDeadlines"
import CalendarPanel from "@/components/dashboard/CalendarPanel"
import PersonalTodos from "@/components/dashboard/PersonalTodos"
import ActiveSprintsSummary from "@/components/dashboard/ActiveSprintsSummary"
import BurndownChart from "@/components/dashboard/BurndownChart"

export default function DashboardPage() {
  
  const { projects, loading: projectsLoading } = useWorkspace()   // 取得所有專案清單 這是整個 Dashboard 的資料起點

  // 一次撈出所有 active sprint + 任務的原始資料
  const { groups: activeSprintGroups, loading: groupsLoading } = useActiveSprintTasks(projects, projectsLoading)

  const stats = useDashboardStats(activeSprintGroups, groupsLoading) // 用useDashboardStats拿到狀態
  const { tasks: upcomingTasks } = useUpcomingTasks(projects, projectsLoading)
  const { summaries: sprintSummaries, loading: sprintsLoading } = useActiveSprintsSummary(activeSprintGroups, groupsLoading)

  return (
    <div className="p-8 h-full overflow-y-auto">

      {/* 整體三欄格局：min-h-full 讓子欄可以撐到視窗底部 */}
      <div className="grid grid-cols-3 gap-6 min-h-full">

        {/* ── 左側 2/3 ── */}
        <div className="col-span-2 flex flex-col gap-6">

          {/* 上：Donut Chart + Upcoming Deadlines */}
          {/* overflow-hidden 防止子元素撐破 card，min-w-0 讓 flex 子項可縮放 */}
          <div className="bg-card border border-border rounded-3xl p-6 flex gap-6 overflow-hidden shadow-sm">
            {/* Donut + 統計數字：flex-1 min-w-0 允許隨容器縮小 */}
            <div className="flex-1 min-w-0 flex items-center justify-center">
              {stats.loading ? (
                <div className="w-32 h-32 rounded-full bg-muted animate-pulse" />
              ) : (
                <DonutChart
                  total={stats.total}
                  todo={stats.todo}
                  in_progress={stats.in_progress}
                  review={stats.review}
                  done={stats.done}
                />
              )}
            </div>

            {/* 垂直分隔線 */}
            <div className="w-px bg-border self-stretch shrink-0" />

            {/* 即將到期任務：flex-1 min-w-0 跟左側等比縮放 */}
            <div className="flex-1 min-w-0">
              <UpcomingDeadlines tasks={upcomingTasks} />
            </div>
          </div>

          {/* 下：My Todos（1/3）+ Active Sprints（2/3）各自獨立 card */}
          <div className="flex gap-6 flex-1">
            <div className="bg-card border border-border rounded-3xl p-6 overflow-hidden shadow-sm" style={{ flex: "1 1 0" }}>
              <PersonalTodos />
            </div>
            <div className="bg-card border border-border rounded-3xl p-6 overflow-hidden shadow-sm" style={{ flex: "2 1 0" }}>
              <ActiveSprintsSummary summaries={sprintSummaries} loading={sprintsLoading} />
            </div>
          </div>

        </div>

        {/* ── 右側 1/3 ── */}
        <div className="col-span-1 flex flex-col gap-6">

          {/* 月曆面板 */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <CalendarPanel />
          </div>

          {/* Burndown Chart：flex-1 撐滿右欄剩餘高度 */}
          <div className="bg-card border border-border rounded-3xl p-6 flex-1 shadow-sm">
            <BurndownChart summaries={sprintSummaries} />
          </div>
        </div>

      </div>
    </div>
  )
}
