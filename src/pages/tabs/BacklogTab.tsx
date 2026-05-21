import { useState } from "react"
import { useTasks, type Task, type Priority, type StoryPoints } from "@/hooks/useTasks"
import { useMembers, type UserProfile } from "@/hooks/useMembers"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, ChevronDown } from "lucide-react"
import { toast } from "sonner"

// 優先級 顏色背景 定義
const PRIORITY_CONFIG = {
  low:    { label: "Low",    color: "#6B7280", bg: "#F3F4F6" },
  medium: { label: "Medium", color: "#3B82F6", bg: "#EFF6FF" },
  high:   { label: "High",   color: "#F97316", bg: "#FFF7ED" },
  urgent: { label: "Urgent", color: "#EF4444", bg: "#FEF2F2" },
}

//日期倒數計算
function getDaysRemaining(dueDate: Date): { label: string; color: string } {
  const now = new Date() //獲取當前時間
  now.setHours(0, 0, 0, 0) //清零時分秒毫秒 只要日期
  const due = new Date(dueDate) //目標日期
  due.setHours(0, 0, 0, 0)
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) //計算毫秒差再換回天數
  if (diff < 0)   return { label: "Overdue",        color: "#EF4444" }
  if (diff === 0) return { label: "Due today",      color: "#EF4444" }
  if (diff <= 3)  return { label: `${diff}d left`,  color: "#F97316" }
  return                 { label: `${diff}d left`,  color: "#6B7280" }
}

