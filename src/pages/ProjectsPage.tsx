//Project 頁面
import { useState, useEffect, useRef, useMemo } from "react"
import { motion } from "framer-motion" //動畫套件
import { useNavigate } from "react-router-dom"
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from "@dnd-kit/core"
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core"
import { SortableContext, useSortable, rectSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useWorkspace } from "@/hooks/useWorkspace"
import { useActiveSprintTasks } from "@/hooks/useActiveSprintTasks"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Trash2, Timer, Sun, Sunset, Moon, ArrowUpDown, Check, CalendarDays, CalendarClock, CheckCircle2, Zap } from "lucide-react"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import { useWorkspaceStats } from "@/hooks/useWorkspaceStats"
import { MemberAvatar } from "@/components/shared/MemberAvatar"

import { toast } from "sonner"
import type { Project } from "@/hooks/useWorkspace"
import { useMembers, type UserProfile } from "@/hooks/useMembers"
import { type Sprint } from "@/hooks/useSprints"
import { useAllActiveSprints } from "@/hooks/useAllActiveSprints"
import { COLOR_OPTIONS } from "@/lib/constants"

// ─── 處理堆疊頭像 ───
function MemberAvatars({ members, totalCount }: { members: UserProfile[]; totalCount: number }) {
  return (
    <div className="flex -space-x-2">
      {members.map((m) => <MemberAvatar key={m.uid} user={m} size="md" />)}
      {totalCount > 3 && (
        // 超過 3 個成員，只顯示 3 個頭像 + "+N" 的灰色圓圈
        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-semibold">
          +{totalCount - 3}
        </div>
      )}
    </div>
  )
}

// 根據任務狀態產生互動短句
function getStatusMessage(
  overdueCount: number,
  dueTodayCount: number,
  completedThisWeekCount: number,
  loading: boolean,
  firstName: string
): string {
  if (loading) return ""
  if (overdueCount > 0)
    return `You have ${overdueCount} overdue task${overdueCount > 1 ? "s" : ""} — your past self is judging you. Time to make things right. 😬`
  if (dueTodayCount > 0)
    return `${dueTodayCount} task${dueTodayCount > 1 ? "s" : ""} need${dueTodayCount === 1 ? "s" : ""} you today, ${firstName}. The deadline gods are watching. 🔥`
  if (completedThisWeekCount > 0)
    return `All caught up! ${completedThisWeekCount} task${completedThisWeekCount > 1 ? "s" : ""} crushed in active sprints. You're basically a productivity ninja. 🎉`
  return "No tasks assigned yet — living the dream. Enjoy the calm before the storm. ☁️"
}


