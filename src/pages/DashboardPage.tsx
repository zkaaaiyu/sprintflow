import { useWorkspace } from "@/hooks/useWorkspace"
import { useDashboardStats } from "@/hooks/useDashboardStats"
import { useUpcomingTasks } from "@/hooks/useUpcomingTasks"
import { useGlobalActivities } from "@/hooks/useGlobalActivities"
import DonutChart from "@/components/dashboard/DonutChart"
import UpcomingDeadlines from "@/components/dashboard/UpcomingDeadlines"
import CalendarPanel from "@/components/dashboard/CalendarPanel"
import PersonalTodos from "@/components/dashboard/PersonalTodos"
import ActivityFeed from "@/components/dashboard/ActivityFeed"

export default function DashboardPage() {
  const { projects, loading: projectsLoading } = useWorkspace()
  const projectIds = projects.map((p) => p.id)

  const stats = useDashboardStats(projects, projectsLoading)
  const { tasks: upcomingTasks } = useUpcomingTasks(projects, projectsLoading)
  const { activities } = useGlobalActivities(projectIds, projectsLoading)

  return (
    <div className="p-8 h-full overflow-y-auto">

      {/* 整體三欄格局 */}
      <div className="grid grid-cols-3 gap-6">

        {/* ── 左側 2/3 ── */}
        <div className="col-span-2 flex flex-col gap-6">

          {/* 上：Donut Chart + Upcoming Deadlines */}
          {/* overflow-hidden 防止子元素撐破 card，min-w-0 讓 flex 子項可縮放 */}
          <div className="bg-card border border-border rounded-2xl p-6 flex gap-6 overflow-hidden">
            {/* Donut + 統計數字：flex-1 min-w-0 允許隨容器縮小 */}
            <div className="flex-1 min-w-0">
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

          {/* 下：個人待辦清單 */}
          <div className="bg-card border border-border rounded-2xl p-6 flex-1">
            <PersonalTodos />
          </div>
        </div>

        {/* ── 右側 1/3 ── */}
        <div className="col-span-1 flex flex-col gap-6">

          {/* 月曆面板 */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <CalendarPanel />
          </div>

          {/* 跨專案 Activity Feed */}
          <div className="bg-card border border-border rounded-2xl p-6 overflow-y-auto max-h-[460px]">
            <ActivityFeed activities={activities} projects={projects} />
          </div>
        </div>

      </div>
    </div>
  )
}
