// useActiveSprintsSummary — 查詢當前使用者所在所有 project 的 active sprint 摘要
// 資料路徑：projects/{id}/sprints（status=active）+ projects/{id}/tasks（sprintId=...）
import { useState, useEffect } from "react"
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"

type Project = {
  id: string
  name: string
  color: string
}

export type ActiveSprintSummary = {
  projectId: string
  projectName: string
  projectColor: string
  sprintId: string
  sprintName: string
  daysLeft: number | null   // null = 無截止日
  totalSP: number
  doneSP: number
  percentage: number        // doneSP / totalSP * 100，無 SP 時為 0
}

export function useActiveSprintsSummary(projects: Project[], projectsLoading: boolean) {
  const { user } = useAuth()
  const [summaries, setSummaries] = useState<ActiveSprintSummary[]>([])
  const [loading, setLoading] = useState(true)

  // 用 join 字串作穩定的 useEffect 依賴，避免每次 render 的陣列參考不同
  const projectIdsKey = projects.map((p) => p.id).join(",")

  useEffect(() => {
    if (projectsLoading || !user) return
    if (projects.length === 0) { setLoading(false); return }

    const fetchData = async () => {
      setLoading(true)
      const result: ActiveSprintSummary[] = []

      for (const project of projects) {
        // 每個 project 最多一個 active sprint
        const sprintSnap = await getDocs(
          query(
            collection(db, "projects", project.id, "sprints"),
            where("status", "==", "active")
          )
        )

        for (const sprintDoc of sprintSnap.docs) {
          const sprintData = sprintDoc.data()

          // 計算剩餘天數
          let daysLeft: number | null = null
          if (sprintData.endDate) {
            const end = (sprintData.endDate as Timestamp).toDate()
            daysLeft = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          }

          // 取得該 sprint 所有任務
          const tasksSnap = await getDocs(
            query(
              collection(db, "projects", project.id, "tasks"),
              where("sprintId", "==", sprintDoc.id)
            )
          )

          let totalSP = 0
          let doneSP = 0
          tasksSnap.docs.forEach((t) => {
            const sp = t.data().storyPoints ?? 0
            totalSP += sp
            if (t.data().status === "done") doneSP += sp
          })

          const percentage = totalSP > 0 ? Math.round((doneSP / totalSP) * 100) : 0

          result.push({
            projectId: project.id,
            projectName: project.name,
            projectColor: project.color,
            sprintId: sprintDoc.id,
            sprintName: sprintData.name ?? "Active Sprint",
            daysLeft,
            totalSP,
            doneSP,
            percentage,
          })
        }
      }

      setSummaries(result)
      setLoading(false)
    }

    fetchData()
  }, [projectIdsKey, projectsLoading, user])

  return { summaries, loading }
}
