// useWorkspaceStats — 從 useActiveSprintTasks 撈到的原始資料中，彙整 workspace 首頁所需的三個統計數字 （純計算 不查資料庫）
import { useMemo } from "react" 
import { useAuth } from "@/contexts/AuthContext"
import type { ActiveSprintGroup } from "@/hooks/useActiveSprintTasks"

export type WorkspaceStats = {
  dueTodayCount: number       // 今天到期且未完成（指派給自己）
  completedThisWeekCount: number  // active sprint 中已完成（指派給自己，近似值）
  activeSprintsCount: number  // 所有 project 的 active sprint 數
  overdueCount: number        // 逾期且未完成（指派給自己）
  loading: boolean
}

// useActiveSprintTasks()  →  取得 groups（每個 active sprint + 底下的 tasks）
//        ↓
// ProjectsPage（父元件）
//        ↓
// useWorkspaceStats(groups, loading)  →  只做計算，不查 Firestore

export function useWorkspaceStats(groups: ActiveSprintGroup[], loading: boolean): WorkspaceStats {
  const { user } = useAuth()

  return useMemo(() => {
    const now = new Date()
    // 今日 00:00 和明日 00:00
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    let dueTodayCount = 0
    let completedThisWeekCount = 0
    let overdueCount = 0
    
  // ─── 雙層迴圈：跑完所有 sprint 底下的所有 task ───
    for (const group of groups) {
      for (const task of group.tasks) {
        // 只計算指派給自己的任務
        if (task.assigneeId !== user?.uid) continue

        if (task.status === "done") {
          completedThisWeekCount++
        } else if (task.dueDate) {
          if (task.dueDate < todayStart)   overdueCount++
          else if (task.dueDate < todayEnd) dueTodayCount++
        }
      }
    }

    return {
      dueTodayCount,
      completedThisWeekCount,
      activeSprintsCount: groups.length,
      overdueCount,
      loading,
    }
  }, [groups, user?.uid, loading])
}
