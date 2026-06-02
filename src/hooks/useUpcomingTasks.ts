// useUpcomingTasks — 查詢用戶所有專案中 7 天內到期、且指派給當前用戶的任務
import { useState, useEffect } from "react"
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import type { Project } from "@/hooks/useWorkspace"

export type UpcomingTask = {
  id: string
  title: string
  dueDate: Date
  projectId: string
  projectName: string
  projectColor: string
  sprintId: string | null
}

export function useUpcomingTasks(projects: Project[], projectsLoading: boolean) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<UpcomingTask[]>([])
  const [loading, setLoading] = useState(true)

  const projectIdsKey = projects.map((p) => p.id).join(",")

  useEffect(() => {
    if (projectsLoading) return

    if (projects.length === 0) {
      setTasks([])
      setLoading(false)
      return
    }

    const fetchTasks = async () => {
      const now = new Date()
      const in7Days = new Date()
      in7Days.setDate(now.getDate() + 7)

      const allTasks: UpcomingTask[] = []

      // 對每個專案查詢到期日在未來 7 天內的任務
      for (const project of projects) {
        const snap = await getDocs(
          query(
            collection(db, "projects", project.id, "tasks"),
            where("dueDate", ">=", Timestamp.fromDate(now)),
            where("dueDate", "<=", Timestamp.fromDate(in7Days))
          )
        )

        // 只保留指派給當前用戶且未完成的任務
        snap.docs
          .filter((d) => d.data().assigneeId === user?.uid && d.data().status !== "done")
          .forEach((d) => {
            const data = d.data()
            allTasks.push({
              id: d.id,
              title: data.title,
              dueDate: (data.dueDate as Timestamp).toDate(),
              projectId: project.id,
              projectName: project.name,
              projectColor: project.color,
              sprintId: data.sprintId ?? null,
            })
          })
      }

      // 由近到遠排序
      allTasks.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      setTasks(allTasks)
      setLoading(false)
    }

    fetchTasks()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectIdsKey, projectsLoading])

  return { tasks, loading }
}
