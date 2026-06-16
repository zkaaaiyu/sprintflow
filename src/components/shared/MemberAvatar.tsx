// MemberAvatar — 共用的成員頭像元件：有照片就顯示照片，沒有就顯示名字縮寫
import type { UserProfile } from "@/hooks/useMembers"

const SIZE_CLASS = {
  sm: "w-6 h-6 text-[10px]",
  md: "w-7 h-7 text-[10px]",
  lg: "w-8 h-8 text-xs",
} as const

export function MemberAvatar({
  user,
  size = "sm",
}: {
  user: UserProfile
  size?: keyof typeof SIZE_CLASS
}) {
  const sz = SIZE_CLASS[size]
  const initials = user.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user.email[0].toUpperCase()

  if (user.photoURL) {
    return (
      <img
        src={user.photoURL}
        alt={user.displayName}
        referrerPolicy="no-referrer"
        className={`${sz} rounded-full object-cover shrink-0`}
      />
    )
  }
  return (
    <div className={`${sz} rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold shrink-0`}>
      {initials}
    </div>
  )
}
