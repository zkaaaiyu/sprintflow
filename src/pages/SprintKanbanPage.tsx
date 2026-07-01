import { useState, useEffect } from "react"
import type { ReactNode } from "react" // 這裡用來標注 DroppableColumn 的 children 參數型別
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { doc, updateDoc, writeBatch, addDoc, collection, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {  // 引入拖曳套件 @dnd-kit 
  DndContext,               // 最外層的拖曳環境容器
  DragOverlay,              // 拖 曳時跟著滑鼠移動的「分身卡片」
  closestCorners,           // 碰撞偵測演算法：找最近的角落
  useDroppable,             // 讓某個區域變成「可放置區」
  MouseSensor,              // 滑鼠拖曳感應器
  TouchSensor,              // 觸控拖曳感應器（手機用）
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type { DragEndEvent, DragStartEvent, DragOverEvent } from "@dnd-kit/core"
import {
  SortableContext,             // 讓一組元素可以互相排序
  useSortable,                 // 讓單一元素具備拖曳排序能力
  verticalListSortingStrategy, // 垂直排列的排序策略
  arrayMove,                   // 陣列換位工具：把第 i 個元素移到第 j 個
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"// CSS.Transform.toString()：把 dnd-kit 的 transform 物件轉成 CSS 字串
//引入 前面寫好的hook
import { useSprint } from "@/hooks/useSprint"
import { useTasks, type TaskStatus, type Task, type Priority, type StoryPoints } from "@/hooks/useTasks"
import { PRIORITY_CONFIG } from "@/lib/priority"
import { TASK_STATUS_CONFIG } from "@/lib/taskStatus"
import { SPRINT_STATUS_CONFIG } from "@/lib/sprintStatus"
import { BRAND } from "@/lib/colors"
import { useWorkspace } from "@/hooks/useWorkspace"
import { useMembers, type UserProfile } from "@/hooks/useMembers"
import { MemberAvatar } from "@/components/shared/MemberAvatar"
import { getDaysRemaining } from "@/lib/dueDate"
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
import { MoreHorizontal, Plus, ChevronDown, TriangleAlert, CheckCircle2 } from "lucide-react"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import { toast } from "sonner"
import TaskDetailModal from "@/components/TaskDetailModal"
import { useAuth } from "@/contexts/AuthContext"

// kanban 四個欄位定義
const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "todo",        label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "review",      label: "Review" },
  { id: "done",        label: "Done" },
]

const COLUMN_IDS = new Set(["todo", "in_progress", "review", "done"]) //set是類似陣列的容器但是內容不能重複 用來判斷裡裡面是否有某個東西很好用 

// 日期格式化
function formatDateRange(start: Date | null, end: Date | null) {
  if (!start || !end) return "—"
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  return `${fmt(start)} – ${fmt(end)}`
}

// 指派人下拉選單元件
function AssigneePicker({ members, value, onChange }: {
  members: UserProfile[]
  value: string | null
  onChange: (uid: string | null) => void 
}) {
  const [open, setOpen] = useState(false)
  const selected = members.find((m) => m.uid === value)// 從 members 陣列找出目前選中的完整用戶物件
  return (
    <div className="relative">
      {/* 觸發按鈕 */}
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

      {/* 下拉選單本體 */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false) }}
            className="w-full px-3 py-2.5 flex items-center gap-2 text-sm hover:bg-accent text-muted-foreground"
          >
            Unassigned
          </button>
          {/* 每個成員一個選項 */}
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
  const p = PRIORITY_CONFIG[task.priority] //根據優先級查表

  const isOverdue = task.dueDate && task.status !== "done" && new Date() > task.dueDate  // 逾期判斷

  return (
    // 卡片內容渲染
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all animate-in fade-in-0 duration-300 min-h-[110px] flex flex-col"
    >
      {/* 優先級圓點 + SP */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: p.bg }}
        />
        {task.storyPoints && (
          <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {task.storyPoints} SP
          </span>
        )}
      </div>

      {/* 標題 */}
      <p className="text-sm font-medium mb-3 line-clamp-2 flex-1">{task.title}</p>

      {/* 底部：到期日 + 指派人頭像 */}
      <div className="flex items-center justify-between">
        {task.status === "done" ? (
          <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: "#6F9E8A" }}>
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            Complete
            {task.doneAt && (
              <span className="text-muted-foreground font-normal">
                · {task.doneAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </span>
        ) : task.dueDate ? (() => {
          const { label, color } = getDaysRemaining(task.dueDate)
          const overdue = label === "Overdue"
          return (
            <span className="flex items-center gap-0.5 text-[11px] font-medium" style={{ color }}>
              {overdue && <TriangleAlert className="w-3 h-3 shrink-0" />}
              {label}
            </span>
          )
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
    // setNodeRef：用來確定哪一個元素要被拖動
    // transform：記錄現在拖到哪的座標數據 
    // transition：動畫設定
    // listeners：所有的滑鼠跟觸控監聽事件（按下、移動、放開）。
    // attributes：無障礙屬性
    // isDragging：是否正在被拖動
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? undefined : transition,
      }}
      {...attributes}
      {...listeners}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className={isDragging ? "opacity-0" : ""}
    >
      {/* 把 onClick 傳空值 讓原本卡片的點擊事件也由包裝函數負責 避免重複觸發 */}
      <KanbanCard task={task} assignee={assignee} onClick={() => {}} />
    </div>
  )
}

// 可放置區域設定
function DroppableColumn({ id, children }: { id: string; children: ReactNode }) {
  const { setNodeRef } = useDroppable({ id }) 
  return (
    <div ref={setNodeRef} className="flex flex-col gap-2 flex-1 pr-1 min-h-20">
      {children}
    </div>
  )
}

export default function SprintKanbanPage() {
  const { projectId = "", sprintId = "" } = useParams() //用useParams拿到網址的查詢參數 才知道是哪一個專案下的哪一個sprint
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const { user } = useAuth()
  const { projects, loading: projectLoading } = useWorkspace() //把 loading 改名 projectLoading 避免撞名
  const { sprint, loading: sprintLoading, startSprint, completeSprint, deleteSprint, updateSprint } = useSprint(projectId, sprintId) //要記得傳入projectId 跟sprintId
  const { tasks, loading: tasksLoading, createTask } = useTasks(projectId) 

  const project = projects.find((p) => p.id === projectId) // 到project陣列裡面找到id = projectId 的專案
  const memberIds = project?.memberIds ?? [] //定義memberIds --> 找到 project 裡面的 memberids用

  const { members } = useMembers(memberIds)

  // 用filter 過濾 只顯示這個 sprint 的任務
  const sprintTasks = tasks.filter((t) => t.sprintId === sprintId)
  //  用filter 過濾出還在 Backlog 的任務
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

  // 從 Command Palette 搜尋結果跳轉過來：網址帶 ?openTask=taskId 時自動開啟該任務，並把參數清掉
  useEffect(() => {
    const openTask = searchParams.get("openTask")
    if (!openTask) return
    setSelectedTaskId(openTask)
    searchParams.delete("openTask")
    setSearchParams(searchParams, { replace: true })
  }, [searchParams])

  // 新增任務相關：記錄點擊哪一欄的 +，以及兩個新增 Modal 的開關
  const [activeAddColumn, setActiveAddColumn] = useState<TaskStatus | null>(null)
  const [showTodoModal, setShowTodoModal] = useState(false)
  const [todoTab, setTodoTab] = useState<"create" | "backlog">("create")
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
  const [overColumnId, setOverColumnId] = useState<string | null>(null) // 拖拉時目前懸停的欄位

  // 篩選列狀態：可多選成員、單選優先級
  const [filterMemberIds, setFilterMemberIds] = useState<string[]>([])
  const [filterPriority, setFilterPriority]   = useState<Priority | null>(null)

  // 切換成員篩選（toggle）
  const toggleMemberFilter = (uid: string) => { 
    setFilterMemberIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid] //如果篩選籃裡面已經有這個人了用filter把這個人踢出籃子 如果沒有就加入篩選籃裡
    )
  }

  // 判斷任務是否符合篩選條件 
  const isTaskVisible = (task: Task) => {
    const memberMatch   = filterMemberIds.length === 0 || filterMemberIds.includes(task.assigneeId ?? "") // 如果沒有選擇人員篩選條件全部顯示 || 檢查選擇的人有沒有在指派名單裡面 防呆給一個空串
    const priorityMatch = filterPriority === null || task.priority === filterPriority //處理優先級篩選 邏輯同上
    return memberMatch && priorityMatch //注意這裡要用「且」
  }

  // dnd-kit sensors 設定： 觸發限制 -> 滑鼠移動超過 5px  用來區分點開taskDetail modal 還是拖拉卡片
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), // 移動超過5px才判定卡片拖拉
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }) // 行動裝置 首要停留在卡片上超過250 ms 才判定卡片拖拉
  )

  // task edit modal 原資料回填
  const openEditModal = () => {
    if (!sprint) return
    setEditName(sprint.name)
    setEditGoal(sprint.goal ?? "")
    setEditStartDate(sprint.startDate ? sprint.startDate.toISOString().slice(0, 10) : "")
    setEditEndDate(sprint.endDate ? sprint.endDate.toISOString().slice(0, 10) : "")
    setShowEditModal(true)
  }

  // 儲存 Sprint 編輯
  const handleUpdate = async () => {
    if (!editName.trim()) { toast.error("Sprint name is required"); return } //為空提示
    setActionLoading(true)
    await updateSprint({
      name: editName.trim(),
      goal: editGoal.trim(),
      startDate: editStartDate ? new Date(editStartDate) : undefined,
      endDate: editEndDate ? new Date(editEndDate) : undefined,
    })
    toast.success("Sprint updated")
    setShowEditModal(false)
    setActionLoading(false)
  }

  // 結束 Sprint：未完成任務退回 Backlog
  const handleComplete = async () => {
    setActionLoading(true)
    const moved = await completeSprint()
    toast.success(`Sprint completed. ${moved} task${moved !== 1 ? "s" : ""} returned to Backlog`)
    setShowCompleteConfirm(false)
    setActionLoading(false)
  }

  // 刪除 Sprint -> 所有任務退回 Backlog，再跳回專案頁
  const handleDelete = async () => {
    setActionLoading(true)
    await deleteSprint()
    toast.success("Sprint deleted")
    navigate(`/projects/${projectId}`)
  }

  // 從 Backlog 選取任務加入此 Sprint，status 強制設為 todo
  const addFromBacklog = async (taskId: string) => {
    await updateDoc(doc(db, "projects", projectId, "tasks", taskId), {
      sprintId,
      status: "todo",
    })
    toast.success("Task added to Sprint")
  }

  // 拖拉開始：記錄被拖動的任務，用來渲染 DragOverlay
  const handleDragStart = ({ active }: DragStartEvent) => {
    const task = sprintTasks.find((t) => t.id === active.id) //找到要被拖曳的task
    setDraggingTask(task ?? null)
  }

  const handleDragOver = ({ over }: DragOverEvent) => {
    // over.id 可能是 task id（拖到別張卡上）或 column id（拖到空欄位）
    // 只有當 over.id 是欄位本身時才標亮
    const overId = over?.id as string | undefined
    setOverColumnId(overId && COLUMN_IDS.has(overId) ? overId : null)
  }

  // 拖拉結束：計算新位置，批次更新 Firestore
  const handleDragEnd = async ({ active, over }: DragEndEvent) => { //參數 active 跟 over 是 dnd-kit 在拖曳結束提供的事件包 active就是正在拖拉的那一張哪片 over 是拖拉到哪一個位置（可能是被壓住的卡片或是空欄位） 
    setDraggingTask(null)
    setOverColumnId(null)
    if (!over) return  //如果拖到的不是卡片上面或是空欄位 -> 也就是拖到看板外了 -> 直接結束

    const activeId = active.id as string
    const overId   = over.id as string
    if (activeId === overId) return //如果放回原位的話直接結束

    const activeTask = sprintTasks.find((t) => t.id === activeId)
    if (!activeTask) return //如果找不到這一張卡片也直接結束

    // 判斷目的地 -> over 可能是任務 id 或欄位 id
    const overTask = sprintTasks.find((t) => t.id === overId)
    const destColumnId = (overTask?.status ?? overId) as TaskStatus //目標欄位id
    if (!COLUMNS.find((c) => c.id === destColumnId)) return

    const batch = writeBatch(db)
    const isSameColumn = activeTask.status === destColumnId // 判斷是不是同一個欄位

    if (isSameColumn) {
      // 同欄拖拉內拖 -> 用arrayMove更新順序 
      const colTasks = sprintTasks
        .filter((t) => t.status === destColumnId) //取出這個欄位的所有task
        .sort((a, b) => a.order - b.order) // 根據order排序

      const oldIndex = colTasks.findIndex((t) => t.id === activeId)
      const newIndex = colTasks.findIndex((t) => t.id === overId)
      if (oldIndex === -1 || newIndex === -1) return //如果是-1(找不到卡片)就結束

      arrayMove(colTasks, oldIndex, newIndex).forEach((task, index) => { // 用dnd-kit提供的arrayMove方法 傳入欄位的所有任務、就索引、新索引 再用foreach遍歷給出新的index
        batch.update(doc(db, "projects", projectId, "tasks", task.id), { //塞進 batch.update 的待更新清單裡
          order: (index + 1) * 1000, // 給新的order權重
        })
      })
    } else {
      // 跨欄拖拉：更新 status + order 同時修正 來源欄的 order
      const srcTasks = sprintTasks //重新定義來源欄位的 task 陣列 把 active 的卡片踢除 然後排列好
        .filter((t) => t.status === activeTask.status && t.id !== activeId)
        .sort((a, b) => a.order - b.order)

      const destTasks = sprintTasks //撈出 目的欄位 目前現有的所有卡片 排列好
        .filter((t) => t.status === destColumnId)
        .sort((a, b) => a.order - b.order)

      // 找插入位置（index）
      const overIndex = overTask
        ? destTasks.findIndex((t) => t.id === overId) //如果壓在卡片上 找出被壓住的卡片index 排在它後面
        : destTasks.length //如果是放在空白處 就丟在欄位的最後面

      const newDestTasks = [...destTasks] //複製一個目標欄位的原本的陣列
      //把卡片插隊到 複製的陣列裡面 邏輯是新陣列如果找不到這張卡片（overIndex === -1 ）就放到最後 如果找得到執行splice裡面的插隊邏輯
      newDestTasks.splice(overIndex === -1 ? destTasks.length : overIndex, 0, activeTask) 

      // 更新目標欄的所有任務 order，被移動的任務還要更新 status
      newDestTasks.forEach((task, index) => { 
        const ref = doc(db, "projects", projectId, "tasks", task.id)
        if (task.id === activeId) { //如果是新加入的那一張哪片
          batch.update(ref, {
            status: destColumnId,
            order: (index + 1) * 1000,
            doneAt: destColumnId === "done" ? serverTimestamp() : null,
          })
        } else {
          batch.update(ref, { order: (index + 1) * 1000 }) //原本就在欄位裡的卡片只更新排序權重即可
        }
      })

      // 修正來源欄的 order（中間空了一個位置要補回來）
      srcTasks.forEach((task, index) => { //遍歷來源欄位重新排序 更新排序權重
        batch.update(doc(db, "projects", projectId, "tasks", task.id), {
          order: (index + 1) * 1000,
        })
      })
    }

    await batch.commit() // 提交 batch 進行更新

    // kanbanpage 跨欄位拖拉卡片要庚新到activity裡面
    if (!isSameColumn && user) {
      const fromLabel = COLUMNS.find((c) => c.id === activeTask.status)?.label ?? activeTask.status
      const toLabel   = COLUMNS.find((c) => c.id === destColumnId)?.label ?? destColumnId
      const activityData = {
        type: "field_changed",
        field: "status",
        label: "Status",
        fromValue: fromLabel,
        toValue: toLabel,
        changedBy: user.uid,
        changedByName: user.displayName || user.email || "Someone",
        changedByPhotoURL: user.photoURL ?? null,
        createdAt: serverTimestamp(),
      }
      // 寫入 task 層級的 activity（task detail 側欄顯示用）
      await addDoc(collection(db, "projects", projectId, "tasks", activeId, "activities"), activityData)
      // 同時寫入頂層 activities collection，供 Dashboard 跨專案查詢
      await addDoc(collection(db, "activities"), {
        ...activityData,
        projectId,
        taskId: activeId,
        taskTitle: activeTask.title,
      })
    }
  }

  const loading = projectLoading || sprintLoading || tasksLoading 
  if (loading) return (
    <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
  )
  if (!sprint) return (
    <div className="flex items-center justify-center h-full text-muted-foreground">Sprint not found</div>
  )

  return (
    <div
      className="flex flex-col gap-3 p-5"
      onClick={() => { // 在外層容器加上一個onclick事件如果點擊的話就清空篩選條件
        if (filterMemberIds.length > 0 || filterPriority !== null) {
          setFilterMemberIds([])
          setFilterPriority(null)
        }
      }}
    >

      {/* ── 上方狀態卡片 ── */}
      <div className="bg-card border border-border rounded-2xl shadow-sm px-5 py-3.5 flex items-center gap-3 flex-wrap shrink-0">

        {/* 名稱 + 狀態徽章 */}
        <h1 className="text-base font-bold whitespace-nowrap">{sprint.name}</h1>
        <span
          className="text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap"
          style={{
            color: SPRINT_STATUS_CONFIG[sprint.status].color,
            backgroundColor: SPRINT_STATUS_CONFIG[sprint.status].bg,
          }}
        >
          {SPRINT_STATUS_CONFIG[sprint.status].label}
        </span>

        {/* 日期 + 目標 */}
        <span className="text-sm text-muted-foreground whitespace-nowrap">
            {/* 調 formatDateRange函數 處理日期格式化顯示  */}
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

        {/* 成員頭像 + 優先級篩選（stopPropagation 防止點按鈕時觸發清除篩選項目） */}
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          {members.length > 0 && (
            <div className="flex items-center">
              {members.map((m, i) => (
                <button
                  key={m.uid}
                  onClick={() => toggleMemberFilter(m.uid)}
                  className={`rounded-full transition-all -ml-1.5 first:ml-0 ${
                    filterMemberIds.includes(m.uid)
                      ? "ring-2 ring-brand ring-offset-1 z-10"
                      : "opacity-70 hover:opacity-100"
                  }`}
                  style={{ zIndex: i }} // 用 zIndex 控制排列重疊層級
                >
                  <MemberAvatar user={m} />
                </button>
              ))}
            </div>
          )}
          {/* 垂直分隔線 */}
          <div className="w-px h-5 bg-border shrink-0" />
          
          {/* 優先級篩選按鈕列 */} 
          <div className="flex items-center gap-1">
            {/* All 按鈕：清除優先級篩選 */}
            <button
              onClick={() => setFilterPriority(null)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                filterPriority === null
                  ? "bg-foreground text-background" // 選中（無篩選）：深色背景白字
                  : "bg-muted text-muted-foreground hover:bg-muted/80" // 未選中：灰色
              }`}
            >
              All
            </button>
             {/* low / medium / high / urgent  用map渲染四個按鈕 */}
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
                    color: isActive ? cfg.color : "var(--muted-foreground)",
                    outline: isActive ? `1.5px solid ${cfg.color}` : undefined,
                    outlineOffset: isActive ? "2px" : undefined,
                  }}
                >
                  {p}
                </button>
              )
            })}
          </div>
        </div>

        {/* 垂直分隔線 */}
        <div className="w-px h-5 bg-border shrink-0" />

        {/* ⋯ 多工能選單 */} 
        <DropdownMenu>
          <DropdownMenuTrigger asChild> 
            <button className="p-1 rounded-lg hover:bg-muted transition-colors">
              <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-44">
            {sprint.status === "planning" && (
              <DropdownMenuItem onClick={async () => {
                try {
                  await startSprint()
                  toast.success("Sprint started")
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed to start sprint")
                }
              }}>
                Start Sprint
              </DropdownMenuItem>
            )}
            {sprint.status === "active" && ( 
              <DropdownMenuItem onClick={() => setShowCompleteConfirm(true)}>
                Complete Sprint
              </DropdownMenuItem>
            )}
            {sprint.status !== "completed" && (
              <DropdownMenuItem onClick={openEditModal}>
                Edit
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-500 focus:text-red-500"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── 下方看板卡片 ── */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-5 min-h-[640px]">
        <DndContext //dnd-kit拖曳包裝標籤
          sensors={sensors} // 偵測移動超過5px
          collisionDetection={closestCorners} //dnd-kit 提供的 碰撞偵測演算法
          onDragStart={handleDragStart} // 調用前面寫的開始拖曳函數
          onDragOver={handleDragOver}   // 追蹤目前拖到哪個欄位，用來標亮 Drop task here
          onDragEnd={handleDragEnd} // 調用前面寫的結束拖曳函數
        > 
          <div className="flex gap-4 items-start">
            {COLUMNS.map((col) => { // 用 map 映射出四個欄位
              const colTasks = sprintTasks
                .filter((t) => t.status === col.id) //抓出狀態跟欄位名稱匹配的任務
                .sort((a, b) => a.order - b.order) //排序
              const colSP = colTasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0) //用reduce加總故事點

              return (
                <div key={col.id} className="flex flex-col flex-1 min-w-0 relative hover:z-10">
                  {/* 欄位標題列 */}
                  <div className="px-1 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{col.label}</span>
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                          {colTasks.length}
                        </span>
                      </div>
                      {colSP > 0 && (
                        <span className="text-xs text-muted-foreground">{colSP} SP</span>
                      )}
                    </div>
                    <div className="h-0.5 rounded-full" style={{ backgroundColor: TASK_STATUS_CONFIG[col.id].bg }} />
                  </div>

                  <SortableContext // 用dnd-kit提供的 SortableContext 讓元素可以被拖動更換順序
                    items={colTasks.map((t) => t.id)} //要餵給他一個純id字串的陣列 所以用map映射出來 
                    strategy={verticalListSortingStrategy} //垂直排列的strategy
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
                      {col.id === "todo" && sprint.status !== "completed" && (
                        <button
                          onClick={() => { setActiveAddColumn("todo"); setTodoTab("create"); setShowTodoModal(true) }}
                          className="w-full border-2 border-dashed border-border rounded-2xl min-h-[80px] flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-brand hover:text-brand transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                          <span className="text-xs font-medium">Add Task</span>
                        </button>
                      )}
                      {col.id !== "todo" && colTasks.length === 0 && (
                        <div className={`flex-1 border-2 border-dashed rounded-2xl min-h-[120px] flex flex-col items-center justify-center gap-1.5 transition-colors cursor-default select-none ${
                          overColumnId === col.id
                            ? "border-brand text-brand"
                            : "border-border text-muted-foreground"
                        }`}>
                          <Plus className="w-5 h-5" />
                          <span className="text-xs font-medium">Drop task here</span>
                        </div>
                      )}
                    </DroppableColumn>
                  </SortableContext>
                </div>
              )
            })}
          </div>
            {/* 處理拖動動畫的渲染 */}
          <DragOverlay dropAnimation={null}>
            {draggingTask && ( //當有卡片被拖拉的時候炫染一張一樣的卡片作為分身
              <div className="shadow-xl rotate-1 opacity-90">
                <KanbanCard
                  task={draggingTask} 
                  assignee={members.find((m) => m.uid === draggingTask.assigneeId)} // 資料庫只記錄 assigneeId 要撈出其他資料＋重新渲染出頭像
                  onClick={() => {}} //不要有點擊事件
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
            <DialogTitle>Complete Sprint</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-6">
            Incomplete tasks will be returned to Backlog. Are you sure?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowCompleteConfirm(false)}>Cancel</Button>
            <Button
              onClick={handleComplete} //調用處理完成專案的函數
              disabled={actionLoading}
              className="bg-brand hover:bg-brand-hover text-white rounded-full px-6"
            >
              {actionLoading ? "Processing..." : "Complete Sprint"}
              {/* actionLoading 時顯示 "Processing..."，防止重複點擊 */}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 刪除 Sprint 確認 */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Sprint"
        description="All tasks in this Sprint will be returned to Backlog."
        onConfirm={handleDelete}
        loading={actionLoading}
      />

      {/* 編輯 Sprint Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md rounded-2xl p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold">Edit Sprint</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
             {/* Sprint 名稱 */}
            <div className="space-y-2">
              <Label className="font-semibold text-sm">Sprint Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1"
              />
            </div>
            {/* Sprint 目標（選填） */}
            <div className="space-y-2">
              <Label className="font-semibold text-sm">Goal (optional)</Label>
              <textarea
                value={editGoal}
                onChange={(e) => setEditGoal(e.target.value)}
                rows={3}
                className="w-full rounded-xl bg-muted border-0 px-3 py-2.5 text-sm resize-none outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            {/* 日期：兩欄並排 */}
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
          {/* 底部按鈕 */}
          <div className="flex justify-end gap-3 mt-8">
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button
              onClick={handleUpdate}
              disabled={actionLoading}
              className="bg-brand hover:bg-brand-hover text-white rounded-full px-6"
            >
              {actionLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

{/* Todo 欄虛線卡片：New Task / From Backlog 合併 Modal */}
      <Dialog open={showTodoModal} onOpenChange={(open) => {
        setShowTodoModal(open)
        //關閉時
        if (!open) { setNewTitle(""); setNewDescription(""); setNewPriority("medium"); setNewStoryPoints(null); setNewAssigneeId(null); setNewDueDate("") }
      }}>
        <DialogContent className="sm:max-w-2xl rounded-2xl p-8 flex flex-col min-h-[580px]">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-bold">
              {todoTab === "create" ? "New Task" : "From Backlog"}  {/* 標題跟著 Tab 切換 */}
            </DialogTitle>
          </DialogHeader>
          {/* Tab 切換 */}
          <div className="flex gap-1 bg-muted p-1 rounded-xl mb-6">
            {(["create", "backlog"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setTodoTab(tab)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  todoTab === tab ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "create" ? "New Task" : "From Backlog"}
              </button>
            ))}
          </div>

          {/* ── Create 新任務 Tab ── */}
          <div className="flex-1">
          {todoTab === "create" ? (
            <div key="create" className="animate-in fade-in duration-200 space-y-6">
              {/* 標題輸入框 */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-sm">Title</Label>
                <Input
                  placeholder="e.g. Design login page"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  autoFocus
                  className="rounded-full bg-muted border-0 h-11 focus-visible:ring-1 px-4"
                />
              </div>

              {/* SP + Priority */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-sm">Story points</Label>
                  <div className="flex gap-1.5">
                    {([1, 2, 3, 5, 8, 13] as StoryPoints[]).map((sp) => (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => setNewStoryPoints(newStoryPoints === sp ? null : sp)}
                        className="w-9 h-9 rounded-full text-sm font-semibold transition-all"
                        style={{
                          backgroundColor: newStoryPoints === sp ? BRAND : "var(--subtle-bg)",
                          color: newStoryPoints === sp ? "white" : "var(--muted-foreground)",
                        }}
                      >
                        {sp}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Priority 選擇器 */}
                <div className="space-y-1.5">
                  <Label className="font-semibold text-sm">Priority</Label>
                  <div className="flex gap-1.5">
                    {(["low", "medium", "high", "urgent"] as Priority[]).map((p) => {
                      const cfg = PRIORITY_CONFIG[p]
                      const selected = newPriority === p
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setNewPriority(p)}
                          className="flex-1 py-2 rounded-full text-xs font-medium transition-all border"
                          style={
                            selected
                              ? { backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.bg }
                              : { backgroundColor: "transparent", color: "var(--muted-foreground)", borderColor: "var(--border)" }
                          }
                        >
                          {cfg.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Assignee + Due Date */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-sm">Assignee</Label>
                  <AssigneePicker members={members} value={newAssigneeId} onChange={setNewAssigneeId} />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-sm">Due date</Label>
                  <Input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-sm">Description (optional)</Label>
                <textarea
                  placeholder="What needs to be done..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full rounded-2xl bg-muted border-0 p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <Button variant="ghost" onClick={() => setShowTodoModal(false)}>Cancel</Button>
                <Button
                  onClick={async () => {
                    if (!newTitle.trim()) { toast.error("Please enter a task title"); return }
                    setCreating(true)
                    await createTask({
                      title: newTitle.trim(),
                      description: newDescription,
                      priority: newPriority,
                      storyPoints: newStoryPoints,
                      dueDate: newDueDate ? new Date(newDueDate) : null,
                      assigneeId: newAssigneeId,
                      sprintId,
                      status: "todo",
                    })
                    toast.success("Task created")
                    setNewTitle(""); setNewDescription(""); setNewPriority("medium")
                    setNewStoryPoints(null); setNewAssigneeId(null); setNewDueDate("")
                    setShowTodoModal(false)
                    setCreating(false)
                  }}
                  disabled={creating}
                  className="bg-brand hover:bg-brand-hover text-white rounded-full px-8"
                >
                  {creating ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          ) : (
            <div key="backlog" className="animate-in fade-in duration-200">
              {backlogTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No tasks in backlog to assign</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                  {backlogTasks.map((task) => {
                    const p = PRIORITY_CONFIG[task.priority]
                    return (
                      <button
                        key={task.id}
                        onClick={() => { addFromBacklog(task.id); setShowTodoModal(false) }}
                        className="text-left p-3 rounded-xl border border-border hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                            style={{ color: p.color, backgroundColor: p.bg }}
                          >
                            {p.label}
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
            </div>
          )}
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
          readOnly={sprint?.status === "completed"}
        />
      )}
    </div>
  )
}
