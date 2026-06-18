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
  onSnapshot,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"

// 定義member型別
export type ProjectRole = "owner" | "member"
// 定義project型別
export type Project = {
  id: string
  name: string
  description: string
  color: string
  ownerId: string
  memberIds: string[]
  roles: Record<string, ProjectRole>
  joinedAt: Record<string, Date | null>
  inviteCode: string
  createdAt: Date | null
  updatedAt: Date | null
}

// 處理隨機邀請碼生成
const generateInviteCode = () => Math.random().toString(36).slice(2, 8)


// 定義自訂 Hook、初始化狀態
export function useWorkspace() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  // 用 onSnapshot 即時監聽：只要 Firestore 資料有變動，畫面自動更新
  useEffect(() => {
    if (!user) return
    setLoading(true)
    const q = query(
      collection(db, "projects"),
      where("memberIds", "array-contains", user.uid)
    )
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data()
        const rawJoinedAt = data.joinedAt ?? {}
        const joinedAt: Record<string, Date | null> = {}
        for (const uid in rawJoinedAt) {
          joinedAt[uid] = rawJoinedAt[uid]?.toDate() ?? null
        }
        return {
          id: d.id,
          ...data,
          joinedAt,
          createdAt: data.createdAt?.toDate() ?? null,
          updatedAt: data.updatedAt?.toDate() ?? null,
        }
      }) as Project[]
      setProjects(list)
      setLoading(false)
    })
    return unsubscribe // 元件卸載時停止監聽，避免記憶體洩漏
  }, [user?.uid])

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
      joinedAt: { [user.uid]: now },
      inviteCode,
      createdAt: now,
      updatedAt: now,
    }
    const newDoc = await addDoc(collection(db, "projects"), data) //addDoc -> firebase提供新增資料的方法

    const now2 = new Date() //樂觀更新時間
    //寫一個newproject把剛給firebase的資料直接塞給渲染project的陣列就不用等獲取會卡（樂觀更新）
    const newProject: Project = {
      id: newDoc.id,
      name,
      description,
      color,
      ownerId: user.uid,
      memberIds: [user.uid],
      roles: { [user.uid]: "owner" },
      joinedAt: { [user.uid]: now2 },
      inviteCode,
      createdAt: now2,
      updatedAt: now2,
    }
    setProjects((prev) => [...prev, newProject])
  }

  // 刪除 Project：遞迴清除所有子集合再刪 project 本體
  const deleteProject = async (projectId: string) => {
    // 刪除所有 sprints
    const sprintsSnap = await getDocs(collection(db, "projects", projectId, "sprints"))
    for (const d of sprintsSnap.docs) await deleteDoc(d.ref)

    // 刪除所有 tasks，並遞迴清除每個 task 底下的 comments 和 activities
    const tasksSnap = await getDocs(collection(db, "projects", projectId, "tasks"))
    for (const taskDoc of tasksSnap.docs) {
      const commentsSnap = await getDocs(collection(db, "projects", projectId, "tasks", taskDoc.id, "comments"))
      for (const c of commentsSnap.docs) await deleteDoc(c.ref)

      const activitiesSnap = await getDocs(collection(db, "projects", projectId, "tasks", taskDoc.id, "activities"))
      for (const a of activitiesSnap.docs) await deleteDoc(a.ref)

      await deleteDoc(taskDoc.ref)
    }

    // 最後刪 project 本體
    await deleteDoc(doc(db, "projects", projectId))
    setProjects((prev) => prev.filter((p) => p.id !== projectId))
  }

  // 編輯專案名稱、描述、顏色
  const updateProject = async (projectId: string, updates: { name?: string; description?: string; color?: string }) => {
    await updateDoc(doc(db, "projects", projectId), { ...updates, updatedAt: serverTimestamp() }) //資料庫更新
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, ...updates } : p))) //三元運算＋渲染列表更新         
  }
 
  // Owner 移除成員
  const removeMember = async (projectId: string, uid: string) => {
    const project = projects.find((p) => p.id === projectId)
    if (!project) return
    const newMemberIds = project.memberIds.filter((id) => id !== uid) //用filter篩掉要踢除的人
    const newRoles = { ...project.roles } 
    delete newRoles[uid] // 刪除這個人的角色
    const newJoinedAt = { ...project.joinedAt }
    delete newJoinedAt[uid] //刪除這個人的加入時間
    await updateDoc(doc(db, "projects", projectId), { memberIds: newMemberIds, roles: newRoles, joinedAt: newJoinedAt, updatedAt: serverTimestamp() }) //更新資料庫
    setProjects((prev) => prev.map((p) => p.id === projectId ? { ...p, memberIds: newMemberIds, roles: newRoles, joinedAt: newJoinedAt } : p)) //更新渲染列表
  }

  // 成員自行離開專案
  const leaveProject = async (projectId: string) => {
    if (!user) return
    const project = projects.find((p) => p.id === projectId)
    if (!project) return
    const newMemberIds = project.memberIds.filter((id) => id !== user.uid)
    const newRoles = { ...project.roles }
    delete newRoles[user.uid]
    const newJoinedAt = { ...project.joinedAt }
    delete newJoinedAt[user.uid]
    //workspace 頁面該 project 卡片會消失
    await updateDoc(doc(db, "projects", projectId), { memberIds: newMemberIds, roles: newRoles, joinedAt: newJoinedAt, updatedAt: serverTimestamp() }) 
    setProjects((prev) => prev.filter((p) => p.id !== projectId))
  }

  // 重新產生邀請碼
  const regenerateInviteCode = async (projectId: string) => {
    const newCode = generateInviteCode()
    await updateDoc(doc(db, "projects", projectId), { inviteCode: newCode, updatedAt: serverTimestamp() })
    setProjects((prev) => prev.map((p) => p.id === projectId ? { ...p, inviteCode: newCode } : p))
  }

  // 透過邀請碼加入專案
  // 回傳 projectId（成功）、"already"（已是成員）、null（找不到）
  const joinProject = async (inviteCode: string): Promise<string | "already" | null> => {
    if (!user) return null
    const q = query(collection(db, "projects"), where("inviteCode", "==", inviteCode.trim().toLowerCase()))
    const snap = await getDocs(q)
    if (snap.empty) return null 

    const projectDoc = snap.docs[0]
    const data = projectDoc.data() //拆出專案 

    if (data.memberIds.includes(user.uid)) return "already"

    const now = serverTimestamp()
    await updateDoc(doc(db, "projects", projectDoc.id), {
      memberIds: [...data.memberIds, user.uid], //更新成員
      roles: { ...data.roles, [user.uid]: "member" }, //更新角色
      joinedAt: { ...(data.joinedAt ?? {}), [user.uid]: now }, //更新加入時間
      updatedAt: now,
    })

    const nowDate = new Date()
    const newProject: Project = {
      id: projectDoc.id,
      name: data.name,
      description: data.description,
      color: data.color,
      ownerId: data.ownerId,
      memberIds: [...data.memberIds, user.uid],
      roles: { ...data.roles, [user.uid]: "member" },
      joinedAt: { ...(data.joinedAt ?? {}), [user.uid]: nowDate },
      inviteCode: data.inviteCode,
      createdAt: data.createdAt?.toDate() ?? null,
      updatedAt: nowDate,
    }
    setProjects((prev) => [...prev, newProject]) //更新渲染列表
    return projectDoc.id
  }

  return { projects, loading, createProject, deleteProject, updateProject, removeMember, leaveProject, regenerateInviteCode, joinProject }
}