import { useState } from "react"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useNavigate, Link } from "react-router-dom"
import {toast} from 'sonner'

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("") 
    if (password.length < 6) {
      setError("密碼至少需要 6 個字元")
      return
    }
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password) 
      await updateProfile(user, { displayName: name }) 
      toast.success('註冊成功')
      navigate("/dashboard")
    } catch {
      setError("註冊失敗，此信箱可能已被使用")
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm p-8 bg-card rounded-xl border border-border shadow-sm">
        <h1 className="text-2xl font-bold text-foreground mb-1">建立帳號</h1>
        <p className="text-sm text-muted-foreground mb-6">開始使用 SprintFlow</p>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">姓名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="你的名字"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">電子郵件</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="至少 6 個字元"
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            className="w-full py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            註冊
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          已有帳號？{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            登入
          </Link>
        </p>
      </div>
    </div>
  )
}