// 負責taskDetail頁面的留言列表＋新增留言
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

// 留言資料結構定義
export type Comment = {
  id: string
  content: string
  authorId: string
  authorName: string
  authorPhotoURL: string | null
  createdAt: Date | null
}
//自訂 Hook + 狀態初始化
export function useComments(projectId: string, taskId: string) { //要傳入project ID 和 task ID 才能定位到這個任務的留言板
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId || !taskId) return

    //定義查詢規則
    const q = query(
      collection(db, "projects", projectId, "tasks", taskId, "comments"),
      orderBy("createdAt", "asc")  // 留言由舊到新排列
    )
    //監聽
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        authorPhotoURL: (d.data().authorPhotoURL as string | null) ?? null,
        createdAt: (d.data().createdAt as Timestamp)?.toDate() ?? null,
      })) as Comment[]
      setComments(list) //載入留言陣列
      setLoading(false)
    })

    return () => unsub()
  }, [projectId, taskId]) //依賴專案跟任務id

  //新增留言
  const addComment = async (content: string) => {
    if (!user || !content.trim()) return
    await addDoc(
      collection(db, "projects", projectId, "tasks", taskId, "comments"),
      {
        content: content.trim(),
        // id name 頭像 時間 自動獲取
        authorId: user.uid,
        authorName: user.displayName || user.email || "Someone",
        authorPhotoURL: user.photoURL ?? null,
        createdAt: serverTimestamp(),
      }
    )
  }

  return { 
    comments, //特定任務下面的留言
    loading, 
    addComment  //新增留言的函式
  }
}