// 封裝 projectCard 
function ProjectCard({ project, onDelete, isOwner, activeSprint, members }: {
  //定義參數型別
  project: Project
  onDelete: (e: React.MouseEvent) => void
  isOwner: boolean
  activeSprint: Sprint | null
  members: UserProfile[]
}) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/projects/${project.id}`)}  // 點卡片跳到專案詳情頁
      className="border 
      border-border rounded-2xl p-4 shadow-sm hover:scale-[1.02] hover:shadow-md transition-all cursor-pointer group flex flex-col aspect-[3/2] bg-card overflow-hidden"
      // hover:scale-[1.02]：hover 時卡片放大到 102%
      // group：讓子元素可以用 group-hover: 偵測父元素的 hover 狀態
      // aspect-[3/2]：寬高比固定 3:2
    >
      {/* 頂部顏色條 */}
      <div className="-mx-4 -mt-4 mb-4 h-3" style={{ backgroundColor: project.color }} />
      {/* 標題 + 刪除 */}
      <div className="flex items-start justify-between mb-1.5">
        <h2 className="font-semibold text-base leading-snug">{project.name}</h2>
        {isOwner && (
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0 ml-2 mt-0.5"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {project.description ? (
        // 用 line-clamp-2 限制只顯示兩行
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1"> 
          {project.description}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground/50 italic mb-4 flex-1">No description</p>
      )}

      {/* 底部：Sprint + 頭像 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs">
          <Timer className="w-3.5 h-3.5" style={{ color: activeSprint ? "var(--brand)" : undefined }} />
          {activeSprint ? (
            <span className="font-medium" style={{ color: "var(--brand)" }}>{activeSprint.name}</span>
          ) : (
            <span className="text-muted-foreground">No active sprint</span>
          )}
        </div>
        <MemberAvatars members={members} totalCount={project.memberIds.length} />
      </div>
    </div>
  )
}

// 拖拉排序包裝層（拖拉後自動切換 custom 模式）
function SortableProjectCard({ project, onDelete, isOwner, activeSprint, members }: {
  project: Project
  onDelete: (e: React.MouseEvent) => void
  isOwner: boolean
  activeSprint: Sprint | null
  members: UserProfile[]
}) {
  const { 
    attributes,   // 無障礙屬性
    listeners,    // 滑鼠/觸控事件監聽（mousedown, touchstart）
    setNodeRef,   // 把這個 div 註冊為「可拖拉的節點」
    transform,    // 拖拉時的位移數值 { x, y, scaleX, scaleY }
    transition,   // 放開後回彈的動畫
    isDragging,   // 是否正在被拖拉中
   } = useSortable({
    id: project.id,
  })
  return (
    <div
      ref={setNodeRef} // 把這個 DOM 元素交給 dnd-kit 管理
      style={{ transform: CSS.Transform.toString(transform), transition, 
        visibility: isDragging ? "hidden" : "visible" }}  // 拖拉時隱藏原位置的卡片
      className="cursor-grab active:cursor-grabbing"
      {...attributes}   // 展開無障礙屬性
      {...listeners}   // 展開拖拉事件監聽
    >
      <ProjectCard project={project} onDelete={onDelete} isOwner={isOwner} activeSprint={activeSprint} members={members} />
    </div>
  )
}

// 主頁面
export default function ProjectsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { projects, loading, createProject, deleteProject, joinProject } = useWorkspace()
  const { projectOrder, setProjectOrder } = useAuth() //projectorder存在localstorage裡面
  const { groups: activeSprintGroups, loading: groupsLoading } = useActiveSprintTasks(projects, loading)
  const wsStats = useWorkspaceStats(activeSprintGroups, groupsLoading)

  // 一次查所有 project 的 active sprint 和所有成員，解決 N+1 問題
  const { activeSprintMap } = useAllActiveSprints(projects.map(p => p.id))
  const allMemberIds = useMemo(() => [...new Set(projects.flatMap(p => p.memberIds))], [projects])
  const { members: allMembers } = useMembers(allMemberIds)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } })) //用useSensors告訴dndkit要拖動超過5px才算是啟動拖拉
  const [draggingProject, setDraggingProject] = useState<Project | null>(null) //記錄正在被拖拉的專案是哪一個

  type ModalTab = "create" | "join"
  // ─── 排序相關 state ───
  type SortMode = "default" | "createdAt" | "custom"
  const [open, setOpen] = useState(false)
  const [modalTab, setModalTab] = useState<ModalTab>("create")
  const [sortMode, setSortMode] = useState<SortMode>("default")
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  const [iconAnimKey, setIconAnimKey] = useState(0) //wks互動動畫
  const iconAnimating = useRef(false) //用 useRef 而不是 useState 的原因 -> 改變 ref 的值不會觸發 re-render，只是單純記錄一個狀態。

  //點擊排序選單外部 就關閉
  useEffect(() => {
    if (!sortMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [sortMenuOpen])

  //create project相關state 
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState(COLOR_OPTIONS[0].value)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  // join project相關state 
  const [inviteCode, setInviteCode] = useState("")
  const [joining, setJoining] = useState(false)

  // 排序與事件處理函式
  const sortedProjects = [...projects].sort((a, b) => {
    if (sortMode === "createdAt") { 
      return (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0)
    }
    if (sortMode === "custom") {
      const ai = projectOrder.indexOf(a.id)
      const bi = projectOrder.indexOf(b.id)
      if (ai === -1 && bi === -1) return 0
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    }
    return 0
  })
  //變更排序模式
  const handleSortChange = (mode: SortMode) => {
    setSortMode(mode)
    if (mode === "custom" && projectOrder.length === 0) {
      setProjectOrder(projects.map((p) => p.id))
    }
    setSortMenuOpen(false)
  }

  const handleOpenChange = (o: boolean) => {
    setOpen(o)
    if (!o) { //如果是false 執行清空表單
      setModalTab("create")
      setName(""); setDescription(""); setColor(COLOR_OPTIONS[0].value)
      setInviteCode("")
    }
  }

  // create project 函數
  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Project name is required"); return }
    setSubmitting(true) //允許提交
    await createProject(name.trim(), description.trim(), color) //調用自定義hooks useworkSpace 裡面的 create project 處理資料端
    toast.success("Project created")

    //清空表單＆關閉
    setName(""); setDescription(""); setColor(COLOR_OPTIONS[0].value)
    setOpen(false); setSubmitting(false)
  }

  // join project 函數
  const handleJoin = async () => {
    if (!inviteCode.trim()) { toast.error("Please enter an invite code"); return }
    setJoining(true)
    const result = await joinProject(inviteCode.trim())
    if (result === null) {
      toast.error("Invite code not found. Please check and try again.")
    } else if (result === "already") {
      toast.error("You are already a member of this project")
    } else {
      toast.success("Successfully joined the project!")
      setOpen(false)
      navigate(`/projects/${result}`)
    }
    setJoining(false)
  }

// Delete Alert （警告）
const handleDelete = (e: React.MouseEvent, projectId: string, projectName: string) => {
  e.stopPropagation() //阻止事件冒泡 Event Bubbling 因為刪除按鈕在卡片 div 裡面，不阻止的話點刪除會同時觸發卡片的 onClick 跳到projectdetailpage 
  setDeleteTarget({ id: projectId, name: projectName })
}
// project delete （執行刪除）
const confirmDelete = async () => {
  if (!deleteTarget) return
  await deleteProject(deleteTarget.id) //調自定義hooks裡面的 deleteProject 刪除firebase裡面的project資料
  toast.success(`"${deleteTarget.name}" deleted`)
  setDeleteTarget(null)
}
  const handleDragStart = ({ active }: DragStartEvent) => {
    setDraggingProject(sortedProjects.find((p) => p.id === active.id) ?? null)
    //從sortprojects 用find 找到被點擊的 project 是哪一個 找不到用null代替
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDraggingProject(null) //清除懸浮卡片
    if (!over || active.id === over.id) return 
    const ids = sortedProjects.map((p) => p.id)
    const oldIndex = ids.indexOf(active.id as string)//拖動之前在哪裡
    const newIndex = ids.indexOf(over.id as string) //拖動之後放到哪裡
    const newOrder = arrayMove(ids, oldIndex, newIndex)
    setSortMode("custom")   // 拖拉後自動切換到自定義排序
    setProjectOrder(newOrder)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
  )

  return (

  <Dialog open={open} onOpenChange={handleOpenChange}>
    <div className="max-w-6xl mx-auto pt-4">

      {/* ── Header 問候語 + 狀態統計── */}
      {(() => {
        const hour = new Date().getHours()
        const isEvening = hour >= 18 || hour < 5
        const isAfternoon = hour >= 12 && hour < 18
        const TimeIcon = isEvening ? Moon : isAfternoon ? Sunset : Sun
        const greeting = isEvening ? "GOOD EVENING," : isAfternoon ? "GOOD AFTERNOON," : "GOOD MORNING,"
        const firstName = user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "there"
        const formattedDate = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
        const statusMsg = getStatusMessage(wsStats.overdueCount, wsStats.dueTodayCount, wsStats.completedThisWeekCount, wsStats.loading, firstName)

        return (
          <div className="mb-20">
            {/* Row 1：問候語左側，統計數字右側 */}
            <div className="flex items-center justify-between">
              <h1 className="flex items-center gap-3 text-4xl font-bold" style={{ color: "var(--foreground)" }}>
                <span>{greeting}</span>
                <span>{firstName}</span>
                <motion.span
                  key={iconAnimKey}
                  className="inline-flex shrink-0 cursor-default select-none"
                  animate={ 
                    isEvening
                      ? { rotate: [0, -18, 22, -12, 10, 0], scale: [1, 1.15, 1.1, 1.12, 1.05, 1] }
                      : isAfternoon
                      ? { y: [0, -7, -4, -6, 0],            scale: [1, 1.15, 1.1, 1.12, 1.05, 1] }
                      : { rotate: [0, 120, 260, 360],        scale: [1, 1.25, 1.15, 1] }
                  }
                  transition={{ duration: isEvening ? 0.6 : 0.7, ease: "easeInOut" }}
                  onHoverStart={() => {
                    if (iconAnimating.current) return // 動畫中不重複觸發
                    iconAnimating.current = true
                    setIconAnimKey((k) => k + 1)
                    setTimeout(() => { iconAnimating.current = false }, 750)
                  }}
                >
                  <TimeIcon className="text-brand" style={{ width: 32, height: 32 }} />
                </motion.span>
              </h1>

              <div className="flex items-center gap-9 text-lg text-muted-foreground shrink-0">
                <div className="flex items-center gap-2.5">
                  <CalendarClock className="w-6 h-6" style={{ color: "var(--stat-due)" }} />
                  <span>
                    <strong className="text-foreground">{wsStats.loading ? "\u2014" : wsStats.dueTodayCount}</strong>
                    {" "}Tasks due
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-6 h-6" style={{ color: "var(--stat-done)" }} />
                  <span>
                    <strong className="text-foreground">{wsStats.loading ? "\u2014" : wsStats.completedThisWeekCount}</strong>
                    {" "}Done
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Zap className="w-6 h-6" style={{ color: "var(--brand)" }} />
                  <span>
                    <strong className="text-foreground">{wsStats.loading ? "\u2014" : wsStats.activeSprintsCount}</strong>
                    {" "}Sprint
                  </span>
                </div>
              </div>
            </div>

            {/* Row 2：互動短句 */}
            <p className="mt-2 text-sm text-muted-foreground">{statusMsg || " "}</p>

            {/* Row 3：workspace 簡介左側，日期右側 */}
            <div className="flex items-center justify-between mt-3">
              <p className="text-sm" style={{ color: "var(--subtle-foreground)" }}>
                Here's your workspace — all your projects, sprints, and tasks live here. Pick up where you left off, or start something new.
              </p>
              <div className="flex items-center gap-2 text-base text-muted-foreground shrink-0 ml-8">
                <CalendarDays className="w-5 h-5" />
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>
        )
      })()}

      {/* 專案列表標題列：Sort 按鈕 */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-muted-foreground">Projects</p>

        {/* Sort 按鈕 */}
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setSortMenuOpen((o) => !o)} //點擊打開排序選單
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm text-muted-foreground hover:bg-foreground hover:text-background hover:border-foreground transition-colors duration-500"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Sort</span>
          </button>
          {sortMenuOpen && (
            <div className="absolute right-0 top-full mt-3 w-44 bg-popover border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
              {([
                { key: "default",   label: "Default" },
                { key: "createdAt", label: "Created time" },
                { key: "custom",    label: "Custom order" },
              ] as { key: SortMode; label: string }[]).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => handleSortChange(opt.key)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <span>{opt.label}</span>
                  {sortMode === opt.key && <Check className="w-3.5 h-3.5 text-brand" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* 刪除專案確認 */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Project"
        description={`"${deleteTarget?.name}" and all its data will be permanently deleted.`}
        onConfirm={confirmDelete}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortedProjects.map((p) => p.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-7">
            {sortedProjects.map((project) => (
              <SortableProjectCard
                key={project.id}
                project={project}
                isOwner={project.ownerId === user?.uid}
                onDelete={(e) => handleDelete(e, project.id, project.name)}
                activeSprint={activeSprintMap[project.id] ?? null}
                members={allMembers.filter(m => project.memberIds.includes(m.uid)).slice(0, 3)}
              />
            ))}
            <button
              onClick={() => handleOpenChange(true)}
              className="border-2 border-dashed border-border rounded-2xl p-4 aspect-[3/2] flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-brand hover:text-brand transition-colors group"
            >
              <Plus className="w-6 h-6" />
              <span className="text-sm font-medium">New Project</span>
            </button>
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={null}>
          {draggingProject && (
            <div className="shadow-xl rotate-1 opacity-90">
              <ProjectCard project={draggingProject} isOwner={false} onDelete={() => {}} activeSprint={null} members={[]} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>

  <DialogContent className="sm:max-w-md rounded-2xl p-8 flex flex-col">
    <DialogHeader className="mb-4">
      <DialogTitle className="text-2xl font-bold">
        {modalTab === "create" ? "Create Project" : "Join Project"}
      </DialogTitle>
    </DialogHeader>

    {/* create / join    Tab 切換 */}
    <div className="flex gap-1 bg-muted p-1 rounded-xl mb-6">
      {(["create", "join"] as ModalTab[]).map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => setModalTab(tab)}  //點擊調用函式切換tab
          className={cn(
            "flex-1 py-1.5 rounded-lg text-sm font-medium transition-all",
            modalTab === tab ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab === "create" ? "Create Project" : "Join Project"}
        </button>
      ))}
    </div>
    
    {/* 內容區（條件渲染） create 分頁 */}
    {modalTab === "create" ? (
      <div key="create" className="animate-in fade-in duration-200 flex flex-col flex-1">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="font-semibold text-sm">Project Name</Label>
            <Input
              id="name"
              placeholder="e.g. SprintFlow"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc" className="font-semibold text-sm">Description</Label>
            <textarea
              id="desc"
              placeholder="What's this project about..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl bg-muted border-0 px-3 py-2.5 text-sm resize-none outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold text-sm">Color Tag</Label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className="w-8 h-8 rounded-full focus:outline-none transition-all"
                  style={{
                    backgroundColor: c.value,
                    outline: color === c.value ? `2px solid ${c.value}` : "none",
                    outlineOffset: "2px",
                  }}
                  title={c.label}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {COLOR_OPTIONS.find((c) => c.value === color)?.label} selected
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-8">
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={submitting}
            className="bg-brand hover:bg-brand-hover text-white rounded-full px-6"
          >
            {submitting ? "Creating..." : "Create"}
          </Button>
        </div>
      </div>
    ) : (
      // join tab
      <div key="join" className="animate-in fade-in duration-200 flex flex-col flex-1">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="font-semibold text-sm">Invite Code</Label>
            <Input
              placeholder="Enter invite code..."
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">Ask the project owner for an invite code</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-8">
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleJoin}
            disabled={joining}
            className="bg-brand hover:bg-brand-hover text-white rounded-full px-6"
          >
            {joining ? "Joining..." : "Join"}
          </Button>
        </div>
      </div>
    )}
  </DialogContent>
  </Dialog>
  )
}