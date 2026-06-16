// useDashboardStats — 從 useActiveSprintTasks 撈到的原始資料中，彙整「指派給自己」的任務狀態分佈
// 純計算（不再自己查 Firestore），資料來源由外部傳入的 groups 提供
import { useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import type { ActiveSprintGroup } from "@/hooks/useActiveSprintTasks"

//定義 DashboardStats 型別
export type DashboardStats = {
  total: number
  todo: number
  in_progress: number
  review: number
  done: number
  loading: boolean
}

export function useDashboardStats(groups: ActiveSprintGroup[], loading: boolean): DashboardStats {
  const { user } = useAuth()

  return useMemo(() => {
    let todo = 0, in_progress = 0, review = 0, done = 0 //先歸零

    // 只計算當前登入用戶的任務
    for (const group of groups) {
      for (const task of group.tasks) {
        if (task.assigneeId !== user?.uid) continue
        if (task.status === "todo") todo++
        else if (task.status === "in_progress") in_progress++
        else if (task.status === "review") review++
        else if (task.status === "done") done++
      }
    }

    const total = todo + in_progress + review + done
    return { total, todo, in_progress, review, done, loading }
  }, [groups, user?.uid, loading])
}
