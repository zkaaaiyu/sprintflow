import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useTask } from "@/hooks/useTask"
import { useAuth } from "@/contexts/AuthContext"
import { useActivities } from "@/hooks/useActivities"
import { useComments } from "@/hooks/useComments"
import { useMembers } from "@/hooks/useMembers"
import { MemberAvatar } from "@/components/shared/MemberAvatar"
import type { Priority, TaskStatus, StoryPoints } from "@/hooks/useTasks"
import { avatarColor } from "@/lib/utils"
import { PRIORITY_CONFIG } from "@/lib/priority"
import { TASK_STATUS_CONFIG } from "@/lib/taskStatus"
import { BRAND } from "@/lib/colors"
import { Pencil, SendHorizontal, MoreHorizontal, Trash2 } from "lucide-react"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// 時間格式化工具 
function formatDateTime(date: Date | null): string {
  if (!date) return ""
  return date.toLocaleString("zh-TW", {
    month: "numeric", day: "numeric",
    hour: "numeric", minute: "2-digit",
    hour12: false,
  })            
}

// 負責activity 欄位的頭像 有照片就顯示照片，沒有就顯示名字縮寫
function ActivityAvatar({ name, photoURL }: { name?: string; photoURL: string | null }) {
  const initial = name?.[0]?.toUpperCase() ?? "?"
  if (photoURL) {
    return <img src={photoURL} referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover shrink-0" />
  }
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0"
      style={{ backgroundColor: avatarColor(name ?? "?") }}
    >
      {initial}
    </div>
  )
}

// 根據欄位類型決定顯示樣式
function ValueBadge({ field, value }: { field: string; value: string }) {
  if (!value || value === "—") return <span className="text-xs text-muted-foreground">—</span>
  
  if (field === "status") {  // 如果變更的是 status，就去 TASK_STATUS_CONFIG 查表 渲染對應的樣式
    const cfg = Object.values(TASK_STATUS_CONFIG).find((c) => c.label === value)
    if (cfg) return <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ color: cfg.color, backgroundColor: cfg.bg }}>{value}</span>
  }
  if (field === "priority") { //如果變更的是 priority，一樣查表渲染標籤
    const cfg = Object.values(PRIORITY_CONFIG).find((c) => c.label === value)
    if (cfg) return <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ color: cfg.color, backgroundColor: cfg.bg }}>{value}</span>
  }
  // 如果是一般的文字變更 就給一個簡單的灰色底色
  return <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-medium">{value}</span>
}

//定義props資料結構
type Props = {
  projectId: string
  taskId: string
  memberIds: string[]
  open: boolean
  onClose: () => void
  readOnly?: boolean
}

