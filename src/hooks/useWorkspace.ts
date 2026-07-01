//封裝跟 workspace與資料庫溝通 相關的hooks （新增、查詢、更新、刪除）
import { useState, useEffect } from "react"
import {
  collection,// 指向一個資料表（集合）
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,// 讓 Firebase 伺服器記錄「現在時間」
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


// 定義自訂 Hook、初始化狀態 間聽firestor即時資料
export function useWorkspace() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  // 用 onSnapshot 即時監聽專案：只要 Firestore 資料有變動，畫面自動更新
  useEffect(() => {
    if (!user) return
    setLoading(true)
    const q = query(
      collection(db, "projects"),
      where("memberIds", "array-contains", user.uid) // WHERE memberIds 陣列裡包含當前用戶的 uid
    )
    const unsubscribe = onSnapshot(q, (snap) => { // 用 onSnapshot：建立「即時訂閱」，資料改變時這個 callback 會自動被呼叫
      const list = snap.docs.map((d) => {
        const data = d.data() //d 是 Document Snapshot 物件 要用data()方法取出資料
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
      }) as Project[] //告訴ts 這是project 型別
      setProjects(list)
      setLoading(false)
    })
    return unsubscribe // 元件卸載時停止監聽，避免記憶體洩漏
  }, [user?.uid])

// 新增project 函式
  const createProject = async (name: string, description: string, color: string) => {
    if (!user) return
    const inviteCode = generateInviteCode() //調用前面寫的隨機生成邀請碼函數
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
    const newDoc = await addDoc(collection(db, "projects"), data) //addDoc -> firebase提供新增資料的方法 回傳值裡面包含這筆資料的id

    const now2 = new Date() //樂觀更新要用的時間（因為是js端要用的 不能直接用前面firestore serverTimestamp 生成的）
    //寫一個newproject把剛給firebase的資料直接塞給渲染project的陣列就不用等獲取會時間（樂觀更新）
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
    setProjects((prev) => [...prev, newProject]) //不能覆蓋前面原本有的值所以用展開運算子倒出前面的資料
  }

  // 刪除 Project：遞迴清除所有子集合再刪 project 本體
  const deleteProject = async (projectId: string) => {
    // 第一層：刪所有 sprints
    const sprintsSnap = await getDocs(collection(db, "projects", projectId, "sprints"))
    for (const d of sprintsSnap.docs) await deleteDoc(d.ref)

    // 第二層：刪所有 tasks
    const tasksSnap = await getDocs(collection(db, "projects", projectId, "tasks"))
    for (const taskDoc of tasksSnap.docs) {

       // 第三層（子集合）：每個 task 底下還有 comments 和 activities
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
    //workspace 頁面更新渲染 該 project 卡片會消失
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

  return { 
    projects,//專案列表
    loading, 
    createProject, //新增函式
    deleteProject, //刪除函式
    updateProject,  //更新函式
    removeMember, //刪除函式
    leaveProject, //離開函式
    regenerateInviteCode,  //重新產生邀請碼函式
    joinProject //加入函式
  }
}