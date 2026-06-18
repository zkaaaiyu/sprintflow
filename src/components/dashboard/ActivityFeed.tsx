import type { GlobalActivity } from "@/hooks/useGlobalActivities"
import type { Project } from "@/hooks/useWorkspace"
import { avatarColor } from "@/lib/utils"

// 把 Date 轉換成「幾分鐘前」這類相對時間
function timeAgo(date: Date | null): string {
  if (!date) return ""
  const diff = (Date.now() - date.getTime()) / 1000 // 秒數差
  if (diff < 60)    return "just now"
  if (diff < 3600)  return `${Math.floor(diff / 60)} mins ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// 根據 field 產生可讀性好的 activity 描述
function formatActivityMessage(act: GlobalActivity): string {
  if (act.field === "status")   return `moved '${act.taskTitle}' to ${act.toValue}`
  if (act.field === "sprintId") return `returned '${act.taskTitle}' to Backlog`
  if (act.field === "assigneeId") return `reassigned '${act.taskTitle}'`
  return `updated '${act.taskTitle}'`
}

// 頭像元件
function Avatar({ name, photoURL }: { name: string; photoURL: string | null }) {
  const initial = name[0]?.toUpperCase() ?? "?"
  if (photoURL) {
    return (
      <img
        src={photoURL}
        referrerPolicy="no-referrer"
        className="w-8 h-8 rounded-full object-cover shrink-0"
      />
    )
  }
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
      style={{ backgroundColor: avatarColor(name) }}
    >
      {initial}
    </div>
  )
}

export default function ActivityFeed({
  activities,
  projects,
}: {
  activities: GlobalActivity[]
  projects: Project[]
}) {
  // 用 projectId 查對應的專案資料（顏色 + 名稱）
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]))

  return (
    <div>
      <p className="text-sm font-semibold mb-4">Recent Activity</p>

      {activities.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No recent activity — changes will appear here after tasks are updated.
        </p>
      ) : (
        <div className="space-y-4">
          {activities.map((act) => {
            const project = projectMap[act.projectId]
            return (
              <div key={act.id} className="flex gap-3 items-start">
                <Avatar name={act.changedByName} photoURL={act.changedByPhotoURL} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-snug">
                    <span className="font-semibold">{act.changedByName}</span>
                    {" "}
                    <span className="text-muted-foreground">{formatActivityMessage(act)}</span>
                  </p>
                  {/* 時間 + 專案標示 */}
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <p className="text-[10px] text-muted-foreground">{timeAgo(act.createdAt)}</p>
                    {project && (
                      <>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: project.color }}
                        />
                        <p className="text-[10px] text-muted-foreground truncate">{project.name}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
