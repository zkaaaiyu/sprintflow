// useActiveSprintsSummary — 從 useActiveSprintTasks 撈到的原始資料中，彙整每個 active sprint 的 SP 進度摘要  純計算
import { useMemo } from "react"
import type { ActiveSprintGroup } from "@/hooks/useActiveSprintTasks"

export type ActiveSprintSummary = {
  projectId: string
  projectName: string
  projectColor: string
  sprintId: string
  sprintName: string
  startDate: Date | null
  endDate: Date | null
  daysLeft: number | null   // null = 無截止日
  totalTasks: number
  totalSP: number
  doneSP: number
  percentage: number        // doneSP / totalSP * 100，無 SP 時為 0
}

export function useActiveSprintsSummary(groups: ActiveSprintGroup[], loading: boolean) {
// 參數 groups：從 useActiveSprintTasks 傳進來的原始資料（每個專案的 active sprint + tasks）
  const summaries = useMemo<ActiveSprintSummary[]>(() => {
    return groups.map((group) => {
      let totalSP = 0
      let doneSP = 0
      for (const task of group.tasks) {
        const sp = task.storyPoints ?? 0
        totalSP += sp
        if (task.status === "done") doneSP += sp
      }

      // 計算剩餘天數
      const daysLeft = group.endDate
        ? Math.ceil((group.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null

      const percentage = totalSP > 0 ? Math.round((doneSP / totalSP) * 100) : 0

      return {
        projectId: group.projectId,
        projectName: group.projectName,
        projectColor: group.projectColor,
        sprintId: group.sprintId,
        sprintName: group.sprintName,
        startDate: group.startDate,
        endDate: group.endDate,
        daysLeft,
        totalTasks: group.tasks.length,
        totalSP,
        doneSP,
        percentage,
      }
    })
  }, [groups])

  return { summaries, loading }
}
