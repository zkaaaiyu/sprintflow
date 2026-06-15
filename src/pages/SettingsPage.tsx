import { useState, useRef, useEffect } from "react"
import {
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
} from "firebase/auth"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { doc, updateDoc } from "firebase/firestore"
import { auth, db, storage } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  Camera, Sun, Moon, Lock, LogOut, Trash2,
  Globe, Bell, ChevronRight, Eye, EyeOff, Ban, AlertCircle,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"

// 判斷是否為 Google 登入（沒有 password provider）
function isGoogleUser(user: ReturnType<typeof useAuth>["user"]) {
  if (!user) return false
  return user.providerData.every((p) => p.providerId !== "password")
}

// 區段標題（左側說明欄）
function SectionLabel({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="w-72 shrink-0">
      <p className="font-semibold text-base text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{desc}</p>
    </div>
  )
}

// 分隔線
function Divider() {
  return <div className="border-t border-border" />
}

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Profile ──
  const [displayName, setDisplayName] = useState(user?.displayName ?? "")
  const [avatarSrc, setAvatarSrc] = useState(user?.photoURL ?? "")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  // ── Security ──
  const [pwOpen, setPwOpen] = useState(false)
  const [currentPw, setCurrentPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [savingPw, setSavingPw] = useState(false)

  // ── Theme ──
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark")

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }, [dark])

  // ── Delete Account ──
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePw, setDeletePw] = useState("")
  const [deleting, setDeleting] = useState(false)

  const googleUser = isGoogleUser(user)

  // ── Language ──
  const [lang, setLang] = useState<"zh" | "en">("zh")

  // ── Notifications ──
  const [notifActive, setNotifActive] = useState<Record<string, boolean>>({})
  const [shakingKey, setShakingKey] = useState<string | null>(null)

  const handleNotifClick = (key: string) => {
    setNotifActive((prev) => ({ ...prev, [key]: !prev[key] }))
    setShakingKey(key)
    setTimeout(() => setShakingKey(null), 600)
    toast.info("This feature is coming soon")
  }

  // 選擇頭貼圖片後預覽
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarSrc(URL.createObjectURL(file))  // 本地預覽
  }

  // 儲存 Profile
  const handleSaveProfile = async () => {
    if (!user) return
    setSavingProfile(true)
    try {
      let photoURL = user.photoURL ?? ""

      // 有新圖片才上傳到 Firebase Storage
      if (avatarFile) {
        const storageRef = ref(storage, `avatars/${user.uid}`)
        await uploadBytes(storageRef, avatarFile)
        photoURL = await getDownloadURL(storageRef)
      }

      // 更新 Firebase Auth profile
      await updateProfile(user, { displayName: displayName.trim(), photoURL })

      // 同步到 Firestore users 集合
      await updateDoc(doc(db, "users", user.uid), {
        displayName: displayName.trim(),
        photoURL,
      })

      toast.success("Profile updated")
    } catch {
      toast.error("Failed to update profile")
    } finally {
      setSavingProfile(false)
    }
  }

  // 更改密碼
  const handleChangePassword = async () => {
    if (!user?.email) return
    if (newPw.length < 6) { toast.error("New password must be at least 6 characters"); return }
    setSavingPw(true)
    try {
      // Firebase 要求「先重新驗證」才能改密碼
      const credential = EmailAuthProvider.credential(user.email, currentPw)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, newPw)
      toast.success("Password updated")
      setPwOpen(false)
      setCurrentPw(""); setNewPw("")
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        toast.error("Current password is incorrect")
      } else {
        toast.error("Failed to update password")
      }
    } finally {
      setSavingPw(false)
    }
  }

  // 刪除帳號
  const handleDeleteAccount = async () => {
    if (!user) return
    setDeleting(true)
    try {
      if (!googleUser && user.email) {
        // Email 用戶需要重新驗證
        const credential = EmailAuthProvider.credential(user.email, deletePw)
        await reauthenticateWithCredential(user, credential)
      }
      await deleteUser(user)
      navigate("/login")
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        toast.error("Incorrect password")
      } else if (code === "auth/requires-recent-login") {
        toast.error("Please log out and log back in before deleting your account")
      } else {
        toast.error("Failed to delete account")
      }
    } finally {
      setDeleting(false)
    }
  }

  const handleSignOut = async () => {
    await logout()
    navigate("/login")
  }

  // 頭像縮寫（沒有圖片時顯示）
  const initials = (displayName || user?.email || "U")
    .split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()

  return (
    <div className="max-w-[1100px] mx-auto py-8 space-y-4">

      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account preferences</p>
      </div>

      {/* ── 上方卡片：Profile ── */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-8 flex items-center gap-10">

          {/* 左：頭像 */}
          <div className="relative shrink-0">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt="avatar"
                referrerPolicy="no-referrer"
                className="w-24 h-24 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                style={{ backgroundColor: "var(--brand)" }}
              >
                {initials}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md border-2 border-card"
              style={{ backgroundColor: "var(--brand)" }}
            >
              <Camera className="w-4 h-4 text-white" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* 中：名稱 + Email 顯示 */}
          <div className="shrink-0">
            <p className="text-xl font-bold">{displayName || "—"}</p>
            <div className="relative group w-fit mt-0.5">
              <p className="text-sm text-muted-foreground cursor-default">{user?.email}</p>
              {/* hover tooltip */}
              <div className="absolute left-0 top-full mt-1.5 bg-foreground text-background text-xs px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-md">
                Email cannot be changed
              </div>
            </div>
          </div>

          {/* 右：編輯欄 */}
          <div className="flex-1 flex items-end gap-4 justify-end">
            <div className="w-72 space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Display name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1 px-4"
              />
            </div>
            <Button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="h-11 bg-brand hover:bg-brand-hover text-white rounded-full px-8 shrink-0"
            >
              {savingProfile ? "Saving..." : "Save"}
            </Button>
          </div>

        </div>
      </div>

      {/* ── 下方卡片：其他設定 ── */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">

        {/* Security */}
        <div className="p-8 flex gap-10">
          <SectionLabel title="Security" desc="Manage your login and password settings." />
          <div className="flex-1 space-y-3">
            <div
              className={`flex items-center justify-between px-4 py-3.5 rounded-xl border transition-colors ${
                googleUser
                  ? "opacity-40 cursor-not-allowed border-border"
                  : "cursor-pointer border-border hover:bg-accent"
              }`}
              onClick={() => !googleUser && setPwOpen(true)}
              title={googleUser ? "Google accounts cannot change password directly" : undefined}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--subtle-bg)" }}>
                  <Lock className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Change Password</p>
                  <p className="text-sm text-muted-foreground">
                    {googleUser ? "Not available for Google accounts" : "Update your login password"}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        <Divider />

        {/* Appearance */}
        <div className="p-8 flex gap-10">
          <SectionLabel title="Appearance" desc="Customize the interface to your preferences." />
          <div className="flex-1 space-y-4">
            <Label className="text-sm font-semibold text-muted-foreground">Theme mode</Label>
            <div className="flex gap-3">
              <button
                onClick={() => setDark(false)}
                className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl border-2 transition-all ${
                  !dark ? "border-brand bg-brand/5" : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <Sun className="w-4 h-4" style={{ color: !dark ? "var(--brand)" : undefined }} />
                <span className="text-sm font-medium" style={{ color: !dark ? "var(--brand)" : undefined }}>Light</span>
              </button>
              <button
                onClick={() => setDark(true)}
                className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl border-2 transition-all ${
                  dark ? "border-brand bg-brand/5" : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <Moon className="w-4 h-4" style={{ color: dark ? "var(--brand)" : undefined }} />
                <span className="text-sm font-medium" style={{ color: dark ? "var(--brand)" : undefined }}>Dark</span>
              </button>
            </div>
          </div>
        </div>

        <Divider />

        {/* Language */}
        <div className="p-8 flex gap-10">
          <SectionLabel title="Language" desc="Choose your preferred display language." />
          <div className="flex-1 space-y-4">
            <Label className="text-sm font-semibold text-muted-foreground">Display language</Label>
            <div className="grid grid-cols-3 gap-3">
              {([
                { key: "zh", label: "中文",     sub: "Traditional Chinese", available: true  },
                { key: "en", label: "English",   sub: "English",             available: true  },
                { key: "ja", label: "日本語",    sub: "Japanese",            available: false },
                { key: "ko", label: "한국어",    sub: "Korean",              available: false },
                { key: "fr", label: "Français",  sub: "French",              available: false },
                { key: "de", label: "Deutsch",   sub: "German",              available: false },
              ] as const).map(({ key, label, sub, available }) => (
                <button
                  key={key}
                  onClick={() => available && setLang(key as "zh" | "en")}
                  disabled={!available}
                  className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                    available
                      ? lang === key
                        ? "border-brand bg-brand/5"
                        : "border-border hover:border-muted-foreground/30 cursor-pointer"
                      : "border-border opacity-40 cursor-not-allowed"
                  }`}
                >
                  <Globe className="w-4 h-4 shrink-0" style={{ color: available && lang === key ? "var(--brand)" : undefined }} />
                  <div>
                    <p className="text-sm font-medium leading-none" style={{ color: available && lang === key ? "var(--brand)" : undefined }}>{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                  </div>
                  {/* hover 禁止圖示（只在不可用時顯示） */}
                  {!available && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 transition-opacity bg-muted/60">
                      <Ban className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Divider />

        {/* Notifications */}
        <div className="p-8 flex gap-10">
          <SectionLabel title="Notifications" desc="Control when and how you receive alerts." />
          <div className="flex-1 space-y-4">
            <Label className="text-sm font-semibold text-muted-foreground">Notification types</Label>
            <div className="flex gap-3">
              {[
                { key: "email", label: "Email Notifications", desc: "Deadlines & updates" },
                { key: "due",   label: "Due Date Reminders",  desc: "Alerts before tasks expire" },
              ].map((item) => {
                const active = !!notifActive[item.key]
                const shaking = shakingKey === item.key
                return (
                  <button
                    key={item.key}
                    onClick={() => handleNotifClick(item.key)}
                    className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl border-2 transition-all ${
                      active ? "border-brand bg-brand/5" : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <Bell
                      className={`w-4 h-4 shrink-0 ${shaking ? "bell-shake" : ""}`}
                      style={{ color: active ? "var(--brand)" : "var(--muted-foreground)" }}
                    />
                    <span className="text-sm font-medium" style={{ color: active ? "var(--brand)" : undefined }}>
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <Divider />

        {/* Danger Zone */}
        <div className="p-8 flex gap-10">
          <SectionLabel title="Danger zone" desc="Irreversible actions. Proceed with caution." />
          <div className="flex-1 space-y-4">
            <Label className="text-sm font-semibold text-muted-foreground">Account actions</Label>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteOpen(true)}
                className="flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl border-2 border-destructive/40 hover:bg-destructive/5 transition-all"
              >
                <Trash2 className="w-4 h-4 text-destructive shrink-0" />
                <span className="text-sm font-medium text-destructive">Delete account</span>
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl border-2 border-destructive/40 hover:bg-destructive/5 transition-all"
              >
                <LogOut className="w-4 h-4 text-destructive shrink-0" />
                <span className="text-sm font-medium text-destructive">Sign out</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ── Change Password Dialog ── */}
      <Dialog open={pwOpen} onOpenChange={(o) => { if (!o) { setPwOpen(false); setCurrentPw(""); setNewPw("") } }}>
        <DialogContent className="sm:max-w-md rounded-2xl p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-bold">Change Password</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground">Current password</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="Enter current password"
                  className="rounded-xl bg-muted border-0 h-11 px-4 pr-10 focus-visible:ring-1"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground">New password</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="At least 6 characters"
                  className="rounded-xl bg-muted border-0 h-11 px-4 pr-10 focus-visible:ring-1"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <Button variant="ghost" onClick={() => setPwOpen(false)}>Cancel</Button>
            <Button
              onClick={handleChangePassword}
              disabled={savingPw || !currentPw || !newPw}
              className="bg-brand hover:bg-brand-hover text-white rounded-full px-8"
            >
              {savingPw ? "Updating..." : "Update password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Account Dialog ── */}
      <Dialog open={deleteOpen} onOpenChange={(o) => { if (!o) { setDeleteOpen(false); setDeletePw("") } }}>
        <DialogContent className="sm:max-w-sm rounded-3xl p-8">
          <DialogHeader className="mb-4">
            <AlertCircle className="w-7 h-7 text-destructive mb-3" />
            <DialogTitle className="text-xl font-bold text-destructive">Delete Account</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            This will permanently delete your account and all associated data.
          </p>
          <blockquote className="border-l-2 border-destructive pl-3 mb-6">
            <p className="text-sm font-semibold">This action cannot be undone.</p>
          </blockquote>

          {!googleUser && (
            <div className="space-y-2 mb-6">
              <Label className="text-sm font-semibold text-muted-foreground">Enter your password to confirm</Label>
              <Input
                type="password"
                value={deletePw}
                onChange={(e) => setDeletePw(e.target.value)}
                placeholder="Your current password"
                className="rounded-xl bg-muted border-0 h-11 px-4 focus-visible:ring-1"
              />
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1 rounded-full" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              className="flex-1 rounded-full bg-destructive hover:opacity-90 text-white"
              disabled={deleting || (!googleUser && !deletePw)}
              onClick={handleDeleteAccount}
            >
              {deleting ? "Deleting..." : "Delete my account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}