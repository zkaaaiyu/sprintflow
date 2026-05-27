//封裝跟 workspace與資料庫溝通 相關的hooks
import { useState, useEffect } from "react"
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"

export type ProjectRole = "owner" | "member"

export type Project = {
  id: string
  name: string
  description: string
  color: string
  ownerId: string
  memberIds: string[]
  roles: Record<string, ProjectRole>
  inviteCode: string
  createdAt: Date | null
  updatedAt: Date | null
}

// 產生隨機邀請碼，例如 "a3f9kx"
const generateInviteCode = () => Math.random().toString(36).slice(2, 8)


// 定義自訂 Hook、初始化狀態
export function useWorkspace() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  //如果有token就跑撈資料的函數
  useEffect(() => {
    if (!user) return
    fetchProjects()
  }, [user])

  // 撈資料
  const fetchProjects = async () => {
    if (!user) return
    const q = query(
      collection(db, "projects"),
      where("memberIds", "array-contains", user.uid)
    )
    const snap = await getDocs(q)
    const list = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate() ?? null,
      updatedAt: d.data().updatedAt?.toDate() ?? null,
    })) as Project[]
    setProjects(list) //把拿到的資料塞到要渲染的陣列裡面
    setLoading(false)
  }

// 新增project
  const createProject = async (name: string, description: string, color: string) => {
    if (!user) return
    const inviteCode = generateInviteCode()
    const now = serverTimestamp() //firebase 提供的獲取時間函數
    const data = {
      name,
      description,
      color,
      ownerId: user.uid,
      memberIds: [user.uid],
      roles: { [user.uid]: "owner" },
      inviteCode,
      createdAt: now,
      updatedAt: now,
    }
    const newDoc = await addDoc(collection(db, "projects"), data) //addDoc -> firebase提供新增資料的方法
    
    //寫一個newproject把剛給firebase的資料直接塞給渲染project的陣列就不用等獲取會卡（樂觀更新）
    const newProject: Project = {
      id: newDoc.id,
      name,
      description,
      color,
      ownerId: user.uid,
      memberIds: [user.uid],
      roles: { [user.uid]: "owner" },
      inviteCode,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setProjects((prev) => [...prev, newProject])
  }

  //刪除Project
  const deleteProject = async (projectId: string) => {
    await deleteDoc(doc(db, "projects", projectId))
    setProjects((prev) => prev.filter((p) => p.id !== projectId))
  }

  // 編輯專案名稱、描述、顏色
  const updateProject = async (projectId: string, updates: { name?: string; description?: string; color?: string }) => {
    await updateDoc(doc(db, "projects", projectId), { ...updates, updatedAt: serverTimestamp() })
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, ...updates } : p)))
  }

  // Owner 移除成員
  const removeMember = async (projectId: string, uid: string) => {
    const project = projects.find((p) => p.id === projectId)
    if (!project) return
    const newMemberIds = project.memberIds.filter((id) => id !== uid)
    const newRoles = { ...project.roles }
    delete newRoles[uid]
    await updateDoc(doc(db, "projects", projectId), { memberIds: newMemberIds, roles: newRoles, updatedAt: serverTimestamp() })
    setProjects((prev) => prev.map((p) => p.id === projectId ? { ...p, memberIds: newMemberIds, roles: newRoles } : p))
  }

  // 成員自行離開專案
  const leaveProject = async (projectId: string) => {
    if (!user) return
    const project = projects.find((p) => p.id === projectId)
    if (!project) return
    const newMemberIds = project.memberIds.filter((id) => id !== user.uid)
    const newRoles = { ...project.roles }
    delete newRoles[user.uid]
    await updateDoc(doc(db, "projects", projectId), { memberIds: newMemberIds, roles: newRoles, updatedAt: serverTimestamp() })
    setProjects((prev) => prev.filter((p) => p.id !== projectId))
  }

  return { projects, loading, createProject, deleteProject, updateProject, removeMember, leaveProject }
}