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

export type Comment = {
  id: string
  content: string
  authorId: string
  authorName: string
  authorPhotoURL: string | null
  createdAt: Date | null
}

export function useComments(projectId: string, taskId: string) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId || !taskId) return

    const q = query(
      collection(db, "projects", projectId, "tasks", taskId, "comments"),
      orderBy("createdAt", "asc")  // 留言由舊到新排列
    )

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        authorPhotoURL: (d.data().authorPhotoURL as string | null) ?? null,
        createdAt: (d.data().createdAt as Timestamp)?.toDate() ?? null,
      })) as Comment[]
      setComments(list)
      setLoading(false)
    })

    return () => unsub()
  }, [projectId, taskId])

  const addComment = async (content: string) => {
    if (!user || !content.trim()) return
    await addDoc(
      collection(db, "projects", projectId, "tasks", taskId, "comments"),
      {
        content: content.trim(),
        authorId: user.uid,
        authorName: user.displayName || user.email || "Someone",
        authorPhotoURL: user.photoURL ?? null,
        createdAt: serverTimestamp(),
      }
    )
  }

  return { comments, loading, addComment }
}