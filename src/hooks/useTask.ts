//useTask 是抓取「單一」任務資料 taskDetail 頁面要用的
import { useState, useEffect } from "react"
import {
  doc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import type { Task } from "./useTasks"

export function useTask(projectId: string, taskId: string) {
  const { user } = useAuth()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId || !taskId) return

    const ref = doc(db, "projects", projectId, "tasks", taskId)  // 指向單一任務文件

    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) { setTask(null); setLoading(false); return }
      const data = snap.data()
      setTask({
        id: snap.id,
        ...data,
        dueDate: (data.dueDate as Timestamp)?.toDate() ?? null,
        createdAt: (data.createdAt as Timestamp)?.toDate() ?? null,
      } as Task)
      setLoading(false)
    })

    return () => unsub()
  }, [projectId, taskId])

  const updateField = async (
    field: string,           // 欄位名稱 e.g. "priority"
    newValue: unknown,       // 新值
    label: string,           // 顯示用文字 e.g. "優先級"
    fromDisplay?: string,    // 舊值的顯示文字（選填）
    toDisplay?: string,      // 新值的顯示文字（選填）
  ) => {
    if (!user) return

    const taskRef = doc(db, "projects", projectId, "tasks", taskId)
    const storeValue = newValue instanceof Date
      ? Timestamp.fromDate(newValue)  // Date 要轉成 Timestamp 才能存 Firestore
      : newValue

    await updateDoc(taskRef, { [field]: storeValue })  // 更新任務文件

    // 寫入活動紀錄（子集合）
    await addDoc(
      collection(db, "projects", projectId, "tasks", taskId, "activities"),
      {
        type: "field_changed",
        field,
        label,
        fromValue: fromDisplay ?? "",
        toValue: toDisplay ?? (newValue instanceof Date
          ? newValue.toLocaleDateString("zh-TW")
          : String(newValue ?? "")),
        changedBy: user.uid,
        changedByName: user.displayName || user.email || "Someone",
        changedByPhotoURL: user.photoURL ?? null,
        createdAt: serverTimestamp(),
      }
    )
  }

  const deleteTask = async () => {
    const ref = doc(db, "projects", projectId, "tasks", taskId)
    await deleteDoc(ref)
  }

  return { task, loading, updateField, deleteTask }
}