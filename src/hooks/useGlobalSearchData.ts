//這個 hook 負責在 Command Palette 第一次打開時，一次把所有專案、Sprint、任務都撈進來，
// 讓後面的 Fuse.js 搜尋可以在本地端直接查，不用每次打字都查一次 Firestore。

import { useState, useEffect } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useWorkspace } from "@/hooks/useWorkspace"
import type { Priority } from "@/hooks/useTasks"

// 定義查詢資料的型別

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
      // 先建空陣列，每個 project 的結果都 push 進來
      const sprintsResult: SearchSprint[] = []
      const tasksResult: SearchTask[] = []

       // 外層 Promise.all：所有 project 同時查，不等前一個完成
      await Promise.all(
        projects.map(async (project) => {
          // 內層 Promise.all：同一個 project 的 sprints 和 tasks 同時查
          const [sprintSnap, taskSnap] = await Promise.all([
            getDocs(collection(db, "projects", project.id, "sprints")),
            getDocs(collection(db, "projects", project.id, "tasks")),
          ])
          // 解構賦值：[sprintSnap, taskSnap] 對應 Promise.all 回傳陣列的第一、第二個結果

          // 建立一個sprintid : sprintname 的對照物件 （task 查詢的時候會用到 ）
          const sprintNameById: Record<string, string> = {}
          sprintSnap.docs.forEach((d) => {
            const data = d.data()
            sprintNameById[d.id] = data.name
            //順便把sprint的完整資料塞進前面建立好的陣列
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
        // 專案資料直接從 useWorkspace 的 projects 整理，不需要再查 Firestore
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
