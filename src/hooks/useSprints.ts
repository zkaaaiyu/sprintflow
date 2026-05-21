import { useState, useEffect } from "react"
import {
  collection,
  query,
  orderBy,
  onSnapshot, //firestore 提供的監聽工具
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

// 定義型別
export type SprintStatus = "planning" | "active" | "completed" 

export type Sprint = {
  id: string
  name: string
  goal: string
  status: SprintStatus
  startDate: Date | null
  endDate: Date | null
  createdAt: Date | null
}
//查詢sprint hook
export function useSprints(projectId: string) {
  const [sprints, setSprints] = useState<Sprint[]>([]) // sprint 列表
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId) return

    const q = query(
      collection(db, "projects", projectId, "sprints"), // 查詢邏輯 -> project 資料夾下的 特定projectId 的sprint資料夾 (firestore子集合的概念)
      orderBy("createdAt", "asc") // 根據createdAt舊到新排列
    )

    // onSnapshot 監聽函式 傳入封裝好的查詢邏輯 q 當 查詢結果有變動 就 調後面的函數把當前的最新資料（snap）作為參數傳進來 
    const unsubscribe = onSnapshot(q, (snap) => {   
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        startDate: (d.data().startDate as Timestamp)?.toDate() ?? null, 
        endDate: (d.data().endDate as Timestamp)?.toDate() ?? null,
        createdAt: (d.data().createdAt as Timestamp)?.toDate() ?? null,
      })) as Sprint[]
      setSprints(list)
      setLoading(false)
    })

    return () => unsubscribe() //用useEffect 的 return 在用戶離開頁面的時候 切斷unsubscribe 取消監聽
  }, [projectId]) //useEffect 依賴projectId 如果 id 變了就更新監聽對象

  //建立sprint hook
  const createSprint = async (name: string, goal: string, startDate: Date, endDate: Date) => {
    await addDoc(collection(db, "projects", projectId, "sprints"), {
      name,
      goal,
      status: "planning" as SprintStatus,
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate),
      createdAt: serverTimestamp(),
    })
  }

  return { sprints, loading, createSprint }
}