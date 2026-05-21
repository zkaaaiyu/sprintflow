// 負責監聽task的活動紀錄
import { useState, useEffect } from "react"
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

export type Activity = {
  id: string
  type: string
  field: string
  label: string
  fromValue: string
  toValue: string
  changedBy: string
  changedByName: string
  changedByPhotoURL: string | null
  createdAt: Date | null
}

export function useActivities(projectId: string, taskId: string) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId || !taskId) return

    const q = query(
      collection(db, "projects", projectId, "tasks", taskId, "activities"),
      orderBy("createdAt", "desc")  // 最新的活動排最上面
    )

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        changedByPhotoURL: (d.data().changedByPhotoURL as string | null) ?? null,
        createdAt: (d.data().createdAt as Timestamp)?.toDate() ?? null,
      })) as Activity[]
      setActivities(list)
      setLoading(false)
    })

    return () => unsub()
  }, [projectId, taskId])

  return { activities, loading }
}