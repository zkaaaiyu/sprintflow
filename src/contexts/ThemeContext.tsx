//  全域 Dark/Light 模式狀態管理

import { createContext, useContext, useEffect, useState } from "react"

//定義主題型別
type ThemeContextType = {
  dark: boolean
  setDark: (dark: boolean)  => void //沒有回傳值
}

const ThemeContext = createContext<ThemeContextType | null>(null) // 建立context容器

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  //useState 初始值是一個函式 取出用戶當前的主題看是不是深色模式
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark") 


  //用 useEffet 監聽dark值如果變動 同時更新localstorage跟classlist
  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else { 
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }, [dark])

  return (
    <ThemeContext.Provider value={{ dark, setDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

//導出用來接收的hook
export function useTheme() {  
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used within ThemeProvider")
  return context
}
