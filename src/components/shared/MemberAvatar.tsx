import type { UserProfile } from "@/hooks/useMembers"
import { avatarColor } from "@/lib/utils"

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
    <div
      className={`${sz} rounded-full flex items-center justify-center text-white font-semibold shrink-0`}
      style={{ backgroundColor: avatarColor(user.uid) }}
    >
      {initials}
    </div>
  )
}
