// usePersonalTodos — 管理當前登入用戶的個人待辦清單
// 資料存在 users/{uid}/todos/{todoId}
import { useState, useEffect } from "react"
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"

export type PersonalTodo = {
  id: string
  title: string
  done: boolean
  createdAt: Date | null
}

export function usePersonalTodos() {
  const { user } = useAuth()
  const [todos, setTodos] = useState<PersonalTodo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    // 監聽當前用戶的待辦清單，按建立時間由舊到新排列
    const q = query(
      collection(db, "users", user.uid, "todos"),
      orderBy("createdAt", "asc")
    )

    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: (d.data().createdAt as Timestamp)?.toDate() ?? null,
      })) as PersonalTodo[]
      setTodos(list)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  // 新增待辦事項
  const createTodo = async (title: string) => {
    if (!user) return
    await addDoc(collection(db, "users", user.uid, "todos"), {
      title,
      done: false,
      createdAt: serverTimestamp(),
    })
  }

  // 切換完成狀態
  const toggleTodo = async (todoId: string, currentDone: boolean) => {
    if (!user) return
    await updateDoc(doc(db, "users", user.uid, "todos", todoId), { done: !currentDone })
  }

  // 修改待辦事項標題
  const updateTodo = async (todoId: string, title: string) => {
    if (!user || !title.trim()) return
    await updateDoc(doc(db, "users", user.uid, "todos", todoId), { title: title.trim() })
  }

  // 刪除待辦事項
  const deleteTodo = async (todoId: string) => {
    if (!user) return
    await deleteDoc(doc(db, "users", user.uid, "todos", todoId))
  }

  return { todos, loading, createTodo, toggleTodo, updateTodo, deleteTodo }
}
