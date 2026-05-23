import { useState } from "react"
import type { ReactNode } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { doc, updateDoc, writeBatch } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  useDroppable,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useSprint } from "@/hooks/useSprint"
import { useTasks, type TaskStatus, type Task, type Priority, type StoryPoints } from "@/hooks/useTasks"
import { useWorkspace } from "@/hooks/useWorkspace"
import { useMembers, type UserProfile } from "@/hooks/useMembers"
import type { SprintStatus } from "@/hooks/useSprints"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MoreHorizontal, Plus, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import TaskDetailModal from "@/components/TaskDetailModal"

// 四欄定義
const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "todo",        label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "review",      label: "Review" },
  { id: "done",        label: "Done" },
]

// Sprint 狀態顏色設定
const STATUS_CONFIG: Record<SprintStatus, { label: string; color: string; bg: string }> = {
  planning:  { label: "Planning",  color: "#6B7280", bg: "#F3F4F6" },
  active:    { label: "Active",    color: "#F97316", bg: "#FFF7ED" },
  completed: { label: "Completed", color: "#10B981", bg: "#ECFDF5" },
}

// 優先級顏色設定
const PRIORITY_CONFIG = {
  low:    { color: "#6B7280", bg: "#F3F4F6" },
  medium: { color: "#3B82F6", bg: "#EFF6FF" },
  high:   { color: "#F97316", bg: "#FFF7ED" },
  urgent: { color: "#EF4444", bg: "#FEF2F2" },
}

// 日期範圍格式化，例如 "May 5 – May 10"
function formatDateRange(start: Date | null, end: Date | null) {
  if (!start || !end) return "—"
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  return `${fmt(start)} – ${fmt(end)}`
}

// 計算剩餘天數
function getDaysRemaining(dueDate: Date): { label: string; color: string } {
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0)
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0)   return { label: "Overdue",       color: "#EF4444" }
  if (diff === 0) return { label: "Due today",     color: "#EF4444" }
  if (diff <= 3)  return { label: `${diff}d left`, color: "#F97316" }
  return               { label: `${diff}d left`, color: "#6B7280" }
}

// 成員頭像元件
function MemberAvatar({ user }: { user: UserProfile }) {
  const initials = user.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user.email[0].toUpperCase()
  if (user.photoURL) {
    return (
      <img
        src={user.photoURL}
        alt={user.displayName}
        referrerPolicy="no-referrer"
        className="w-6 h-6 rounded-full object-cover shrink-0"
      />
    )
  }
  return (
    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-semibold shrink-0">
      {initials}
    </div>
  )
}

