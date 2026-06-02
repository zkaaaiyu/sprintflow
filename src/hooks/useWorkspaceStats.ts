// useWorkspaceStats — 查詢 workspace 首頁所需的三個統計數字
// 資料範圍：當前使用者所在的所有 project > active sprint > tasks
import { useState, useEffect } from "react"
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"

type Project = { id: string }

export type WorkspaceStats = {
  dueTodayCount: number       // 今天到期且未完成（指派給自己）
  completedThisWeekCount: number  // active sprint 中已完成（指派給自己，近似值）
  activeSprintsCount: number  // 所有 project 的 active sprint 數
  overdueCount: number        // 逾期且未完成（指派給自己）
  loading: boolean
}

export function useWorkspaceStats(projects: Project[], projectsLoading: boolean): WorkspaceStats {
  const { user } = useAuth()
  const [stats, setStats] = useState<WorkspaceStats>({
    dueTodayCount: 0,
    completedThisWeekCount: 0,
    activeSprintsCount: 0,
    overdueCount: 0,
    loading: true,
  })

  // 用 join 字串穩定 useEffect 依賴
  const projectIdsKey = projects.map((p) => p.id).join(",")

  useEffect(() => {
    if (projectsLoading || !user) return
    if (projects.length === 0) { setStats((s) => ({ ...s, loading: false })); return }

    const fetchStats = async () => {
      const now = new Date()
      // 今日 00:00 和明日 00:00
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

      let dueTodayCount = 0
      let completedThisWeekCount = 0
      let activeSprintsCount = 0
      let overdueCount = 0

      for (const project of projects) {
        // 取得 active sprint
        const sprintSnap = await getDocs(
          query(collection(db, "projects", project.id, "sprints"), where("status", "==", "active"))
        )
        activeSprintsCount += sprintSnap.size

        for (const sprintDoc of sprintSnap.docs) {
          const tasksSnap = await getDocs(
            query(collection(db, "projects", project.id, "tasks"), where("sprintId", "==", sprintDoc.id))
          )

          tasksSnap.docs.forEach((t) => {
            const data = t.data()
            // 只計算指派給自己的任務
            if (data.assigneeId !== user.uid) return

            const dueDate = data.dueDate ? (data.dueDate as Timestamp).toDate() : null
            const isDone  = data.status === "done"

            if (isDone) {
              completedThisWeekCount++
            } else if (dueDate) {
              if (dueDate < todayStart)   overdueCount++
              else if (dueDate < todayEnd) dueTodayCount++
            }
          })
        }
      }

      setStats({ dueTodayCount, completedThisWeekCount, activeSprintsCount, overdueCount, loading: false })
    }

    fetchStats()
  }, [projectIdsKey, projectsLoading, user])

  return stats
}
