import { useParams, useNavigate, useLocation } from "react-router-dom"
import { useState } from "react"
import { useWorkspace } from "@/hooks/useWorkspace"
import { BRAND } from "@/lib/colors"
import { useSprints } from "@/hooks/useSprints"
import { useTasks } from "@/hooks/useTasks"
import { useAuth } from "@/contexts/AuthContext"
import SprintsTab from "./tabs/SprintsTab"
import BacklogTab from "@/pages/tabs/BacklogTab"
import TeamTab from "@/pages/tabs/TeamTab"
import { MoreHorizontal, Pencil, LogOut, Trash2, Plus, ListChecks, Zap, ArrowUpDown, Check, Copy, RefreshCw } from "lucide-react"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
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
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { COLOR_OPTIONS } from "@/lib/constants"

type Tab = "sprints" | "backlog" | "team"
type SortBy = "priority" | "createdAt" | "dueDate" | "storyPoints"

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "priority", label: "Priority" },
  { value: "createdAt", label: "Created Time" },
  { value: "dueDate", label: "Due Date" },
  { value: "storyPoints", label: "Story Points" },
]

export default function ProjectDetailPage() {
  const { projectId } = useParams() //用useParams查網址上的查詢參數
  const navigate = useNavigate()
  const { user } = useAuth()
  const { projects, loading, updateProject, deleteProject, removeMember, leaveProject, regenerateInviteCode } = useWorkspace()
  const { sprints } = useSprints(projectId!)
  const { tasks } = useTasks(projectId!)

  const location = useLocation()
  const [activeTab, setActiveTab] = useState<Tab>(
    (location.state as { tab?: Tab } | null)?.tab ?? "sprints"
  )
  const [createSprintOpen, setCreateSprintOpen] = useState(false)
  const [backlogCreateOpen, setBacklogCreateOpen] = useState(false)
  const [backlogSort, setBacklogSort] = useState<SortBy>("priority")

  // [...] 多功能選單相關狀態
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)

  // 編輯表單狀態
  const [editName, setEditName] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editColor, setEditColor] = useState("")
  const [saving, setSaving] = useState(false)

  if (loading) return (
    <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
  )

  const project = projects.find((p) => p.id === projectId)
  if (!project) return (
    <div className="flex items-center justify-center h-full text-muted-foreground">Project not found</div>
  )

  const isOwner = project.ownerId === user?.uid

  // sprint tab 上方模塊status 計算＋抓取
  const activeSprint = sprints.find((s) => s.status === "active") //用find 找出 active 的 sprint  
  const activeSprintTasks = tasks.filter((t) => t.sprintId === activeSprint?.id) //用filter篩出專案裡的任務
  const doneTasks = activeSprintTasks.filter((t) => t.status === "done")//用filter篩出專案裡已完成任務
  const completionRate = activeSprintTasks.length > 0 //計算趴數
    ? Math.round((doneTasks.length / activeSprintTasks.length) * 100)
    : 0
  const totalPoints = activeSprintTasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0) //計算ＳＰ

  // Backlog stats
  const backlogTasks = tasks.filter((t) => t.sprintId === null)
  const backlogTotalPoints = backlogTasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0)

  //編輯專案modal原始數據的回填
  const openEdit = () => {
    setEditName(project.name)
    setEditDesc(project.description)
    setEditColor(project.color)
    setEditOpen(true)
  }

  //處理儲存編輯＋調用updateProject更新資料庫
  const handleSaveEdit = async () => {
    if (!editName.trim()) { toast.error("Project name is required"); return }
    setSaving(true)
    await updateProject(project.id, { name: editName.trim(), description: editDesc.trim(), color: editColor })
    toast.success("Project updated")
    setEditOpen(false)
    setSaving(false)
  }

  //處理刪除project＋調用deleteProject更新資料庫
  const handleDelete = async () => {
    await deleteProject(project.id)
    toast.success(`"${project.name}" deleted`)
    navigate("/projects")
  }

  //處理自己退出 project＋調用leaveProject更新資料庫
  const handleLeave = async () => {
    await leaveProject(project.id)
    toast.success(`Left "${project.name}"`)
    navigate("/projects")
  }
  //調用regenerateInviteCode處理重新生成邀請碼
  const handleRegenerateCode = async () => {
    await regenerateInviteCode(project.id)
    toast.success("Invite code regenerated")
  }
  //調用removeMember處理踢除 member
  const handleRemoveMember = async (uid: string) => {
    await removeMember(project.id, uid)
    toast.success("Member removed")
  }

  return (
    <div className="w-full max-w-[1100px] mx-auto pb-28">

      {/* Info Card — 依 tab 顯示不同上方 bar */}
      {activeTab === "backlog" ? (
        <div className="bg-card border border-border rounded-2xl shadow-sm mb-4 px-5 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                <h1 className="text-lg font-bold">{project.name}</h1>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <ListChecks className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold uppercase tracking-wide">TASKS: {backlogTasks.length}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Zap className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold uppercase tracking-wide">STORY POINTS: {backlogTotalPoints}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-border text-muted-foreground hover:bg-accent transition-colors">
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    Sort
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {SORT_OPTIONS.map((opt) => (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={() => setBacklogSort(opt.value)} //更新BacklogSort的值為opt.value
                      className="cursor-pointer"
                    >
                      <Check className={cn("w-4 h-4 mr-2", backlogSort === opt.value ? "opacity-100" : "opacity-0")} />
                      {opt.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                onClick={() => setBacklogCreateOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-white bg-brand hover:bg-brand-hover transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New Task
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === "team" ? (
        <div className="bg-card border border-border rounded-2xl shadow-sm mb-4 px-5 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
              <h1 className="text-lg font-bold">{project.name}</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Invite Code</span>
                <span className="font-mono font-bold text-sm">{project.inviteCode}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(project.inviteCode) //用writeText把邀請碼複製到用戶的剪貼板navigator.clipboard
                    toast.success("Invite code copied")
                  }}
                  className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="w-px h-5 bg-border" />
              {isOwner ? (
                <button
                  onClick={handleRegenerateCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-border text-muted-foreground hover:bg-accent transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate
                </button>
              ) : (
                <button
                  onClick={() => setLeaveOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-destructive text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Leave Project
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-6 mb-4 shadow-sm">
          {/* Header：專案名稱 + [...] 選單 */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
              <h1 className="text-xl font-bold">{project.name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={openEdit} className="cursor-pointer">
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit Project
                  </DropdownMenuItem>

                  {!isOwner && (
                    <DropdownMenuItem
                      onClick={() => setLeaveOpen(true)}
                      className="text-destructive focus:text-destructive cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Leave Project
                    </DropdownMenuItem>
                  )}
                  {isOwner && (
                    <DropdownMenuItem
                      onClick={() => setDeleteOpen(true)} 
                      className="text-destructive focus:text-destructive cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Project
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-5">Project overview and active sprints</p>

          {/* Stats 三欄 + 按鈕，四等分橫向空間 */}
          <div className="grid grid-cols-4 gap-4 items-end">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Total Sprints</p>
              <p className="text-xl font-bold">{sprints.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                {activeSprint ? `${activeSprint.name} · Completion` : "Completion Rate"}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold">{completionRate}%</p>
                <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${completionRate}%`, backgroundColor: BRAND }}
                  />
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Total Points</p>
              <p className="text-xl font-bold">{totalPoints}</p>
            </div>
            <div className="flex justify-end">
              {activeTab === "sprints" && (
                <button
                  onClick={() => setCreateSprintOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-white bg-brand hover:bg-brand-hover transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Sprint
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 內容區 */}
      {activeTab === "sprints" && (
        <SprintsTab
          projectId={projectId!}
          createOpen={createSprintOpen}
          onCreateOpenChange={setCreateSprintOpen}
        />
      )}
      {activeTab === "backlog" && <BacklogTab projectId={projectId!} memberIds={project.memberIds} createOpen={backlogCreateOpen} onCreateOpenChange={setBacklogCreateOpen} sortBy={backlogSort} />}
      {activeTab === "team" && <TeamTab project={project} onRemoveMember={handleRemoveMember} />}

      {/* 懸浮底部 Tab 列 */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-card/90 backdrop-blur-sm border border-border rounded-full px-2 py-1.5 shadow-lg">
        {(["sprints", "backlog", "team"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-5 py-2 rounded-full text-sm font-medium transition-all",
              activeTab === tab
                ? "bg-brand text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === "sprints" ? "Sprints" : tab === "backlog" ? "Backlog" : "Team"}
          </button>
        ))}
      </div>

      {/* 編輯專案 Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold">Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="font-semibold text-sm">Project Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-sm">Description</Label>
              <Input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-sm">Color</Label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setEditColor(c.value)}
                    className="w-8 h-8 rounded-full transition-all"
                    style={{
                      backgroundColor: c.value,
                      outline: editColor === c.value ? `2px solid ${c.value}` : "none",
                      outlineOffset: "2px",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-8">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSaveEdit}
              disabled={saving}
              className="bg-brand hover:bg-brand-hover text-white rounded-full px-6"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 刪除專案確認 */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Project"
        description={`"${project.name}" and all its data will be permanently deleted.`}
        onConfirm={handleDelete}
      />

      {/* 離開專案確認 */}
      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title="Leave Project"
        description="You will need a new invite link to rejoin this project."
        confirmLabel="Leave"
        onConfirm={handleLeave}
      />
    </div>
  )
}
