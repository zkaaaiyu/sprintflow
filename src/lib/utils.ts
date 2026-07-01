// 工具函式：cn() 合併 Tailwind class、avatarColor() 產生頭像顏色
import { clsx, type ClassValue } from "clsx" 
import { twMerge } from "tailwind-merge" 

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
// ─── 頭像背景顏色色盤 ───
const AVATAR_PALETTE = [
  "#C4938A", // dusty rose
  "#8FA898", // sage
  "#7A8FA6", // steel blue
  "#9B8FA8", // dusty lavender
  "#B89880", // warm taupe
  "#7A9E9F", // muted teal
  "#A8848F", // dusty mauve
  "#8A9472", // muted olive
]

// 一個uid對應一個顏色
export function avatarColor(seed: string): string {      //seed參數是用戶id
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}
