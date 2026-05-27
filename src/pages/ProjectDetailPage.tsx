import { useParams, useNavigate } from "react-router-dom"
import { useState } from "react"
import { useWorkspace } from "@/hooks/useWorkspace"
import { useSprints } from "@/hooks/useSprints"
import { useTasks } from "@/hooks/useTasks"
import { useAuth } from "@/contexts/AuthContext"
import SprintsTab from "./tabs/SprintsTab"
import BacklogTab from "@/pages/tabs/BacklogTab"
import TeamTab from "@/pages/tabs/TeamTab"
import { MoreHorizontal, Pencil, LogOut, Trash2, Plus, ListChecks, Zap, ArrowUpDown, Check, Copy, RefreshCw } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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

type Tab = "sprints" | "backlog" | "team"
type SortBy = "priority" | "createdAt" | "dueDate" | "storyPoints"

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "priority",    label: "Priority" },
  { value: "createdAt",   label: "Created Time" },
  { value: "dueDate",     label: "Due Date" },
  { value: "storyPoints", label: "Story Points" },
]

const COLOR_OPTIONS = [
  "#F97316", "#3B82F6", "#10B981", "#8B5CF6", "#EF4444", "#F59E0B", "#06B6D4", "#EC4899",
]

export default function ProjectDetailPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { projects, loading, updateProject, deleteProject, removeMember, leaveProject, regenerateInviteCode } = useWorkspace()
  const { sprints } = useSprints(projectId!)
  const { tasks } = useTasks(projectId!)

  const [activeTab, setActiveTab] = useState<Tab>("sprints")
  const [createSprintOpen, setCreateSprintOpen] = useState(false)
  const [backlogCreateOpen, setBacklogCreateOpen] = useState(false)
  const [backlogSort, setBacklogSort] = useState<SortBy>("priority")

  // [...] 選單相關狀態
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)

  // 編輯表單狀態
  const [editName, setEditName] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editColor, setEditColor] = useState("")
  const [saving, setSaving] = useState(false)

  if (loading) return (
    <div className="flex items-center justify-center h-full text-muted-foreground">載入中...</div>
  )

  const project = projects.find((p) => p.id === projectId)
  if (!project) return (
    <div className="flex items-center justify-center h-full text-muted-foreground">找不到此專案</div>
  )

  const isOwner = project.ownerId === user?.uid

  // 計算 Stats（基於 active sprint 的 tasks）
  const activeSprint = sprints.find((s) => s.status === "active")
  const activeSprintTasks = tasks.filter((t) => t.sprintId === activeSprint?.id)
  const doneTasks = activeSprintTasks.filter((t) => t.status === "done")
  const completionRate = activeSprintTasks.length > 0
    ? Math.round((doneTasks.length / activeSprintTasks.length) * 100)
    : 0
  const totalPoints = activeSprintTasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0)

  // Backlog stats
  const backlogTasks = tasks.filter((t) => t.sprintId === null)
  const backlogTotalPoints = backlogTasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0)

  const openEdit = () => {
    setEditName(project.name)
    setEditDesc(project.description)
    setEditColor(project.color)
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editName.trim()) { toast.error("請輸入專案名稱"); return }
    setSaving(true)
    await updateProject(project.id, { name: editName.trim(), description: editDesc.trim(), color: editColor })
    toast.success("專案已更新")
    setEditOpen(false)
    setSaving(false)
  }

  const handleDelete = async () => {
    await deleteProject(project.id)
    toast.success(`已刪除「${project.name}」`)
    navigate("/projects")
  }

  const handleLeave = async () => {
    await leaveProject(project.id)
    toast.success(`已離開「${project.name}」`)
    navigate("/projects")
  }

  const handleRegenerateCode = async () => {
    await regenerateInviteCode(project.id)
    toast.success("邀請碼已重新產生")
  }

  const handleRemoveMember = async (uid: string) => {
    await removeMember(project.id, uid)
    toast.success("已移除成員")
  }

  return (
    <div className="w-full max-w-5xl mx-auto pb-28">

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
                      onClick={() => setBacklogSort(opt.value)}
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
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-white bg-[#F97316] hover:bg-[#ea6c0a] transition-colors"
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
                    navigator.clipboard.writeText(project.inviteCode)
                    toast.success("邀請碼已複製")
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
                    編輯專案
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {!isOwner && (
                    <DropdownMenuItem
                      onClick={() => setLeaveOpen(true)}
                      className="text-destructive focus:text-destructive cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      離開專案
                    </DropdownMenuItem>
                  )}
                  {isOwner && (
                    <DropdownMenuItem
                      onClick={() => setDeleteOpen(true)}
                      className="text-destructive focus:text-destructive cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      刪除專案
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
                    style={{ width: `${completionRate}%`, backgroundColor: "#F97316" }}
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
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-white bg-[#F97316] hover:bg-[#ea6c0a] transition-colors"
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
                ? "bg-[#F97316] text-white shadow-sm"
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
            <DialogTitle className="text-2xl font-bold">編輯專案</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="font-semibold text-sm">專案名稱</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-sm">描述</Label>
              <Input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-sm">顏色</Label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditColor(c)}
                    className="w-8 h-8 rounded-full transition-all"
                    style={{
                      backgroundColor: c,
                      outline: editColor === c ? `2px solid ${c}` : "none",
                      outlineOffset: "2px",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-8">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>取消</Button>
            <Button
              onClick={handleSaveEdit}
              disabled={saving}
              className="bg-[#F97316] hover:bg-[#ea6c0a] text-white rounded-full px-6"
            >
              {saving ? "儲存中..." : "儲存"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 刪除確認 */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除專案？</AlertDialogTitle>
            <AlertDialogDescription>
              即將刪除「{project.name}」，此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 離開確認 */}
      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認離開專案？</AlertDialogTitle>
            <AlertDialogDescription>
              離開後需要重新取得邀請連結才能加入。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              離開
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
