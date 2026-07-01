//個人任務狀態統計
// 從 useActiveSprintTasks 撈到的原始資料中，彙整「指派給自己」的任務狀態分佈 純計算
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
    for (const group of groups) { // 外層 遍歷每個「Sprint 群組」每個群組就是一個active 的 sprint 
      for (const task of group.tasks) { // 內層：遍歷這個群組裡的每一個任務
        if (task.assigneeId !== user?.uid) continue
        if (task.status === "todo") todo++
        else if (task.status === "in_progress") in_progress++
        else if (task.status === "review") review++
        else if (task.status === "done") done++
      }
    }

    const total = todo + in_progress + review + done
    return { total, todo, in_progress, review, done, loading }
  }, [groups, user?.uid, loading]) // 依賴陣列：groups  user.uid  loading 有變化時才重新計算
}
