import { Search, Bell, User } from "lucide-react"

export default function Navbar() {
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
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer">
          <User className="w-4 h-4 text-primary-foreground" />
        </div>
      </div>

    </header>
  )
}