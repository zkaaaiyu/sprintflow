//useTask 是抓取「單一」任務資料 taskDetail 頁面要用的
import { useState, useEffect } from "react"
import {
  doc,
  onSnapshot,
  updateDoc, // 更新「單一文件」
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
    if (!projectId || !taskId) return //要同時有專案id 跟任務id

    // 指向單一任務文件 資料庫裡projects資料夾特定projectId的tasks資料夾裡的特定taskId任務
    const ref = doc(db, "projects", projectId, "tasks", taskId)  

    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) { setTask(null); setLoading(false); return } //用snap.exists() 查詢要查找的這一份文件到底在不在 避免id錯了 或是已經被刪了
      const data = snap.data() //snap.data 拿到詳細資料
      setTask({
        id: snap.id,
        ...data,
        dueDate: (data.dueDate as Timestamp)?.toDate() ?? null,
        createdAt: (data.createdAt as Timestamp)?.toDate() ?? null,
      } as Task)
      setLoading(false)
    })

    return () => unsub() //離開或是依賴項改變時執行並清除 更換監聽對象
  }, [projectId, taskId]) //projectId 跟 taskId 作為useeffect 的依賴項 如果變動就要重新執行 

 
// 更新欄位 + 歷史足跡記錄 函數

  const updateField = async (
    field: string,           // 要改資料庫裡的哪個資料 該資料的「欄位名」？
    newValue: unknown,       // 新值
    label: string,           // 顯示用文字 e.g. "優先級"
    fromDisplay?: string,    // 舊值的顯示文字（選填）
    toDisplay?: string,      // 新值的顯示文字（選填）
  ) => {
    if (!user) return

    const taskRef = doc(db, "projects", projectId, "tasks", taskId) //找到特定id下的任務的資料
    const storeValue = newValue instanceof Date //如果newValue 是 Date 要轉換成 fireStore 的 Timestamp 格式 如果是一般字串就不用動
      ? Timestamp.fromDate(newValue)  
      : newValue

    // 只更新該任務中「特定一個欄位」，而不覆蓋其他資料
    await updateDoc(taskRef, { [field]: storeValue })  // 更新任務文件 filed 是動態的 可以是 時間、狀態或是其他屬性 storeValue 是判斷好的新值

    // 用 addDoc 指向 activities 子集合  在該任務底下新增一筆獨立的歷史紀錄文件
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