export default function TaskDetailModal({ projectId, taskId, memberIds, open, onClose, readOnly = false }: Props) {
  const { user } = useAuth()
  const { task, loading, updateField, deleteTask } = useTask(projectId, taskId) // 單一任務資料 + 操作函式
  const { activities } = useActivities(projectId, taskId) // 右半邊的活動紀錄
  const { members } = useMembers(memberIds) // 成員資料（用來顯示指派人選單）

  const { comments, addComment } = useComments(projectId, taskId)
  const [editingField, setEditingField] = useState<string | null>(null) //紀錄現在在編輯哪一個欄位 null 代表沒有在編輯
  
  //定義編輯狀態暫時存儲 讓資料在編輯的時候不會直接覆蓋刪除原本的資料
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editDueDate, setEditDueDate] = useState("")
  //留言板＋刪除確認
  const [commentText, setCommentText] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const stopEditing = () => setEditingField(null)
  const startEditing = (field: string) => { if (!readOnly) setEditingField(field) }

  const returnToBacklog = async () => {
    const taskRef = doc(db, "projects", projectId, "tasks", taskId)
    await updateDoc(taskRef, { sprintId: null, status: "todo" })
    if (user) {
      const activityData = {
        type: "field_changed",
        field: "sprintId",
        label: "Sprint",
        fromValue: "Sprint",
        toValue: "Backlog",
        changedBy: user.uid,
        changedByName: user.displayName || user.email || "Someone",
        changedByPhotoURL: user.photoURL ?? null,
        createdAt: serverTimestamp(),
      }
      // 寫入 task 層級的 activity（task detail 側欄顯示用）
      await addDoc(collection(db, "projects", projectId, "tasks", taskId, "activities"), activityData)
      // 同時寫入頂層 activities collection，供 Dashboard 跨專案查詢
      await addDoc(collection(db, "activities"), {
        ...activityData,
        projectId,
        taskId,
        taskTitle: task?.title ?? "",
      })
    }
    onClose()
  }

  const assignee = task ? members.find((m) => m.uid === task.assigneeId) : undefined // 從 members 找出目前指派人的完整資料
  const priority = task ? PRIORITY_CONFIG[task.priority] : null  // 優先級的顏色設定
  const status   = task ? TASK_STATUS_CONFIG[task.status]     : null // 狀態的顏色設定

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl h-[82vh] p-0 overflow-hidden rounded-2xl flex flex-col gap-0">

        {/* Header */}
        <div className="px-6 py-4 border-b border-border shrink-0 flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Task Detail</span>
          {readOnly && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Completed Sprint · Read Only</span>}
        </div>

        {/* 載入中 */}
        {(loading || !task) && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Loading...
          </div>
        )}

        {task && (
          <div className="flex flex-1 overflow-hidden">

            {/* ── 左半邊 ── */}
            <div className="flex-1 flex flex-col overflow-y-auto px-8 py-6 border-r border-border">

              {/* 標題 — 可編輯 */}
              <div className="group relative mb-3">
                {editingField === "title" ? (
                   // ── 編輯模式：顯示 input ──
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={async () => {
                      if (editTitle.trim() && editTitle.trim() !== task.title) { //更改後的標題不為空 且 不等於原標題
                        await updateField("title", editTitle.trim(), "Title", task.title, editTitle.trim())
                      }
                      stopEditing()
                    }}
                    onKeyDown={(e) => { if (e.key === "Escape") stopEditing() }}
                    className="text-2xl font-bold w-full bg-muted rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-primary"
                  />
                ) : (
                   // ── 顯示模式：顯示標題文字 ──
                  <div className="flex items-start gap-2">
                    <div
                      className={`flex items-start gap-2 flex-1 ${readOnly ? "cursor-default" : "cursor-text"}`}
                      onClick={() => { if (!readOnly) { setEditTitle(task.title); setEditingField("title") } }}
                    >
                      <h1 className="text-2xl font-bold leading-tight flex-1">{task.title}</h1>
                      {!readOnly && <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-40 text-muted-foreground mt-1.5 shrink-0 transition-opacity" />}
                    </div>

                    {/* 右側多功能按鈕區：readOnly 時隱藏 */}
                    {!readOnly && (task.sprintId !== null ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-1">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={returnToBacklog}>
                            Return to Backlog
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                            Delete Task
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="opacity-0 group-hover:opacity-40 hover:!opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0 mt-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 描述 — 可編輯 */}
              <div className="group mb-6">
                {editingField === "description" ? (
                  // ── 編輯模式 ──
                  <textarea
                    autoFocus
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)} 
                    onBlur={async () => {
                      if (editDescription !== task.description) {
                        await updateField("description", editDescription, "Description", task.description || "", editDescription)
                      }
                      stopEditing()
                    }}
                    onKeyDown={(e) => { if (e.key === "Escape") stopEditing() }}
                    className="w-full min-h-[80px] bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                ) : ( 
                  // ── 顯示模式 ──
                  <div
                    className={`flex items-start gap-2 ${readOnly ? "cursor-default" : "cursor-text"}`}
                    onClick={() => { if (!readOnly) { setEditDescription(task.description || ""); setEditingField("description") } }}
                  >
                    <p className="text-sm text-muted-foreground flex-1 leading-relaxed whitespace-pre-wrap">
                      {task.description || (readOnly ? "No description." : "Click to add description...")}
                    </p>
                    {!readOnly && <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 text-muted-foreground mt-0.5 shrink-0 transition-opacity" />}
                  </div>
                )}
              </div>

              {/* 左側中間資訊欄位 */}
              <div className="grid grid-rows-3 grid-flow-col gap-x-10 gap-y-5 text-sm">

                {/* Assignee */}
                <div className="group">
                  <p className="text-xs text-muted-foreground mb-1.5">Assignee</p>
                  {editingField === "assignee" ? (
                    // ── 編輯模式：下拉選人 ──
                    <div className="bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-10 relative">
                      <button className="w-full px-3 py-2 text-xs hover:bg-accent text-muted-foreground text-left"
                        onClick={async () => { await updateField("assigneeId", null, "Assignee", assignee?.displayName ?? "Unassigned", "Unassigned"); stopEditing() }}>
                        Unassigned
                      </button>
                      {members.map((m) => (
                        <button key={m.uid} className="w-full px-3 py-2 text-xs hover:bg-accent flex items-center gap-2"
                          onClick={async () => { await updateField("assigneeId", m.uid, "Assignee", assignee?.displayName ?? "Unassigned", m.displayName || m.email); stopEditing() }}>
                          <MemberAvatar user={m} />
                          {m.displayName || m.email}
                        </button>
                      ))}
                    </div>
                  ) : ( // ── 顯示模式 ──
                    <div className={`flex items-center gap-1.5 ${readOnly ? "cursor-default" : "cursor-pointer"}`} onClick={() => startEditing("assignee")}>
                      {assignee ? <><MemberAvatar user={assignee} /><span>{assignee.displayName || assignee.email}</span></> : <span className="text-muted-foreground">Unassigned</span>}
                      {!readOnly && <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 text-muted-foreground transition-opacity" />}
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="group">
                  <p className="text-xs text-muted-foreground mb-1.5">Status</p>
                  {editingField === "status" ? (
                    <div className="flex flex-row flex-wrap gap-1.5 items-center">
                      {(Object.keys(TASK_STATUS_CONFIG) as TaskStatus[]).map((s) => {
                        const cfg = TASK_STATUS_CONFIG[s]
                        return (
                          <button key={s}
                            onClick={async () => { await updateField("status", s, "Status", TASK_STATUS_CONFIG[task.status].label, cfg.label); stopEditing() }}
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ color: cfg.color, backgroundColor: cfg.bg, outline: task.status === s ? `2px solid ${cfg.color}` : "none", outlineOffset: "2px" }}>
                            {cfg.label}
                          </button>
                        )
                      })}
                      <button onClick={stopEditing} className="text-xs text-muted-foreground">✕</button>
                    </div>
                  ) : (
                    <div className={`flex items-center gap-1.5 ${readOnly ? "cursor-default" : "cursor-pointer"}`} onClick={() => startEditing("status")}>
                      {status && <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ color: status.color, backgroundColor: status.bg }}>{status.label}</span>}
                      {!readOnly && <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 text-muted-foreground transition-opacity" />}
                    </div>
                  )}
                </div>

                {/* Story Points */}
                <div className="group">
                  <p className="text-xs text-muted-foreground mb-1.5">Story Points</p>
                  {editingField === "storyPoints" ? (
                    <div className="flex gap-1 flex-wrap">
                      {([1, 2, 3, 5, 8, 13] as StoryPoints[]).map((sp) => (
                        <button key={sp}
                          onClick={async () => { const newSP = task.storyPoints === sp ? null : sp; await updateField("storyPoints", newSP, "Story Points", String(task.storyPoints ?? "—"), String(newSP ?? "—")); stopEditing() }}
                          className="w-7 h-7 rounded-lg text-xs font-semibold transition-all"
                          style={{ backgroundColor: task.storyPoints === sp ? BRAND : "var(--subtle-bg)", color: task.storyPoints === sp ? "white" : "var(--muted-foreground)" }}>
                          {sp}
                        </button>
                      ))}
                      <button onClick={stopEditing} className="text-xs text-muted-foreground px-1">✕</button>
                    </div>
                  ) : (
                    <div className={`flex items-center gap-1.5 ${readOnly ? "cursor-default" : "cursor-pointer"}`} onClick={() => startEditing("storyPoints")}>
                      <span className="font-semibold">{task.storyPoints ? `${task.storyPoints} SP` : "—"}</span>
                      {!readOnly && <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 text-muted-foreground transition-opacity" />}
                    </div>
                  )}
                </div>

                {/* Due Date */}
                <div className="group">
                  <p className="text-xs text-muted-foreground mb-1.5">Due Date</p>
                  {editingField === "dueDate" ? (
                    <input type="date" autoFocus value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      onBlur={async () => {
                        if (editDueDate) {
                          const newDate = new Date(editDueDate)
                          const fromLabel = task.dueDate ? task.dueDate.toLocaleDateString("en-US") : "—"
                          await updateField("dueDate", newDate, "Due Date", fromLabel, newDate.toLocaleDateString("en-US"))
                        }
                        stopEditing()
                      }}
                      className="w-full bg-muted rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-primary" />
                  ) : (
                    <div className={`flex items-center gap-1.5 ${readOnly ? "cursor-default" : "cursor-pointer"}`}
                      onClick={() => { if (!readOnly) { setEditDueDate(task.dueDate ? task.dueDate.toISOString().split("T")[0] : ""); setEditingField("dueDate") } }}>
                      <span>{task.dueDate ? task.dueDate.toLocaleDateString("en-US") : "—"}</span>
                      {!readOnly && <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 text-muted-foreground transition-opacity" />}
                    </div>
                  )}
                </div>

                {/* Priority */}
                <div className="group">
                  <p className="text-xs text-muted-foreground mb-1.5">Priority</p>
                  {editingField === "priority" ? (
                    <div className="flex flex-row flex-wrap gap-1.5 items-center">
                      {(["low", "medium", "high", "urgent"] as Priority[]).map((p) => {
                        const cfg = PRIORITY_CONFIG[p]
                        return (
                          <button key={p}
                            onClick={async () => { await updateField("priority", p, "Priority", PRIORITY_CONFIG[task.priority].label, cfg.label); stopEditing() }}
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ color: cfg.color, backgroundColor: cfg.bg, outline: task.priority === p ? `2px solid ${cfg.color}` : "none", outlineOffset: "2px" }}>
                            {cfg.label}
                          </button>
                        )
                      })}
                      <button onClick={stopEditing} className="text-xs text-muted-foreground">✕</button>
                    </div>
                  ) : (
                    <div className={`flex items-center gap-1.5 ${readOnly ? "cursor-default" : "cursor-pointer"}`} onClick={() => startEditing("priority")}>
                      {priority && <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ color: priority.color, backgroundColor: priority.bg }}>{priority.label}</span>}
                      {!readOnly && <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 text-muted-foreground transition-opacity" />}
                    </div>
                  )}
                </div>

                {/* Days Remaining（唯讀，從截止日計算） */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Days Left</p>
                  {task.dueDate ? (() => {
                    const now = new Date(); now.setHours(0,0,0,0)
                    const due = new Date(task.dueDate); due.setHours(0,0,0,0)
                    const diff = Math.ceil((due.getTime() - now.getTime()) / 86400000)
                    const label = diff < 0 ? "Overdue" : diff === 0 ? "Due today" : `${diff}d left`
                    const color = diff <= 0 ? "var(--overdue)" : diff <= 3 ? BRAND : "var(--muted-foreground)"
                    return <p className="text-sm font-medium" style={{ color }}>{label}</p>
                  })() : <span className="text-muted-foreground">—</span>}
                </div>

              </div>

              {/* Comments 區域 */}
              <div className="mt-8 border-t border-border pt-6 flex flex-col gap-4">
                <p className="text-sm font-semibold">Comments</p>

                {/* 留言列表 */}
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-2.5">
                    {/* 頭像 */}
                    <div className="shrink-0">
                      {c.authorPhotoURL ? (
                        <img src={c.authorPhotoURL} referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white"
                          style={{ backgroundColor: avatarColor(c.authorName) }}
                        >
                          {c.authorName[0]?.toUpperCase() ?? "?"}
                        </div>
                      )}
                    </div>
                    {/* 內容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold">{c.authorName}</span>
                        <span className="text-[10px] text-muted-foreground">{formatDateTime(c.createdAt)}</span>
                      </div>
                      <p className="text-sm mt-1 leading-relaxed whitespace-pre-wrap text-foreground">{c.content}</p>
                    </div>
                  </div>
                ))}

                {comments.length === 0 && (
                  <p className="text-xs text-muted-foreground">No comments yet</p>
                )}

                {/* 新增留言輸入框 */}
                <div className="flex gap-2.5 pt-2">
                  <div className="shrink-0">
                    <ActivityAvatar //自己頭像的顯示
                      name={user?.displayName || user?.email || "Me"}
                      photoURL={user?.photoURL ?? null}
                    />
                  </div>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          e.preventDefault() //防止表單提交
                          if (!commentText.trim() || submittingComment) return
                          setSubmittingComment(true)
                          await addComment(commentText)
                          setCommentText("")
                          setSubmittingComment(false)
                        }
                      }}
                      placeholder="Comment..."
                      className="w-full bg-muted rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary pr-9"
                    />
                    <button
                      disabled={!commentText.trim() || submittingComment}
                      onClick={async () => {
                        if (!commentText.trim() || submittingComment) return
                        setSubmittingComment(true)
                        await addComment(commentText)
                        setCommentText("")
                        setSubmittingComment(false)
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-brand disabled:opacity-30 transition-colors"
                    >
                      <SendHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* ── 右半邊 ── */}
            <div className="w-72 flex flex-col overflow-hidden shrink-0">
              <div className="flex-1 overflow-y-auto px-5 py-6">
                <p className="text-sm font-semibold mb-4">Activity</p>

                {activities.length === 0 && (
                  <p className="text-xs text-muted-foreground">No activity yet</p>
                )}

                <div>
                  {activities.map((act, idx) => (
                    <div key={act.id} className="flex gap-3 relative">
                      {/* 縱向連接線，最後一筆不畫 */}
                      {idx < activities.length - 1 && (
                        <div className="absolute left-[13px] top-7 bottom-0 w-px bg-border z-0" />
                      )}

                      {/* 頭像 */}
                      <div className="z-10 shrink-0">
                        <ActivityAvatar name={act.changedByName} photoURL={act.changedByPhotoURL} />
                      </div>

                      {/* 內容 */}
                      <div className="flex-1 min-w-0 pb-5">
                        <p className="text-xs font-semibold leading-snug">{act.changedByName ?? "Unknown"}
                          <span className="font-normal text-muted-foreground"> updated {act.label}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 mb-2">
                          {formatDateTime(act.createdAt)}
                        </p>
                        {/* 前值 → 新值 */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <ValueBadge field={act.field} value={act.fromValue} />
                          <span className="text-muted-foreground text-xs">→</span>
                          <ValueBadge field={act.field} value={act.toValue} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Delete Task 確認彈窗 */}
    <ConfirmDialog
      open={showDeleteConfirm}
      onOpenChange={setShowDeleteConfirm}
      title="Delete Task"
      description="This will permanently delete this task and all its comments and activity."
      confirmLabel="Delete task"
      onConfirm={async () => { await deleteTask(); setShowDeleteConfirm(false); onClose() }}
    />
    </>
  )
}
