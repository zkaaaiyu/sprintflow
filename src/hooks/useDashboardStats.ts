// useDashboardStats — 彙整用戶所有專案中 active sprint 的任務狀態分佈
// 查詢流程：projects → active sprints → tasks → 只計算指派給當前用戶的任務
import { useState, useEffect } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import type { Project } from "@/hooks/useWorkspace"

export type DashboardStats = {
  total: number
  todo: number
  in_progress: number
  review: number
  done: number
  loading: boolean
}

export function useDashboardStats(projects: Project[], projectsLoading: boolean) {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    total: 0, todo: 0, in_progress: 0, review: 0, done: 0, loading: true,
  })

  // 用 join 字串當穩定的依賴項，避免 reference 比較造成無限觸發
  const projectIdsKey = projects.map((p) => p.id).join(",")

  useEffect(() => {
    if (projectsLoading) return // 等 workspace 載入完再查

    if (projects.length === 0) {
      setStats({ total: 0, todo: 0, in_progress: 0, review: 0, done: 0, loading: false })
      return
    }

    const fetchStats = async () => {
      let todo = 0, in_progress = 0, review = 0, done = 0

      // 對每個專案查詢 active sprint，再查詢其任務
      for (const project of projects) {
        const sprintsSnap = await getDocs(
          query(
            collection(db, "projects", project.id, "sprints"),
            where("status", "==", "active")
          )
        )

        for (const sprintDoc of sprintsSnap.docs) {
          const tasksSnap = await getDocs(
            query(
              collection(db, "projects", project.id, "tasks"),
              where("sprintId", "==", sprintDoc.id)
            )
          )

          // 只計算指派給當前用戶的任務
          tasksSnap.docs
            .filter((t) => t.data().assigneeId === user?.uid)
            .forEach((t) => {
              const s = t.data().status
              if (s === "todo") todo++
              else if (s === "in_progress") in_progress++
              else if (s === "review") review++
              else if (s === "done") done++
            })
        }
      }

      const total = todo + in_progress + review + done
      setStats({ total, todo, in_progress, review, done, loading: false })
    }

    fetchStats()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectIdsKey, projectsLoading])

  return stats
}
