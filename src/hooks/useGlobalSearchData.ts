// useGlobalSearchData — 為 Command Palette 準備「全部搜尋得到的資料」
// 做法跟 useActiveSprintsSummary.ts 一樣：手動 getDocs 撈一次，不用 onSnapshot 即時監聽
// （搜尋面板本來就是開啟時看一次的快照，不需要為了即時性付出持續監聽 Firestore 的成本）
import { useState, useEffect } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useWorkspace } from "@/hooks/useWorkspace"
import type { Priority } from "@/hooks/useTasks"

export type SearchProject = {
  id: string
  name: string
  description: string
  color: string
}

export type SearchSprint = {
  id: string
  name: string
  goal: string
  projectId: string
  projectName: string
}

export type SearchTask = {
  id: string
  title: string
  description: string
  priority: Priority
  labels: string[]
  projectId: string
  projectName: string
  sprintId: string | null
  sprintName: string | null
}

export function useGlobalSearchData(isOpen: boolean) {
  const { projects, loading: projectsLoading } = useWorkspace()
  const [searchProjects, setSearchProjects] = useState<SearchProject[]>([])
  const [searchSprints, setSearchSprints] = useState<SearchSprint[]>([])
  const [searchTasks, setSearchTasks] = useState<SearchTask[]>([])
  const [loading, setLoading] = useState(false)
  // 是否已經抓過資料：避免每次打開 Command Palette 都重新打 Firestore
  const [fetched, setFetched] = useState(false)

  useEffect(() => {
    if (!isOpen || fetched || projectsLoading) return

    const fetchAll = async () => {
      setLoading(true)
      const sprintsResult: SearchSprint[] = []
      const tasksResult: SearchTask[] = []

      // 平行查詢每個 project 各自的 sprints / tasks 子集合
      await Promise.all(
        projects.map(async (project) => {
          const [sprintSnap, taskSnap] = await Promise.all([
            getDocs(collection(db, "projects", project.id, "sprints")),
            getDocs(collection(db, "projects", project.id, "tasks")),
          ])

          // 先建一張 sprintId -> sprintName 對照表，task 顯示「所屬 sprint」時要用
          const sprintNameById: Record<string, string> = {}
          sprintSnap.docs.forEach((d) => {
            const data = d.data()
            sprintNameById[d.id] = data.name
            sprintsResult.push({
              id: d.id,
              name: data.name,
              goal: data.goal ?? "",
              projectId: project.id,
              projectName: project.name,
            })
          })

          taskSnap.docs.forEach((d) => {
            const data = d.data()
            const sprintId: string | null = data.sprintId ?? null
            tasksResult.push({
              id: d.id,
              title: data.title,
              description: data.description ?? "",
              priority: data.priority,
              labels: data.labels ?? [],
              projectId: project.id,
              projectName: project.name,
              sprintId,
              sprintName: sprintId ? sprintNameById[sprintId] ?? null : null,
            })
          })
        })
      )

      setSearchProjects(
        projects.map((p) => ({ id: p.id, name: p.name, description: p.description, color: p.color }))
      )
      setSearchSprints(sprintsResult)
      setSearchTasks(tasksResult)
      setLoading(false)
      setFetched(true)
    }

    fetchAll()
  }, [isOpen, fetched, projectsLoading, projects])

  return { searchProjects, searchSprints, searchTasks, loading }
}
