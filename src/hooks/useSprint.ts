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
  writeBatch,
  Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Sprint } from "./useSprints"

export function useSprint(projectId: string, sprintId: string) {
  const [sprint, setSprint] = useState<Sprint | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId || !sprintId) return
    const ref = doc(db, "projects", projectId, "sprints", sprintId)
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) { setSprint(null); setLoading(false); return }
      const data = snap.data()
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

  // 編輯 sprint 基本資料
  const updateSprint = async (data: {
    name?: string
    goal?: string
    startDate?: Date
    endDate?: Date
  }) => {
    const ref = doc(db, "projects", projectId, "sprints", sprintId)
    const payload: Record<string, unknown> = { ...data }
    if (data.startDate) payload.startDate = Timestamp.fromDate(data.startDate)
    if (data.endDate)   payload.endDate   = Timestamp.fromDate(data.endDate)
    await updateDoc(ref, payload)
  }

  // 開始 sprint
  const startSprint = async () => {
    const ref = doc(db, "projects", projectId, "sprints", sprintId)
    await updateDoc(ref, { status: "active" })
  }

  // 結束 sprint：未完成任務退回 Backlog，sprint 標記為 completed
  const completeSprint = async () => {
    const batch = writeBatch(db)
    const q = query(
      collection(db, "projects", projectId, "tasks"),
      where("sprintId", "==", sprintId)
    )
    const snap = await getDocs(q)
    let movedCount = 0
    snap.forEach((d) => {
      if (d.data().status !== "done") {
        batch.update(d.ref, { sprintId: null })
        movedCount++
      }
    })
    const sprintRef = doc(db, "projects", projectId, "sprints", sprintId)
    batch.update(sprintRef, { status: "completed" })
    await batch.commit()
    return movedCount  // 回傳幾個任務被退回，用來顯示確認訊息
  }

  // 刪除 sprint：所有任務退回 Backlog，再刪除 sprint 文件
  const deleteSprint = async () => {
    const batch = writeBatch(db)
    const q = query(
      collection(db, "projects", projectId, "tasks"),
      where("sprintId", "==", sprintId)
    )
    const snap = await getDocs(q)
    snap.forEach((d) => batch.update(d.ref, { sprintId: null }))
    const sprintRef = doc(db, "projects", projectId, "sprints", sprintId)
    batch.delete(sprintRef)
    await batch.commit()
  }

  return { sprint, loading, updateSprint, startSprint, completeSprint, deleteSprint }
}