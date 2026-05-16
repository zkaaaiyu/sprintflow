// 全域登入狀態管理

import { createContext, useContext, useEffect, useState } from "react"
import { type User, onAuthStateChanged, signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"

// 定義型別
type AuthContextType = {
  user: User | null
  loading: boolean
  logout: () => Promise<void>
}

//建立context容器
const AuthContext = createContext<AuthContextType | null>(null)

// 建立provider組件
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // 用Firebase 內部onAuthStateChanged方法 監聽狀態 登入/登出
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser) 
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const logout = () => signOut(auth)

  return (
    // 透value 屬性 傳遞user loading logout 給其他組件
    <AuthContext.Provider value={{ user, loading, logout }}> 
      {!loading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}