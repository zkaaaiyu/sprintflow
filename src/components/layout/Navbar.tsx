import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Search, Bell, LogOut, Moon, Sun, ChevronLeft, ChevronRight } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useWorkspace } from "@/hooks/useWorkspace"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { projects } = useWorkspace()

  // 深色模式：讀 localStorage 初始值，切換時寫回並更新 html class
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark")

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }, [dark])

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
    toast.success("已登出")
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

        {/* 搜尋（暫為 icon，後續接 Command Palette） */}
        <button className="p-2 rounded-md hover:bg-accent transition-colors">
          <Search className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* 鈴鐺 */}
        <button className="p-2 rounded-md hover:bg-accent transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
        </button>

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
              <p className="text-sm font-medium truncate">{user?.displayName || "使用者"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />

            {/* 深色模式 toggle（不是 DropdownMenuItem，點擊不會關閉選單） */}
            <div className="flex items-center justify-between px-2 py-2 rounded-md mx-1 hover:bg-accent cursor-default">
              <div className="flex items-center gap-2 text-sm">
                {dark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                <span>深色模式</span>
              </div>
              {/* 自製 toggle 開關：flex + p-0.5 讓圓圈完整在軌道內 */}
              <button
                onClick={() => setDark((d) => !d)}
                className={`flex items-center w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 focus:outline-none ${
                  dark ? "bg-[#F97316]" : "bg-gray-300"
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
              <LogOut className="w-4 h-4 mr-2" />
              登出
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
