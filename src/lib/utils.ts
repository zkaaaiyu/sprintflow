import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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

// 將任意字串（uid 或 name）穩定對應到一個顏色，同一個人在所有元件顏色一致
export function avatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}
