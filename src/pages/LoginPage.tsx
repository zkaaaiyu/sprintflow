 // 登入頁面 UI + 表單邏輯
import { useState, useEffect } from "react"
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import {toast} from 'sonner'

const googleProvider = new GoogleAuthProvider() //建立Google 登入的設定物件

export default function LoginPage() {
  const [email, setEmail] = useState("") // 追蹤 email 輸入框的內容
  const [password, setPassword] = useState("") // 追蹤 password 輸入框的內容
  const [error, setError] = useState("")// 存錯誤訊息（登入失敗時顯示）
  const navigate = useNavigate() //跳轉
  const { user } = useAuth()  // 從 AuthContext 取出 user

  // 用useEffect監聽 user 狀態 登入完成後再跳轉
  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true }) //用replace: true替代掉login歷史頁面
  }, [user, navigate]) 

  const handleEmailLogin = async (e: React.FormEvent) => {  // # ts: e 是 React 的表單事件物件
    e.preventDefault() //阻止表單的預設行為(提交)
    setError("")
    try {
       //用firebase 的 signInWithEmailAndPassword 處理後端登入邏輯
      await signInWithEmailAndPassword(auth, email, password)  // 成功的話Firebase 會更新登入狀態，觸發 onAuthStateChanged，AuthContext 更新 user
      toast.success('Signed in successfully')
      //頁面跳轉不要在這裡做避免race condition
    } catch {
      setError("Incorrect email or password")  
    }
  }

  const handleGoogleLogin = async () => {
    setError("")
    try {
      await signInWithPopup(auth, googleProvider)
      toast.success('Signed in with Google')
    } catch {
      setError("Google sign-in failed")
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
       {/* 登入卡片：固定寬度、內距、背景、圓角、邊框、陰影 */}
      <div className="w-full max-w-sm p-8 bg-card rounded-xl border border-border shadow-sm">
        <h1 className="text-2xl font-bold text-foreground mb-1">Welcome back</h1>
        <p className="text-sm text-muted-foreground mb-6">Sign in to your SprintFlow account</p>

        {/* 表單：送出時呼叫 handleEmailLogin */}
        <form onSubmit={handleEmailLogin} className="space-y-4"> 
          {/* Email 輸入框 */}
          <div>
            <label className="text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              value={email}
              // 用onchange 做受控表單綁定
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@example.com"
              required
            />
          </div>
          
          {/* Password 輸入框 */}
          <div>
            <label className="text-sm font-medium text-foreground">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="••••••••"
              required 
            />
          </div>
          
          {/* 錯誤訊息：用邏輯與判斷 是否顯示*/}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* 登入按鈕 */}
          <button
            type="submit"
            className="w-full py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Sign in
          </button>
        </form>

        {/* ------or------ */}
        <div className="my-4 flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Google 登入按鈕 */}
        <button
          onClick={handleGoogleLogin}
          className="w-full py-2 rounded-md border border-border text-sm font-medium hover:bg-accent transition-colors"
        >
          Sign in with Google
        </button>
        
        {/* 底部：跳轉到註冊頁 */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Don't have an account?{" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
