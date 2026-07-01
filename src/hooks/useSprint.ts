//負責單一 sprint 的資料讀取 + 操作（開始、結束、刪除、編輯）
import { useState, useEffect } from "react"
import {
  doc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch, //firebase 的批次寫入工具
  Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Sprint } from "./useSprints"


export function useSprint(projectId: string, sprintId: string) {

  const [sprint, setSprint] = useState<Sprint | null>(null)
  const [loading, setLoading] = useState(true)
 
  // 單一 Sprint 的即時監聽與初始化
  useEffect(() => {
    if (!projectId || !sprintId) return
    const ref = doc(db, "projects", projectId, "sprints", sprintId) // 定義單一 Sprint 的文件路徑
    const unsub = onSnapshot(ref, (snap) => { //即時監聽
      if (!snap.exists()) { setSprint(null); setLoading(false); return } //用firebase裡的snap.exisit()方法確保有拿到sprint 如果sprint 已經被刪了就清空狀態
      const data = snap.data() //用snap.data 拿到sprint裡的資料
      setSprint({
        id: snap.id,
        ...data,
        startDate: (data.startDate as Timestamp)?.toDate() ?? null,
        endDate:   (data.endDate   as Timestamp)?.toDate() ?? null,
        createdAt: (data.createdAt as Timestamp)?.toDate() ?? null,
      } as Sprint)
      setLoading(false)
    })
    return () => unsub()
  }, [projectId, sprintId])


  // 編輯/更新 sprint 的基本資料
  const updateSprint = async (data: { //參數是一個物件
    name?: string
    goal?: string
    startDate?: Date
    endDate?: Date
  }) => {
    const ref = doc(db, "projects", projectId, "sprints", sprintId) //找到要編輯的sprint是哪一個 定義成變數
    const payload: Record<string, unknown> = { ...data } //定義一個 payload 包（把要編輯更新的資料放進去）
    if (data.startDate) payload.startDate = Timestamp.fromDate(data.startDate) //時間要另外處理
    if (data.endDate)   payload.endDate   = Timestamp.fromDate(data.endDate) //時間要另外處理
    await updateDoc(ref, payload) //執行資料更新
  }


  // 開始 sprint（同一個 project 只允許一個 active sprint）
  const startSprint = async () => {
    // 先查這個 project 是否已有 active sprint
    const existing = await getDocs(
      query(
        collection(db, "projects", projectId, "sprints"),
        where("status", "==", "active")
      )
    )
    if (!existing.empty) {
      throw new Error("There is already an active sprint. Complete it before starting a new one.")
    }
    const ref = doc(db, "projects", projectId, "sprints", sprintId)
    await updateDoc(ref, { status: "active" })
  }

  // 結束 sprint -> 未完成任務退回 Backlog 頁面 並把 sprint 標記為 completed
  const completeSprint = async () => {
    const batch = writeBatch(db) //定義一個批次寫入的任務包batch
    //定義查詢邏輯（找到這個sprint的所有任務）
    const q = query( 
      collection(db, "projects", projectId, "tasks"),
      where("sprintId", "==", sprintId)
    )
    const snap = await getDocs(q) //執行獲取該sprint所有任務
    let movedCount = 0 //定義一個計數器 計算有幾個任務被退回
    snap.forEach((d) => { //遍歷取到的任務
      if (d.data().status !== "done") {  // 判斷是否完成
        batch.update(d.ref, { sprintId: null }) //把沒有完成的任務sprintid設為null 讓他退回backlog
        movedCount++
      }
    })
    const sprintRef = doc(db, "projects", projectId, "sprints", sprintId) // 找到當前sprint
    batch.update(sprintRef, { status: "completed" }) // 把當前sprint的狀態改成完成 更新到batch修改包裡面
     await batch.commit() //提交batch修改包
    return movedCount  // 返回有幾個任務被退回backlog，用來顯示確認訊息
  }


  // 刪除 sprint：所有任務退回 Backlog，再刪除 sprint 文件
  const deleteSprint = async () => {
    const batch = writeBatch(db) 

    // 定義查詢 -> 找到這個即將被刪除的 Sprint 的任務
    const q = query(
      collection(db, "projects", projectId, "tasks"),
      where("sprintId", "==", sprintId)
    )
    const snap = await getDocs(q) 
    snap.forEach((d) => batch.update(d.ref, { sprintId: null })) //把所有任務退回backlog

    const sprintRef = doc(db, "projects", projectId, "sprints", sprintId)
    batch.delete(sprintRef) //刪除sprint加到batch裡面
    await batch.commit() //提交batch確認刪除 
  }

  return { sprint, loading, updateSprint, startSprint, completeSprint, deleteSprint }
}