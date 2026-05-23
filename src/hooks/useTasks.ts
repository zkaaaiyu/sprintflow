// useTasks 抓取 backlog 的 「所有」 任務列表
import { useState, useEffect } from "react"
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"

export type Priority = "low" | "medium" | "high" | "urgent" 
export type TaskStatus = "todo" | "in_progress" | "review" | "done" 
export type StoryPoints = 1 | 2 | 3 | 5 | 8 | 13 

export type Task = {
  id: string
  projectId: string
  title: string
  description: string
  priority: Priority
  storyPoints: StoryPoints | null
  sprintId: string | null
  status: TaskStatus
  assigneeId: string | null
  dueDate: Date | null
  labels: string[]
  order: number
  createdBy: string
  createdAt: Date | null
}

export function useTasks(projectId: string) {
  const { user } = useAuth() //拿到當前登入者的資料
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId) return

    const q = query(
      collection(db, "projects", projectId, "tasks"), 
      orderBy("createdAt", "desc") // 根據時間由新到舊排列
    )

    const unsubscribe = onSnapshot(q, (snap) => {  //用onSnapShot 監聽
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        dueDate: (d.data().dueDate as Timestamp)?.toDate() ?? null,
        createdAt: (d.data().createdAt as Timestamp)?.toDate() ?? null,
      })) as Task[]
      setTasks(list) //更新列表
      setLoading(false)
    })

    return () => unsubscribe()
  }, [projectId]) 

  const createTask = async (data: {
    title: string
    description: string
    priority: Priority
    storyPoints: StoryPoints | null
    dueDate: Date | null
    assigneeId?: string | null
    sprintId?: string | null   // 可選：傳入則加入該 sprint，否則預設進 Backlog
    status?: TaskStatus        // 可選：傳入則使用指定狀態，否則預設 todo
  }) => {
    if (!user) return
    await addDoc(collection(db, "projects", projectId, "tasks"), {
      ...data,
      projectId,
      sprintId: data.sprintId ?? null,
      status: data.status ?? "todo",
      assigneeId: data.assigneeId ?? null,
      labels: [],
      order: Date.now(),
      createdBy: user.uid,
      dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : null,
      createdAt: serverTimestamp(),
    })
  }

  return { tasks, loading, createTask }
}
