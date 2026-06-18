import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Search, Bell, LogOut, Moon, Sun, ChevronLeft, ChevronRight, Settings } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { BRAND } from "@/lib/colors"
import { useWorkspace } from "@/hooks/useWorkspace"
import { useGlobalActivities, type GlobalActivity } from "@/hooks/useGlobalActivities"
import { useSearchStore } from "@/store/useSearchStore"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "sonner"
import { useTheme } from "@/contexts/ThemeContext"

// 相對時間格式化
function timeAgo(date: Date | null): string {
  if (!date) return ""
  const diff = (Date.now() - date.getTime()) / 1000
  if (diff < 60)     return "just now"
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// activity 描述文字
function formatActivityMessage(act: GlobalActivity): string {
  if (act.field === "status")     return `moved '${act.taskTitle}' to ${act.toValue}`
  if (act.field === "sprintId")   return `returned '${act.taskTitle}' to Backlog`
  if (act.field === "assigneeId") return `reassigned '${act.taskTitle}'`
  return `updated '${act.taskTitle}'`
}

// 小頭像
function MiniAvatar({ name, photoURL }: { name: string; photoURL: string | null }) {
  const initial = name[0]?.toUpperCase() ?? "?"
  if (photoURL) {
    return <img src={photoURL} referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover shrink-0" />
  }
  return (
    <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-semibold shrink-0">
      {initial}
    </div>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { projects, loading: projectsLoading } = useWorkspace()

  // 跨專案 activity feed（鈴鐺通知用）
  const projectIds = projects.map((p) => p.id)
  // 整理每個 project 的使用者加入時間，用來過濾加入前的舊紀錄
  const joinedAtMap: Record<string, Date | null> = Object.fromEntries(
    projects.map((p) => [p.id, user ? (p.joinedAt?.[user.uid] ?? null) : null])
  )
  const { activities } = useGlobalActivities(projectIds, projectsLoading, joinedAtMap)
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]))

  // 已讀狀態：記錄上次已讀的時間點（存 localStorage）
  const [lastReadAt, setLastReadAt] = useState<number>(() =>
    parseInt(localStorage.getItem("notificationLastRead") ?? "0")
  )
  const [notifOpen, setNotifOpen] = useState(false)

  const hasUnread = activities.some(
    (act) => act.createdAt && act.createdAt.getTime() > lastReadAt
  )

  const markAsRead = () => {
    const now = Date.now()
    localStorage.setItem("notificationLastRead", String(now))
    setLastReadAt(now)
  }

  const { dark, setDark } = useTheme()

  // 從 pathname 組出麵包屑陣列
  const buildCrumbs = () => {
    const parts = pathname.split("/").filter(Boolean)
    const crumbs: { label: string; to: string }[] = []

    if (parts[0] === "dashboard") {
      crumbs.push({ label: "Dashboard", to: "/dashboard" })
    } else if (parts[0] === "projects") {
      crumbs.push({ label: "Workspace", to: "/projects" })

      if (parts[1]) {
        const project = projects.find((p) => p.id === parts[1])
        if (project) crumbs.push({ label: project.name, to: `/projects/${parts[1]}` })
      }
      // sprint 頁：顯示 "Sprint"（sprint name 由 SprintKanbanPage 自己管，不在 Navbar 重複抓）
      if (parts[2] === "sprints" && parts[3]) {
        crumbs.push({ label: "Sprint", to: pathname })
      }
    } else if (parts[0] === "members") {
      crumbs.push({ label: "Members", to: "/members" })
    } else if (parts[0] === "settings") {
      crumbs.push({ label: "Settings", to: "/settings" })
    }

    return crumbs
  }

  const crumbs = buildCrumbs()

  const getInitials = () => {
    if (!user?.displayName) return "U"
    const parts = user.displayName.trim().split(" ")
    if (parts.length === 1) return parts[0][0].toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const handleLogout = async () => {
    await logout()
    toast.success("Signed out")
  }

  return (
    <header className="h-14 border-b border-border bg-background flex items-center px-6 gap-3 shrink-0">

      {/* 左側：返回按鈕 + 麵包屑 */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {/* 只有在有上一層（crumbs > 1）時才顯示返回按鈕 */}
        {crumbs.length > 1 && (
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {crumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-sm min-w-0">
            {crumbs.map((crumb, i) => (
              <span key={crumb.to} className="flex items-center gap-1 min-w-0">
                {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                <button
                  onClick={() => i < crumbs.length - 1 && navigate(crumb.to)}
                  className={
                    i === crumbs.length - 1
                      ? "font-medium text-foreground truncate cursor-default"
                      : "text-muted-foreground hover:text-foreground transition-colors truncate"
                  }
                >
                  {crumb.label}
                </button>
              </span>
            ))}
          </nav>
        )}
      </div>

      {/* 右側：搜尋 + 鈴鐺 + 頭像（mr-2 讓頭像不貼邊） */}
      <div className="flex items-center gap-1 shrink-0 mr-2">

        {/* 搜尋：開啟全域 Command Palette（跟 ⌘K 共用同一個 store） */}
        <button
          onClick={() => useSearchStore.getState().open()}
          className="p-2 rounded-md hover:bg-accent transition-colors"
        >
          <Search className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* 鈴鐺通知 Popover */}
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger asChild>
            <button className="relative p-2 rounded-md hover:bg-accent transition-colors">
              <Bell className="w-4 h-4 text-muted-foreground" />
              {hasUnread && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-destructive" />
              )}
            </button>
          </PopoverTrigger>

          <PopoverContent align="end" className="w-80 p-0 rounded-2xl overflow-hidden ring-0 shadow-lg border border-border">
            {/* 面板標題 + 已讀按鈕 */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold">Notifications</p>
              {hasUnread && (
                <button
                  onClick={markAsRead}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Activity 列表，固定高度，內容不足時不縮小 */}
            <div className="overflow-y-auto h-[420px]">
              {activities.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-xs text-muted-foreground">No recent activity</p>
                </div>
              ) : (
                <>
                  {activities.map((act) => {
                    const project = projectMap[act.projectId]
                    const isUnread = act.createdAt && act.createdAt.getTime() > lastReadAt
                    return (
                      <div
                        key={act.id}
                        onClick={() => {
                          navigate(`/projects/${act.projectId}`)
                          setNotifOpen(false)
                        }}
                        className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-accent transition-colors ${
                          isUnread ? "bg-accent/40" : ""
                        }`}
                      >
                        <MiniAvatar name={act.changedByName} photoURL={act.changedByPhotoURL} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs leading-snug">
                            <span className="font-semibold">{act.changedByName}</span>
                            {" "}
                            <span className="text-muted-foreground">{formatActivityMessage(act)}</span>
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-muted-foreground">{timeAgo(act.createdAt)}</span>
                            {project && (
                              <>
                                <span className="text-[10px] text-muted-foreground">·</span>
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                                <span className="text-[10px] text-muted-foreground truncate">{project.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {isUnread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0 mt-1.5" />
                        )}
                      </div>
                    )
                  })}
                  <p className="text-[10px] text-center px-4 py-2" style={{ color: "var(--subtle-foreground)" }}>
                    — Only showing notifications from the last 7 days —
                  </p>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* 頭像下拉選單 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {/* outline-none 拿掉藍色 focus 外框 */}
            <button className="ml-1 outline-none focus:outline-none rounded-full">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="avatar"
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
                  {getInitials()}
                </div>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52 outline-none focus:outline-none">
            {/* 用戶資訊 */}
            <div className="px-2 py-2">
              <p className="text-sm font-medium truncate">{user?.displayName || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => navigate("/settings")}
              className="cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              Settings
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* 深色模式 toggle（不是 DropdownMenuItem，點擊不會關閉選單） */}
            <div className="flex items-center justify-between px-1.5 py-1 rounded-md hover:bg-accent cursor-default text-sm">
              <div className="flex items-center gap-1.5">
                {dark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                <span>Dark mode</span>
              </div>
              {/* 自製 toggle 開關：flex + p-0.5 讓圓圈完整在軌道內 */}
              <button
                onClick={() => setDark((d) => !d)}
                className={`flex items-center w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 focus:outline-none ${
                  dark ? "bg-brand" : "bg-gray-300"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    dark ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
