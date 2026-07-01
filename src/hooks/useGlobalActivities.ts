// useGlobalActivities — 跨專案的任務變動記錄，通知面板會用到

import { useState, useEffect } from "react"
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

// 單筆全域活動紀錄的型別
export type GlobalActivity = {
  id: string
  type: string
  field: string
  label: string
  fromValue: string
  toValue: string 
  changedBy: string
  changedByName: string
  changedByPhotoURL: string | null
  projectId: string
  taskId: string
  taskTitle: string
  createdAt: Date | null
}

// joinedAtMap：{ [projectId]: Date | null }，用來過濾加入前的舊紀錄
export function useGlobalActivities(
  projectIds: string[],
  projectsLoading: boolean,
  joinedAtMap: Record<string, Date | null> = {}
) {
  const [activities, setActivities] = useState<GlobalActivity[]>([])
  const [loading, setLoading] = useState(true)

  const projectIdsKey = projectIds.join(",") //陣列轉字串當依賴項，避免無限重跑

  useEffect(() => {
    if (projectsLoading) return

    if (projectIds.length === 0) { //沒專案也不跑
      setActivities([])
      setLoading(false)
      return
    }

    const ids = projectIds.slice(0, 30)
    const q = query(
      collection(db, "activities"),
      where("projectId", "in", ids)
    )

    const unsubscribe = onSnapshot(q, (snap) => {
      const list: GlobalActivity[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: (d.data().createdAt as Timestamp)?.toDate() ?? null,
      })) as GlobalActivity[]

      // 過濾掉早於使用者加入時間，或超過 7 天的 activity
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const filtered = list.filter((act) => {
        if (!act.createdAt) return false
        if (act.createdAt < sevenDaysAgo) return false
        const joinedAt = joinedAtMap[act.projectId]
        if (joinedAt && act.createdAt < joinedAt) return false
        return true
      })

      filtered.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)) // 由新到舊排序
      setActivities(filtered.slice(0, 30))
      setLoading(false)
    })

    return () => unsubscribe()

  }, [projectIdsKey, projectsLoading])

  return { activities, loading }
}
