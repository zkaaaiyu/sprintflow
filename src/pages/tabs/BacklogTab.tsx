import { useState } from "react"
import { useTasks, type Task, type Priority, type StoryPoints } from "@/hooks/useTasks"
import { useMembers, type UserProfile } from "@/hooks/useMembers"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LayoutList, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import TaskDetailModal from "@/components/TaskDetailModal"

type SortBy = "priority" | "createdAt" | "dueDate" | "storyPoints"

const PRIORITY_CONFIG = {
  low:    { label: "Low",    color: "#6B7280", bg: "#F3F4F6" },
  medium: { label: "Medium", color: "#3B82F6", bg: "#EFF6FF" },
  high:   { label: "High",   color: "#F97316", bg: "#FFF7ED" },
  urgent: { label: "Urgent", color: "#EF4444", bg: "#FEF2F2" },
}

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

function getDaysRemaining(dueDate: Date): { label: string; color: string } {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0)   return { label: "Overdue",       color: "#EF4444" }
  if (diff === 0) return { label: "Due today",     color: "#EF4444" }
  if (diff <= 3)  return { label: `${diff}d left`, color: "#F97316" }
  return                 { label: `${diff}d left`, color: "#6B7280" }
}

function MemberAvatar({ user, size = "sm" }: { user: UserProfile; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs"
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
    <div className={`${sz} rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold shrink-0`}>
      {initials}
    </div>
  )
}

function AssigneePicker({
  members,
  value,
  onChange,
}: {
  members: UserProfile[]
  value: string | null
  onChange: (uid: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = members.find((m) => m.uid === value)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
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

      {open && (
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

function TaskCard({ task, assignee }: { task: Task; assignee?: UserProfile }) {
  const p = PRIORITY_CONFIG[task.priority]
  const isOverdue = task.dueDate && new Date() > task.dueDate

  return (
    <div className={`bg-card border rounded-xl p-3 cursor-pointer hover:shadow-sm transition-all ${
      isOverdue ? "border-red-300" : "border-border"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[11px] px-2 py-0.5 rounded-full font-medium"
          style={{ color: p.color, backgroundColor: p.bg }}
        >
          {p.label}
        </span>
        {task.storyPoints && (
          <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {task.storyPoints} SP
          </span>
        )}
      </div>

      <p className="text-sm font-medium mb-2 line-clamp-2">{task.title}</p>

      <div className="flex items-center justify-between">
        {task.dueDate ? (() => {
          const { label, color } = getDaysRemaining(task.dueDate)
          return <span className="text-[11px] font-medium" style={{ color }}>{label}</span>
        })() : <span />}
        {assignee && <MemberAvatar user={assignee} />}
      </div>
    </div>
  )
}

export default function BacklogTab({
  projectId,
  memberIds,
  createOpen,
  onCreateOpenChange,
  sortBy,
}: {
  projectId: string
  memberIds: string[]
  createOpen: boolean
  onCreateOpenChange: (open: boolean) => void
  sortBy: SortBy
}) {
  const { tasks, loading, createTask } = useTasks(projectId)
  const { members } = useMembers(memberIds)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<Priority>("medium")
  const [storyPoints, setStoryPoints] = useState<StoryPoints | null>(null)
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const backlogTasks = [...tasks.filter((t) => t.sprintId === null)].sort((a, b) => {
    switch (sortBy) {
      case "priority":
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      case "createdAt": {
        const aT = a.createdAt?.getTime() ?? 0
        const bT = b.createdAt?.getTime() ?? 0
        return bT - aT
      }
      case "dueDate": {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return a.dueDate.getTime() - b.dueDate.getTime()
      }
      case "storyPoints":
        return (b.storyPoints ?? 0) - (a.storyPoints ?? 0)
      default:
        return 0
    }
  })

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
    setTitle(""); setDescription(""); setPriority("medium")
    setStoryPoints(null); setAssigneeId(null); setDueDate("")
    onCreateOpenChange(false)
    setSubmitting(false)
  }

  if (loading) return <div className="text-muted-foreground text-sm py-8 text-center">載入中...</div>

  return (
    <>
      {/* Backlog 卡片 */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden min-h-[calc(100vh-180px)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <LayoutList className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Backlog</span>
          </div>
          <span className="text-xs text-muted-foreground">{backlogTasks.length} items</span>
        </div>

        {backlogTasks.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>Backlog is empty</p>
            <p className="text-sm mt-1">Click "New Task" to add your first task</p>
          </div>
        ) : (
          <div className="p-5 grid grid-cols-4 gap-3">
            {backlogTasks.map((task) => {
              const assignee = members.find((m) => m.uid === task.assigneeId)
              return (
                <div key={task.id} onClick={() => setSelectedTaskId(task.id)}>
                  <TaskCard task={task} assignee={assignee} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Task Dialog — 由 ProjectDetailPage 控制開關 */}
      <Dialog open={createOpen} onOpenChange={onCreateOpenChange}>
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
                autoFocus
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
              <AssigneePicker members={members} value={assigneeId} onChange={setAssigneeId} />
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
            <Button variant="ghost" onClick={() => onCreateOpenChange(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={submitting}
              className="bg-[#F97316] hover:bg-[#ea6c0a] text-white rounded-full px-6"
            >
              {submitting ? "Creating..." : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {selectedTaskId && (
        <TaskDetailModal
          projectId={projectId}
          taskId={selectedTaskId}
          memberIds={memberIds}
          open={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </>
  )
}
