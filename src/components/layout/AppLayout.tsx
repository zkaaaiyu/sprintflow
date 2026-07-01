// 整體框架：路由保護 + 全域鍵盤監聽 + 頁面骨架
import { useEffect } from "react"
import { Outlet, Navigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { SidebarProvider } from "@/contexts/SidebarContext"
import { useSearchStore } from "@/store/useSearchStore"
import Sidebar from "./sidebar"
import Navbar from "./Navbar"
import CommandPalette from "@/components/search/CommandPalette"

export default function AppLayout() {
  const { user } = useAuth()  // 從 AuthContext 取出當前登入的用戶

  // 全域 ⌘K 監聽
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {  // *ts: e是鍵盤事件 
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault() // 蓋掉瀏覽器原生的「加入書籤」快捷鍵
        useSearchStore.getState().open() // 用zustand的getState方法 直接存取store裡面的狀態跟方法
      }
    }
    window.addEventListener("keydown", handleKeydown)
    return () => window.removeEventListener("keydown", handleKeydown) // 組件卸載的時候停止監聽
  }, [])

  if (!user) return <Navigate to="/login" replace />   // 如果沒登入直接跳到登入頁 取代原本的頁面 

  return (
    // sidebarprovider 包在最外層 讓所有組件都可以拿到 collapsed 跟 toggle
    <SidebarProvider> 
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-auto p-6 bg-background">
            {/* 巢狀路由的插槽  outlet */}
            <Outlet />  
          </main>
        </div>
      </div>
      <CommandPalette />
      {/* 它是全域浮層 所以放在最外面*/}
    </SidebarProvider>
  )
}