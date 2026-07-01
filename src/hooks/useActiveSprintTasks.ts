// useActiveSprintTasks — 撈出所有專案目前 active sprint 及其底下任務的「原始資料」
// 在 useDashboardStats 跟 useActiveSprintsSummary 會用到
import { useState, useEffect } from "react"
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { TaskStatus } from "@/hooks/useTasks"
import type { Project } from "@/hooks/useWorkspace"

//定義ActiveSprint單一任務的型別
export type ActiveSprintTask = {
  id: string
  status: TaskStatus           // "todo" | "in_progress" | "review" | "done"
  assigneeId: string | null    // 指派人的 uid（可能沒有）
  storyPoints: number | null   // 故事點數（可能沒有）
  dueDate: Date | null         // 截止日（可能沒有）
}

// 定義「Sprint 群組」的型別
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
  // 這兩個參數 都是從 useWorkspace 來的 再從 DashboardPage 傳入
  const [groups, setGroups] = useState<ActiveSprintGroup[]>([])
  const [loading, setLoading] = useState(true)

  // 用 join 字串作穩定的 useEffect 依賴，避免每次 render 的陣列參考不同
  const projectIdsKey = projects.map((p) => p.id).join(",")

  useEffect(() => {
    if (projectsLoading) return
    if (projects.length === 0) { setGroups([]); setLoading(false); return }

    const fetchData = async () => {
      setLoading(true)

      // Promise.all 讓所有 project 的 sprint 查詢同時發出
      const groups = await Promise.all(
        projects.map(async (project): Promise<ActiveSprintGroup | null> => {
        // .map 把每個 project 轉換成一個 Promise - 有 active sprint → 回傳 ActiveSprintGroup 沒有就回傳null
          const sprintSnap = await getDocs(
            query(
              collection(db, "projects", project.id, "sprints"),
              where("status", "==", "active")
            )
          )
          if (sprintSnap.empty) return null // 用firestore  QuerySnapshot 裡面的 .empty 如果回傳true代表空 回傳null

          const sprintDoc = sprintSnap.docs[0] //理論上一個sprint只會有一個active的所以取第一個
          const sprintData = sprintDoc.data()

          // sprint 查到後，立即發出 tasks 查詢
          const tasksSnap = await getDocs(
            query(
              collection(db, "projects", project.id, "tasks"),
              where("sprintId", "==", sprintDoc.id)
            )
          )

          return {
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
          }
        })
      )

      setGroups(groups.filter((g): g is ActiveSprintGroup => g !== null))
      // .filter(g => g !== null) 過濾掉 null（沒有 active sprint 的專案）
      // (g): g is ActiveSprintGroup → 過濾型別完後只會是ActiveSprintGroup 這個型別
      setLoading(false)
    }

    fetchData()
  }, [projectIdsKey, projectsLoading])

  return { groups, loading }
}
