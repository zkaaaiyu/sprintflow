// 處理顯示成員頭像或文字縮寫
import type { UserProfile } from "@/hooks/useMembers"
import { avatarColor } from "@/lib/utils"

const SIZE_CLASS = {
  sm: "w-6 h-6 text-[10px]",
  md: "w-7 h-7 text-[10px]",
  lg: "w-8 h-8 text-xs",
} as const // 告訴 TypeScript 這個物件是「唯讀常數」不可修改

export function MemberAvatar({
  user,
  size = "sm",
}: {
  user: UserProfile
  size?: keyof typeof SIZE_CLASS //size是可選項
}) {
  const sz = SIZE_CLASS[size]
  //縮寫的計算邏輯
  const initials = user.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user.email[0].toUpperCase()
  // 縮寫計算步驟拆解：
  // user.displayName = "Felix Yang"
  // .split(" ")          → ["Felix", "Yang"]        把名字按空格拆開
  // .map((n) => n[0])    → ["F", "Y"]               每個字只取第一個字母
  // .join("")            → "FY"                     合併成一個字串
  // .slice(0, 2)         → "FY"                     最多取 2 個字（防止三字名太長）
  // .toUpperCase()       → "FY"                     轉大寫

  if (user.photoURL) { //有照片直接用
    return (
      <img
        src={user.photoURL}
        alt={user.displayName}
        referrerPolicy="no-referrer"
        className={`${sz} rounded-full object-cover shrink-0`}
      />
    )
  }
  return (  // 沒照片顯示縮寫加背景色
    <div
      className={`${sz} rounded-full flex items-center justify-center text-white font-semibold shrink-0`}
      style={{ backgroundColor: avatarColor(user.uid) }}
    >
      {initials}
    </div>
  )
}