// 通用頭像元件
function MemberAvatar({ user, size = "sm" }: { user: UserProfile; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs"
  //處理 displayName 縮寫
  const initials = user.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user.email[0].toUpperCase()
    
  if (user.photoURL) {
    return (
      <img
        src={user.photoURL}
        alt={user.displayName}
        referrerPolicy="no-referrer"
        className={`${sz} rounded-full object-cover shrink-0`}
      />
    )
  }
  return (
    // 如果沒有大頭貼 顯示縮寫＋底色
    <div className={`${sz} rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold shrink-0`}>
      {initials}
    </div>
  )
}

// 成員下拉選單
function AssigneePicker({
  members, //可被選的member
  value, //目前選中的人
  onChange, //變更時觸發的函數
}: {
  members: UserProfile[]
  value: string | null
  onChange: (uid: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  //找出被選中人的完整資料
  const selected = members.find((m) => m.uid === value)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)} // o（prev）是當前最新值
        className="w-full rounded-xl bg-muted h-11 px-3 flex items-center gap-2 text-sm hover:bg-muted/80 transition-colors"
      >
        {selected ? (
          <>
            <MemberAvatar user={selected} />
            <span>{selected.displayName || selected.email}</span>
          </>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        )}
        <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground shrink-0" />
      </button>

      {open && ( //open == true 才渲染
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false) }}
            className="w-full px-3 py-2.5 flex items-center gap-2 text-sm hover:bg-accent text-muted-foreground"
          >
            Unassigned
          </button>
          {members.map((m) => (
            <button
              key={m.uid}
              type="button"
              onClick={() => { onChange(m.uid); setOpen(false) }}
              className="w-full px-3 py-2.5 flex items-center gap-2 text-sm hover:bg-accent"
            >
              <MemberAvatar user={m} />
              <span>{m.displayName || m.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Task 卡片
function TaskCard({ task, assignee }: { task: Task; assignee?: UserProfile }) {
  const p = PRIORITY_CONFIG[task.priority]  //查表拿到優先級顏色設定

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-all cursor-pointer">
      {/* 頂部： */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ color: p.color, backgroundColor: p.bg }}
        >
          {p.label}
        </span>
        {task.storyPoints && ( //有設定點數才渲染
          <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {task.storyPoints} SP
          </span>
        )}
      </div>

      <h3 className="font-medium text-sm mb-1 line-clamp-2">{task.title}</h3>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between mt-3">
        {task.dueDate ? (() => {
          const { label, color } = getDaysRemaining(task.dueDate)
          return <p className="text-xs font-medium" style={{ color }}>{label}</p>
        })() : <span />}

        {assignee && <MemberAvatar user={assignee} />}
      </div>
    </div>
  )
}

export default function BacklogTab({ projectId, memberIds }: { projectId: string; memberIds: string[] }) {
  const { tasks, loading, createTask } = useTasks(projectId) //取得任務資料
  const { members } = useMembers(memberIds) //取得member資料
  const [open, setOpen] = useState(false) //控制開關
  const [title, setTitle] = useState("") //任務名
  const [description, setDescription] = useState("") //描述
  const [priority, setPriority] = useState<Priority>("medium") //優先級
  const [storyPoints, setStoryPoints] = useState<StoryPoints | null>(null) //storyPoint
  const [assigneeId, setAssigneeId] = useState<string | null>(null) //指派人
  const [dueDate, setDueDate] = useState("") //到期日
  const [submitting, setSubmitting] = useState(false)

  const backlogTasks = tasks.filter((t) => t.sprintId === null) //只抓還沒排入sprint的任務

  //任務創建
  const handleCreate = async () => {
    if (!title.trim()) { toast.error("Please enter a task title"); return }
    setSubmitting(true)
    await createTask({
      title: title.trim(),
      description,
      priority,
      storyPoints,
      dueDate: dueDate ? new Date(dueDate) : null,
      assigneeId,
    })
    toast.success("Task created")
    setTitle(""); setDescription(""); setPriority("medium")   //清空表單
    setStoryPoints(null); setAssigneeId(null); setDueDate("")
    setOpen(false) //close dialog
    setSubmitting(false) //上鎖
  }

  if (loading) return <div className="text-muted-foreground text-sm">載入中...</div>

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div>
        <p className="text-sm text-muted-foreground mb-4">{backlogTasks.length} tasks</p>

        {backlogTasks.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p>Backlog is empty</p>
            <p className="text-sm mt-1">Click + to add your first task</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {backlogTasks.map((task) => {
            const assignee = members.find((m) => m.uid === task.assigneeId)
            return <TaskCard key={task.id} task={task} assignee={assignee} />
          })}
        </div>
      </div>

      <DialogContent className="sm:max-w-md rounded-2xl p-8">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-bold">Create Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="font-semibold text-sm">Title</Label>
            <Input
              placeholder="e.g. Design login page"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold text-sm">Description (optional)</Label>
            <Input
              placeholder="What needs to be done..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold text-sm">Priority</Label>
            <div className="flex gap-2">
              {(["low", "medium", "high", "urgent"] as Priority[]).map((p) => {
                const cfg = PRIORITY_CONFIG[p]
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      backgroundColor: priority === p ? cfg.bg : "#F3F4F6",
                      color: priority === p ? cfg.color : "#6B7280",
                      outline: priority === p ? `2px solid ${cfg.color}` : "none",
                      outlineOffset: "2px",
                    }}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-semibold text-sm">Story Points</Label>
            <div className="flex gap-2 flex-wrap">
              {([1, 2, 3, 5, 8, 13] as StoryPoints[]).map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() => setStoryPoints(storyPoints === sp ? null : sp)}
                  className="w-10 h-10 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: storyPoints === sp ? "#F97316" : "#F3F4F6",
                    color: storyPoints === sp ? "white" : "#6B7280",
                  }}
                >
                  {sp}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-semibold text-sm">Assignee (optional)</Label>
            <AssigneePicker
              members={members}
              value={assigneeId}
              onChange={setAssigneeId}
            />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold text-sm">Due Date (optional)</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-8">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={submitting}
            className="bg-[#F97316] hover:bg-[#ea6c0a] text-white rounded-full px-6"
          >
            {submitting ? "Creating..." : "Create"}
          </Button>
        </div>
      </DialogContent>

      <DialogTrigger asChild>
        <button className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-[#F97316] hover:bg-[#ea6c0a] text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-40">
          <Plus className="w-6 h-6" />
        </button>
      </DialogTrigger>
    </Dialog>
  )
}
