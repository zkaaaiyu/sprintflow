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

//定義歷史紀錄的資料結構
export type Activity = {
  id: string
  type: string              // 固定值 "field_changed"，目前只有這一種類型
  field: string             // 被改的欄位名稱，例如 "priority"、"status"
  label: string             // 欄位的顯示名稱，例如 "Priority"、"Status"
  fromValue: string         // 改之前的值，例如 "medium"
  toValue: string           // 改之後的值，例如 "high"
  changedBy: string         // 是誰改的（uid）
  changedByName: string     // 改的人的名字（寫入時就存好，不用再查）
  changedByPhotoURL: string | null  // 改的人的頭像
  createdAt: Date | null    // 什麼時候改的
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
      setActivities(list) //把最新的資料遍歷出來後存到activitys裡面 然後導出到頁面上面渲染
      setLoading(false)
    })

    return () => unsub() // 離開或是依賴項更動的時候 取消訂閱 
  }, [projectId, taskId])

  return { 
    activities,  // 導出特定任務下的activities
    loading
   }
}