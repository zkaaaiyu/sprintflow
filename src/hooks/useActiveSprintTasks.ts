// useActiveSprintTasks — 撈出所有專案目前 active sprint 及其底下任務的「原始資料」
// 被 useDashboardStats 跟 useActiveSprintsSummary 共用，避免兩邊各自對 Firestore 查一次同樣的東西
import { useState, useEffect } from "react"
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { TaskStatus } from "@/hooks/useTasks"

type Project = {
  id: string
  name: string
  color: string
}

export type ActiveSprintTask = {
  id: string
  status: TaskStatus
  assigneeId: string | null
  storyPoints: number | null
  dueDate: Date | null
}

export type ActiveSprintGroup = {
  projectId: string
  projectName: string
  projectColor: string
  sprintId: string
  sprintName: string
  startDate: Date | null
  endDate: Date | null
  tasks: ActiveSprintTask[]
}

export function useActiveSprintTasks(projects: Project[], projectsLoading: boolean) {
  const [groups, setGroups] = useState<ActiveSprintGroup[]>([])
  const [loading, setLoading] = useState(true)

  // 用 join 字串作穩定的 useEffect 依賴，避免每次 render 的陣列參考不同
  const projectIdsKey = projects.map((p) => p.id).join(",")

  useEffect(() => {
    if (projectsLoading) return
    if (projects.length === 0) { setGroups([]); setLoading(false); return }

    const fetchData = async () => {
      setLoading(true)
      const result: ActiveSprintGroup[] = []

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

          // 取得該 sprint 所有任務（只抓統計需要的欄位）
          const tasksSnap = await getDocs(
            query(
              collection(db, "projects", project.id, "tasks"),
              where("sprintId", "==", sprintDoc.id)
            )
          )

          result.push({
            projectId: project.id,
            projectName: project.name,
            projectColor: project.color,
            sprintId: sprintDoc.id,
            sprintName: sprintData.name ?? "Active Sprint",
            startDate: sprintData.startDate ? (sprintData.startDate as Timestamp).toDate() : null,
            endDate: sprintData.endDate ? (sprintData.endDate as Timestamp).toDate() : null,
            tasks: tasksSnap.docs.map((t) => {
              const data = t.data()
              return {
                id: t.id,
                status: data.status as TaskStatus,
                assigneeId: data.assigneeId ?? null,
                storyPoints: data.storyPoints ?? null,
                dueDate: data.dueDate ? (data.dueDate as Timestamp).toDate() : null,
              }
            }),
          })
        }
      }

      setGroups(result)
      setLoading(false)
    }

    fetchData()
  }, [projectIdsKey, projectsLoading])

  return { groups, loading }
}
