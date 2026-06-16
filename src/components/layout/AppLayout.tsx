// 版面配置 + 路由保護。

import { useEffect } from "react"
import { Outlet, Navigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { SidebarProvider } from "@/contexts/SidebarContext"
import { useSearchStore } from "@/store/useSearchStore"
import Sidebar from "./sidebar"
import Navbar from "./Navbar"
import CommandPalette from "@/components/search/CommandPalette"

export default function AppLayout() {
  const { user } = useAuth()

  // 全域 ⌘K / Ctrl+K 監聽：放在這裡而不是 Navbar，這樣不管在哪個頁面都能觸發
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault() // 蓋掉瀏覽器原生的「加入書籤」快捷鍵
        useSearchStore.getState().open() // 在元件外部用 getState() 直接拿 store 方法，不需要訂閱 state
      }
    }
    window.addEventListener("keydown", handleKeydown)
    return () => window.removeEventListener("keydown", handleKeydown)
  }, [])

  if (!user) return <Navigate to="/login" replace />

  return (
    <SidebarProvider>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-auto p-6 bg-background">
            <Outlet />
          </main>
        </div>
      </div>
      <CommandPalette />
    </SidebarProvider>
  )
}