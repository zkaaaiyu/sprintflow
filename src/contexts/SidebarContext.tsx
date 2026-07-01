// 全域 Sidebar 展開/收合狀態管理
import { createContext, useContext, useState } from "react"
import type { ReactNode } from "react"

type SidebarContextType = {
  collapsed: boolean
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextType>({ 
  collapsed: false,  // 預設值為false
  toggle: () => {},  // 預設值給一個空函數  
})

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <SidebarContext.Provider value={{ 
      collapsed,  
      toggle: () => setCollapsed((c) => !c) }}> 
      {children } 
    </SidebarContext.Provider> 
  ) 
}

export const useSidebar = () => useContext(SidebarContext)
