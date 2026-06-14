// 版面配置 + 路由保護。

import { Outlet, Navigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { SidebarProvider } from "@/contexts/SidebarContext"
import Sidebar from "./sidebar"
import Navbar from "./Navbar"

export default function AppLayout() {
  const { user } = useAuth()

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
    </SidebarProvider>
  )
}