// 指派人下拉選單元件
function AssigneePicker({ members, value, onChange }: {
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

// 任務卡片元件（純顯示，不含拖拉邏輯）
function KanbanCard({ task, assignee, onClick }: { task: Task; assignee?: UserProfile; onClick: () => void }) {
  const p = PRIORITY_CONFIG[task.priority]
  // 逾期判斷：有截止日 + 尚未完成 + 今天已超過截止日
  const isOverdue = task.dueDate && task.status !== "done" && new Date() > task.dueDate

  return (
    <div
      onClick={onClick}
      className={`bg-card border rounded-xl p-3 cursor-pointer hover:shadow-sm transition-all ${
        isOverdue ? "border-red-300" : "border-border"
      }`}
    >
      {/* 優先級標籤 + SP */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[11px] px-2 py-0.5 rounded-full font-medium capitalize"
          style={{ color: p.color, backgroundColor: p.bg }}
        >
          {task.priority}
        </span>
        {task.storyPoints && (
          <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {task.storyPoints} SP
          </span>
        )}
      </div>

      {/* 標題 */}
      <p className="text-sm font-medium mb-2 line-clamp-2">{task.title}</p>

      {/* 底部：到期日 + 指派人頭像 */}
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

// 拖拉包裝元件：替 KanbanCard 加上 useSortable 能力
function SortableKanbanCard({ task, assignee, onClick, disabled }: {
  task: Task
  assignee?: UserProfile
  onClick: () => void
  disabled?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled,  // completed sprint 時停用拖拉
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        // 被拖動的卡片不加 transition（避免放開時飛回動畫）
        // 被擠開的其他卡片套用 dnd-kit 原生 transition，讓位移絲滑
        transition: isDragging ? undefined : transition,
      }}
      {...attributes}
      {...listeners}
      onClick={onClick}  // 保留點擊事件（距離 < 5px 不會觸發 drag）
      className={isDragging ? "opacity-0" : ""}
    >
      {/* 把 onClick 傳空值，避免重複觸發 */}
      <KanbanCard task={task} assignee={assignee} onClick={() => {}} />
    </div>
  )
}

// 讓每一欄的空白區域也能接受拖拉（空欄時才需要）
function DroppableColumn({ id, children }: { id: string; children: ReactNode }) {
  const { setNodeRef } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1 min-h-20">
      {children}
    </div>
  )
}

export default function SprintKanbanPage() {
  const { projectId = "", sprintId = "" } = useParams()
  const navigate = useNavigate()

  const { projects, loading: projectLoading } = useWorkspace()
  // 解構時補上所有操作函式
  const { sprint, loading: sprintLoading, startSprint, completeSprint, deleteSprint, updateSprint } = useSprint(projectId, sprintId)
  const { tasks, loading: tasksLoading, createTask } = useTasks(projectId)

  const project = projects.find((p) => p.id === projectId)
  const memberIds = project?.memberIds ?? []

  const { members } = useMembers(memberIds)

  // 只顯示這個 sprint 的任務
  const sprintTasks = tasks.filter((t) => t.sprintId === sprintId)
  // 還在 Backlog 的任務（用於「從 Backlog 選取」）
  const backlogTasks = tasks.filter((t) => t.sprintId === null)

  // 任務進度
  const doneTasks  = sprintTasks.filter((t) => t.status === "done").length
  const totalTasks = sprintTasks.length
  // SP 進度
  const doneSP  = sprintTasks.filter((t) => t.status === "done").reduce((sum, t) => sum + (t.storyPoints ?? 0), 0)
  const totalSP = sprintTasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0)

  // 控制 Sprint Modal / 確認彈窗 開關
  const [showEditModal, setShowEditModal]             = useState(false)
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm]     = useState(false)
  // 編輯表單的暫存值
  const [editName, setEditName]           = useState("")
  const [editGoal, setEditGoal]           = useState("")
  const [editStartDate, setEditStartDate] = useState("")
  const [editEndDate, setEditEndDate]     = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  // 點擊任務卡片時，紀錄被選中的 taskId，用來開啟 Task Detail Modal
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  // 新增任務相關：記錄點擊哪一欄的 +，以及兩個新增 Modal 的開關
  const [activeAddColumn, setActiveAddColumn] = useState<TaskStatus | null>(null)
  const [showFromBacklogModal, setShowFromBacklogModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  // 新增任務表單欄位
  const [newTitle, setNewTitle]             = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newPriority, setNewPriority]       = useState<Priority>("medium")
  const [newStoryPoints, setNewStoryPoints] = useState<StoryPoints | null>(null)
  const [newAssigneeId, setNewAssigneeId]   = useState<string | null>(null)
  const [newDueDate, setNewDueDate]         = useState("")
  const [creating, setCreating]             = useState(false)

  // 拖拉中的任務（用來渲染 DragOverlay 浮動卡片）
  const [draggingTask, setDraggingTask] = useState<Task | null>(null)

  // 篩選列狀態：可多選成員、單選優先級
  const [filterMemberIds, setFilterMemberIds] = useState<string[]>([])
  const [filterPriority, setFilterPriority]   = useState<Priority | null>(null)

  // 切換成員篩選（點一次選取，再點一次取消）
  const toggleMemberFilter = (uid: string) => {
    setFilterMemberIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    )
  }

  // 判斷任務是否符合篩選條件
  const isTaskVisible = (task: Task) => {
    const memberMatch   = filterMemberIds.length === 0 || filterMemberIds.includes(task.assigneeId ?? "")
    const priorityMatch = filterPriority === null || task.priority === filterPriority
    return memberMatch && priorityMatch
  }

  // dnd-kit sensors 設定：滑鼠移動超過 5px 才算拖拉，避免誤觸點擊
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  // 開啟編輯 Modal 時，把現有資料預填進欄位
  const openEditModal = () => {
    setEditName(sprint.name)
    setEditGoal(sprint.goal ?? "")
    setEditStartDate(sprint.startDate ? sprint.startDate.toISOString().slice(0, 10) : "")
    setEditEndDate(sprint.endDate ? sprint.endDate.toISOString().slice(0, 10) : "")
    setShowEditModal(true)
  }

  // 儲存 Sprint 編輯
  const handleUpdate = async () => {
    if (!editName.trim()) { toast.error("請輸入 Sprint 名稱"); return }
    setActionLoading(true)
    await updateSprint({
      name: editName.trim(),
      goal: editGoal.trim(),
      startDate: editStartDate ? new Date(editStartDate) : undefined,
      endDate: editEndDate ? new Date(editEndDate) : undefined,
    })
    toast.success("Sprint 已更新")
    setShowEditModal(false)
    setActionLoading(false)
  }

  // 結束 Sprint：未完成任務退回 Backlog
  const handleComplete = async () => {
    setActionLoading(true)
    const moved = await completeSprint()
    toast.success(`Sprint 已結束，${moved} 個任務退回 Backlog`)
    setShowCompleteConfirm(false)
    setActionLoading(false)
  }

  // 刪除 Sprint：所有任務退回 Backlog，再導回專案頁
  const handleDelete = async () => {
    setActionLoading(true)
    await deleteSprint()
    toast.success("Sprint 已刪除")
    navigate(`/projects/${projectId}`)
  }

  // 從 Backlog 選取任務加入此 Sprint，status 強制設為 todo
  const addFromBacklog = async (taskId: string) => {
    await updateDoc(doc(db, "projects", projectId, "tasks", taskId), {
      sprintId,
      status: "todo",
    })
    setShowFromBacklogModal(false)
    toast.success("任務已加入 Sprint")
  }

  // 直接新增任務到指定欄位
  const handleCreateTask = async () => {
    if (!newTitle.trim()) { toast.error("請輸入任務標題"); return }
    setCreating(true)
    await createTask({
      title: newTitle.trim(),
      description: newDescription,
      priority: newPriority,
      storyPoints: newStoryPoints,
      dueDate: newDueDate ? new Date(newDueDate) : null,
      assigneeId: newAssigneeId,
      sprintId,                              // 自動帶入當前 sprintId
      status: activeAddColumn ?? "todo",     // 帶入點擊的欄位對應 status
    })
    toast.success("任務已建立")
    // 清空表單
    setNewTitle(""); setNewDescription(""); setNewPriority("medium")
    setNewStoryPoints(null); setNewAssigneeId(null); setNewDueDate("")
    setShowCreateModal(false)
    setCreating(false)
  }

  // 拖拉開始：記錄被拖動的任務，用來渲染 DragOverlay
  const handleDragStart = ({ active }: DragStartEvent) => {
    const task = sprintTasks.find((t) => t.id === active.id)
    setDraggingTask(task ?? null)
  }

  // 拖拉結束：計算新位置，批次更新 Firestore
  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setDraggingTask(null)
    if (!over) return

    const activeId = active.id as string
    const overId   = over.id as string
    if (activeId === overId) return

    const activeTask = sprintTasks.find((t) => t.id === activeId)
    if (!activeTask) return

    // 判斷目標欄位：over 可能是任務 id 或欄位 id
    const overTask = sprintTasks.find((t) => t.id === overId)
    const destColumnId = (overTask?.status ?? overId) as TaskStatus
    if (!COLUMNS.find((c) => c.id === destColumnId)) return

    const batch = writeBatch(db)
    const isSameColumn = activeTask.status === destColumnId

    if (isSameColumn) {
      // 同欄拖拉：用 arrayMove 重新排序，只更新 order
      const colTasks = sprintTasks
        .filter((t) => t.status === destColumnId)
        .sort((a, b) => a.order - b.order)

      const oldIndex = colTasks.findIndex((t) => t.id === activeId)
      const newIndex = colTasks.findIndex((t) => t.id === overId)
      if (oldIndex === -1 || newIndex === -1) return

      arrayMove(colTasks, oldIndex, newIndex).forEach((task, index) => {
        batch.update(doc(db, "projects", projectId, "tasks", task.id), {
          order: (index + 1) * 1000,
        })
      })
    } else {
      // 跨欄拖拉：更新 status + order，同時修正來源欄的 order
      const srcTasks = sprintTasks
        .filter((t) => t.status === activeTask.status && t.id !== activeId)
        .sort((a, b) => a.order - b.order)

      const destTasks = sprintTasks
        .filter((t) => t.status === destColumnId)
        .sort((a, b) => a.order - b.order)

      // 找插入位置（dropped on a task → insert before it，dropped on column → append）
      const overIndex = overTask
        ? destTasks.findIndex((t) => t.id === overId)
        : destTasks.length

      const newDestTasks = [...destTasks]
      newDestTasks.splice(overIndex === -1 ? destTasks.length : overIndex, 0, activeTask)

      // 更新目標欄的所有任務 order，被移動的任務還要更新 status
      newDestTasks.forEach((task, index) => {
        const ref = doc(db, "projects", projectId, "tasks", task.id)
        if (task.id === activeId) {
          batch.update(ref, { status: destColumnId, order: (index + 1) * 1000 })
        } else {
          batch.update(ref, { order: (index + 1) * 1000 })
        }
      })

      // 修正來源欄的 order（中間空了一個位置要補回來）
      srcTasks.forEach((task, index) => {
        batch.update(doc(db, "projects", projectId, "tasks", task.id), {
          order: (index + 1) * 1000,
        })
      })
    }

    await batch.commit()
  }

  const loading = projectLoading || sprintLoading || tasksLoading
  if (loading) return (
    <div className="flex items-center justify-center h-full text-muted-foreground">載入中...</div>
  )
  if (!sprint) return (
    <div className="flex items-center justify-center h-full text-muted-foreground">找不到此 Sprint</div>
  )

  return (
    <div className="flex flex-col h-full gap-3 p-5 overflow-hidden">

      {/* ── 上方狀態卡片：單行緊湊佈局 ── */}
      <div className="bg-card border border-border rounded-2xl shadow-sm px-5 py-3.5 flex items-center gap-3 flex-wrap shrink-0">

        {/* 名稱 + 狀態徽章 */}
        <h1 className="text-base font-bold whitespace-nowrap">{sprint.name}</h1>
        <span
          className="text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap"
          style={{
            color: STATUS_CONFIG[sprint.status].color,
            backgroundColor: STATUS_CONFIG[sprint.status].bg,
          }}
        >
          {STATUS_CONFIG[sprint.status].label}
        </span>

        {/* 日期 + 目標 */}
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {formatDateRange(sprint.startDate, sprint.endDate)}
        </span>
        {sprint.goal && (
          <>
            <span className="text-muted-foreground text-xs">•</span>
            <span className="text-sm text-muted-foreground truncate max-w-48">{sprint.goal}</span>
          </>
        )}

        {/* 進度數字 */}
        <span className="text-sm whitespace-nowrap">
          <span className="font-semibold text-foreground">{doneTasks}/{totalTasks}</span>
          <span className="text-muted-foreground ml-1">tasks</span>
        </span>
        <span className="text-sm whitespace-nowrap">
          <span className="font-semibold text-foreground">{doneSP}/{totalSP}</span>
          <span className="text-muted-foreground ml-1">SP</span>
        </span>

        {/* 彈性空間，讓右側靠右 */}
        <div className="flex-1" />

        {/* 成員頭像篩選 */}
        {members.length > 0 && (
          <div className="flex items-center">
            {members.map((m, i) => (
              <button
                key={m.uid}
                onClick={() => toggleMemberFilter(m.uid)}
                className={`rounded-full transition-all -ml-1.5 first:ml-0 ${
                  filterMemberIds.includes(m.uid)
                    ? "ring-2 ring-[#F97316] ring-offset-1 z-10"
                    : "opacity-70 hover:opacity-100"
                }`}
                style={{ zIndex: i }}
              >
                <MemberAvatar user={m} />
              </button>
            ))}
          </div>
        )}

        {/* 分隔線 */}
        <div className="w-px h-5 bg-border shrink-0" />

        {/* 優先級篩選按鈕 */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilterPriority(null)}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
              filterPriority === null
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All
          </button>
          {(["low", "medium", "high", "urgent"] as Priority[]).map((p) => {
            const cfg = PRIORITY_CONFIG[p]
            const isActive = filterPriority === p
            return (
              <button
                key={p}
                onClick={() => setFilterPriority(isActive ? null : p)}
                className="text-xs px-2.5 py-1 rounded-full font-medium transition-all capitalize"
                style={{
                  backgroundColor: isActive ? cfg.bg : undefined,
                  color: isActive ? cfg.color : "#6B7280",
                  outline: isActive ? `1.5px solid ${cfg.color}` : undefined,
                  outlineOffset: isActive ? "2px" : undefined,
                }}
              >
                {p}
              </button>
            )
          })}
        </div>

        {/* 有篩選時的 Clear */}
        {(filterMemberIds.length > 0 || filterPriority !== null) && (
          <button
            onClick={() => { setFilterMemberIds([]); setFilterPriority(null) }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            Clear
          </button>
        )}

        {/* 分隔線 */}
        <div className="w-px h-5 bg-border shrink-0" />

        {/* ⋯ 選單 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded-lg hover:bg-muted transition-colors">
              <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {sprint.status === "planning" && (
              <DropdownMenuItem onClick={() => startSprint().then(() => toast.success("Sprint 已開始"))}>
                開始 Sprint
              </DropdownMenuItem>
            )}
            {sprint.status === "active" && (
              <DropdownMenuItem onClick={() => setShowCompleteConfirm(true)}>
                結束 Sprint
              </DropdownMenuItem>
            )}
            {sprint.status !== "completed" && (
              <DropdownMenuItem onClick={openEditModal}>
                編輯
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-500 focus:text-red-500"
            >
              刪除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── 下方看板卡片 ── */}
      <div className="flex-1 bg-card border border-border rounded-2xl shadow-sm overflow-auto p-5">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full">
            {COLUMNS.map((col) => {
              const colTasks = sprintTasks
                .filter((t) => t.status === col.id)
                .sort((a, b) => a.order - b.order)
              const colSP = colTasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0)

              return (
                <div key={col.id} className="flex flex-col flex-1 min-w-0">
                  {/* 欄位標題列 */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{col.label}</span>
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                        {colTasks.length}
                      </span>
                      {colSP > 0 && (
                        <span className="text-xs text-muted-foreground">{colSP} SP</span>
                      )}
                    </div>

                    {sprint.status !== "completed" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="w-6 h-6 rounded-md hover:bg-muted flex items-center justify-center transition-colors">
                            <Plus className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => {
                            setActiveAddColumn(col.id)
                            setShowFromBacklogModal(true)
                          }}>
                            從 Backlog 選取
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setActiveAddColumn(col.id)
                            setShowCreateModal(true)
                          }}>
                            直接新增
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <SortableContext
                    items={colTasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <DroppableColumn id={col.id}>
                      {colTasks.map((task) => {
                        const assignee = members.find((m) => m.uid === task.assigneeId)
                        const visible = isTaskVisible(task)
                        return (
                          <div
                            key={task.id}
                            className={`transition-opacity ${visible ? "" : "opacity-25 pointer-events-none"}`}
                          >
                            <SortableKanbanCard
                              task={task}
                              assignee={assignee}
                              onClick={() => setSelectedTaskId(task.id)}
                              disabled={sprint.status === "completed" || !visible}
                            />
                          </div>
                        )
                      })}
                    </DroppableColumn>
                  </SortableContext>
                </div>
              )
            })}
          </div>

          <DragOverlay dropAnimation={null}>
            {draggingTask && (
              <div className="shadow-xl rotate-1 opacity-90">
                <KanbanCard
                  task={draggingTask}
                  assignee={members.find((m) => m.uid === draggingTask.assigneeId)}
                  onClick={() => {}}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* 結束 Sprint 確認彈窗 */}
      <Dialog open={showCompleteConfirm} onOpenChange={setShowCompleteConfirm}>
        <DialogContent className="sm:max-w-sm rounded-2xl p-8">
          <DialogHeader className="mb-4">
            <DialogTitle>結束 Sprint</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-6">
            未完成的任務將退回 Backlog，確定要結束嗎？
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowCompleteConfirm(false)}>取消</Button>
            <Button
              onClick={handleComplete}
              disabled={actionLoading}
              className="bg-[#F97316] hover:bg-[#ea6c0a] text-white rounded-full px-6"
            >
              {actionLoading ? "處理中..." : "確定結束"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 刪除 Sprint 確認彈窗 */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-sm rounded-2xl p-8">
          <DialogHeader className="mb-4">
            <DialogTitle>刪除 Sprint</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-6">
            刪除後此 Sprint 內的所有任務將退回 Backlog，確定要刪除嗎？
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>取消</Button>
            <Button
              onClick={handleDelete}
              disabled={actionLoading}
              variant="destructive"
              className="rounded-full px-6"
            >
              {actionLoading ? "刪除中..." : "確定刪除"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 編輯 Sprint Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md rounded-2xl p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold">編輯 Sprint</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="font-semibold text-sm">Sprint Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-sm">Goal (optional)</Label>
              <Input
                value={editGoal}
                onChange={(e) => setEditGoal(e.target.value)}
                className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-semibold text-sm">Start Date</Label>
                <Input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-sm">End Date</Label>
                <Input
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-8">
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>取消</Button>
            <Button
              onClick={handleUpdate}
              disabled={actionLoading}
              className="bg-[#F97316] hover:bg-[#ea6c0a] text-white rounded-full px-6"
            >
              {actionLoading ? "儲存中..." : "儲存"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 從 Backlog 選取任務 Modal */}
      <Dialog open={showFromBacklogModal} onOpenChange={setShowFromBacklogModal}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader className="mb-4">
            <DialogTitle>從 Backlog 選取任務</DialogTitle>
          </DialogHeader>
          {backlogTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Backlog 中沒有待排任務</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {backlogTasks.map((task) => {
                const p = PRIORITY_CONFIG[task.priority]
                return (
                  <button
                    key={task.id}
                    onClick={() => addFromBacklog(task.id)}
                    className="w-full text-left p-3 rounded-xl border border-border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full font-medium capitalize"
                        style={{ color: p.color, backgroundColor: p.bg }}
                      >
                        {task.priority}
                      </span>
                      {task.storyPoints && (
                        <span className="text-[11px] text-muted-foreground">{task.storyPoints} SP</span>
                      )}
                    </div>
                    <p className="text-sm font-medium line-clamp-2">{task.title}</p>
                  </button>
                )
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 直接新增任務 Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md rounded-2xl p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold">新增任務</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="font-semibold text-sm">Title</Label>
              <Input
                placeholder="e.g. Design login page"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
                className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-sm">Description (optional)</Label>
              <Input
                placeholder="What needs to be done..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
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
                      onClick={() => setNewPriority(p)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                      style={{
                        backgroundColor: newPriority === p ? cfg.bg : "#F3F4F6",
                        color: newPriority === p ? cfg.color : "#6B7280",
                        outline: newPriority === p ? `2px solid ${cfg.color}` : "none",
                        outlineOffset: "2px",
                      }}
                    >
                      {p}
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
                    onClick={() => setNewStoryPoints(newStoryPoints === sp ? null : sp)}
                    className="w-10 h-10 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: newStoryPoints === sp ? "#F97316" : "#F3F4F6",
                      color: newStoryPoints === sp ? "white" : "#6B7280",
                    }}
                  >
                    {sp}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-sm">Assignee (optional)</Label>
              <AssigneePicker members={members} value={newAssigneeId} onChange={setNewAssigneeId} />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-sm">Due Date (optional)</Label>
              <Input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-8">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button
              onClick={handleCreateTask}
              disabled={creating}
              className="bg-[#F97316] hover:bg-[#ea6c0a] text-white rounded-full px-6"
            >
              {creating ? "Creating..." : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Detail Modal：點擊任務卡片後開啟 */}
      {selectedTaskId && (
        <TaskDetailModal
          projectId={projectId}
          taskId={selectedTaskId}
          memberIds={memberIds}
          open={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  )
}
