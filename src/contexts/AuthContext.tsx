// 認證 Context：管理登入狀態、用戶資料、專案排序
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

  // 監聽 Firebase 的登入狀態
  useEffect(() => {
    //AuthStateChanged -> Firebase 提供的監聽器
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {    //用AuthStateChanged 監聽 auth（身份認證服務） 只要登入狀態改變就把資料塞到 firebaseuser回傳給我接著跑下面的程式
    if (firebaseUser) { //firebaseuser有東西也就是 用戶已經登入的情況
      try {
        await setDoc(    // 把用戶資料寫進 Firestore
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
        console.warn("Firestore write failed:", e) //寫入失敗不影響登入流程只是給警告
      }
      // 從 localStorage 「讀取」該用戶的自定義排序
      const saved = localStorage.getItem(`projectOrder_${firebaseUser.uid}`)
      setProjectOrderState(saved ? JSON.parse(saved) : [])
    } else {  // 用戶沒有登入的情況
      setProjectOrderState([])
    }
    setUser(firebaseUser)
    setLoading(false)
  })
    return unsubscribe
  }, []) 

  const logout = () => signOut(auth) //登出函式 直接用firebase寫好的 api

  //更新專案排序（寫入）
  const setProjectOrder = (ids: string[]) => {
    setProjectOrderState(ids)  //畫面渲染
    if (user) localStorage.setItem(`projectOrder_${user.uid}`, JSON.stringify(ids))
  }

  return (
    // 透過 value 屬性 傳遞user(用來判斷登入、顯示名字頭像) 、loading 、logout 、 projectOrder、setProjectOrder給其他組件 
    <AuthContext.Provider value={{ user, loading, logout, projectOrder, setProjectOrder }}>
      {!loading && children } 
    </AuthContext.Provider>
  )
}
// 自定義 Hook 方便其他組件使用
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}