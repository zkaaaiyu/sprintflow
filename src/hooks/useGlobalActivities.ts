// useGlobalActivities — 跨專案的任務變動記錄，供 Dashboard 的 Recent Activity 面板使用
// 資料來源：頂層 activities/ collection（每次寫 task activity 時同步雙寫）
import { useState, useEffect } from "react"
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

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

export function useGlobalActivities(projectIds: string[], projectsLoading: boolean) {
  const [activities, setActivities] = useState<GlobalActivity[]>([])
  const [loading, setLoading] = useState(true)

  const projectIdsKey = projectIds.join(",")

  useEffect(() => {
    if (projectsLoading) return

    if (projectIds.length === 0) {
      setActivities([])
      setLoading(false)
      return
    }

    // Firestore 的 'in' 查詢最多支援 30 個值
    const ids = projectIds.slice(0, 30)
    const q = query(
      collection(db, "activities"),
      where("projectId", "in", ids)
    )

    // 用 onSnapshot 監聽，有新 activity 時即時更新
    const unsubscribe = onSnapshot(q, (snap) => {
      const list: GlobalActivity[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: (d.data().createdAt as Timestamp)?.toDate() ?? null,
      })) as GlobalActivity[]

      // 用 JS 排序（避免需要 Firestore composite index）
      list.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
      setActivities(list.slice(0, 30)) // 只顯示最近 30 筆
      setLoading(false)
    })

    return () => unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectIdsKey, projectsLoading])

  return { activities, loading }
}
