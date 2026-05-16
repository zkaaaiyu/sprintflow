import { Search, Bell, LogOut } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

export default function Navbar() {
  const { user, logout } = useAuth()  //AuthContext 封裝的useAuth()

  // 取名字縮寫
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
    <header className="h-14 border-b border-border bg-background flex items-center px-6 gap-4">

      {/* 搜尋列 */}
      <div className="flex items-center gap-2 flex-1 max-w-md bg-muted rounded-md px-3 py-1.5">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          type="text"
          placeholder="搜尋任務..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* 右側按鈕區 */}
      <div className="flex items-center gap-3 ml-auto">
        <button className="p-2 rounded-md hover:bg-accent transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* 用戶頭像 + 下拉選單 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="avatar"
                className="w-8 h-8 rounded-full cursor-pointer object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer text-primary-foreground text-xs font-semibold">
                {getInitials()}
              </div>
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium truncate">{user?.displayName || "使用者"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" />
              登出
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  )
}