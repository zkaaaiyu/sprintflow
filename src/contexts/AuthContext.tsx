// 全域登入狀態管理
import { createContext, useContext, useEffect, useState } from "react"
import { type User, onAuthStateChanged, signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { doc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

// 定義context 裡面會用到的型別
type AuthContextType = {
  user: User | null
  loading: boolean
  logout: () => Promise<void>
  projectOrder: string[]
  setProjectOrder: (ids: string[]) => void
}

//建立context容器
const AuthContext = createContext<AuthContextType | null>(null)

// 建立provider組件
export function AuthProvider({ children }: { children: React.ReactNode }) {  // *ts : 表示這個元件是用來接收子元件，子元件是任意 React 內容
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [projectOrder, setProjectOrderState] = useState<string[]>([])

  // 用Firebase 內部onAuthStateChanged方法 監聽狀態 登入/登出
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        await setDoc(    // 如果登入了：把用戶資料寫進 Firestore
          doc(db, "users", firebaseUser.uid),
          {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName ?? "",
            email: firebaseUser.email ?? "",
            photoURL: firebaseUser.photoURL ?? null,
          },
          { merge: true } //只更新有的欄位，不覆蓋整份文件
        )
      } catch (e) {
        console.warn("Firestore write failed:", e)
      }
      // 從 localStorage 讀取該用戶的自定義排序
      const saved = localStorage.getItem(`projectOrder_${firebaseUser.uid}`)
      setProjectOrderState(saved ? JSON.parse(saved) : [])
    } else {
      setProjectOrderState([])
    }
    setUser(firebaseUser)
    setLoading(false)
  })
    return unsubscribe
  }, [])

  const logout = () => signOut(auth)

  const setProjectOrder = (ids: string[]) => {
    setProjectOrderState(ids)
    if (user) localStorage.setItem(`projectOrder_${user.uid}`, JSON.stringify(ids))
  }

  return (
    // 透過 value 屬性 傳遞user loading logout 給其他組件 
    <AuthContext.Provider value={{ user, loading, logout, projectOrder, setProjectOrder }}>
      {!loading && children } 
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}