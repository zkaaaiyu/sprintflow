//Project 頁面
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useWorkspace } from "@/hooks/useWorkspace"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Trash2, Timer } from "lucide-react"
import { // 刪除警告套件
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { toast } from "sonner"
import type { Project } from "@/hooks/useWorkspace"

const COLOR_OPTIONS = [
  { label: "Orange", value: "#F97316" },
  { label: "Blue", value: "#3B82F6" },
  { label: "Green", value: "#10B981" },
  { label: "Purple", value: "#8B5CF6" },
  { label: "Red", value: "#EF4444" },
  { label: "Amber", value: "#F59E0B" },
  { label: "Cyan", value: "#06B6D4" },
  { label: "Pink", value: "#EC4899" },
]

// 顏色轉淡色背景（加透明度）
function toAlpha(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// 分段進度條
function SegmentedBar({ progress, color }: { progress: number; color: string }) {
  const segments = 30
  const filled = Math.round((progress / 100) * segments)
  return (
    <div className="flex gap-[3px] h-[10px]">
      {Array.from({ length: segments }, (_, i) => (
        <div
          key={i}
          className="flex-1 rounded-[2px]"
          style={{ backgroundColor: i < filled ? color : "#e5e7eb" }}
        />
      ))}
    </div>
  )
}

// Member 頭像（暫以顏色圓圈代替，之後接用戶資料）
const AVATAR_COLORS = ["#F97316", "#3B82F6", "#10B981", "#8B5CF6", "#EF4444"]
function MemberAvatars({ memberIds }: { memberIds: string[] }) {
  const show = memberIds.slice(0, 3)
  return (
    <div className="flex -space-x-2">
      {show.map((uid, i) => (
        <div
          key={uid}
          className="w-7 h-7 rounded-full border-2 border-card flex items-center justify-center text-[10px] text-white font-semibold"
          style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
        >
          {i + 1}
        </div>
      ))}
      {memberIds.length > 3 && (
        <div className="w-7 h-7 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-semibold">
          +{memberIds.length - 3}
        </div>
      )}
    </div>
  )
}

// Project 卡片
function ProjectCard({ project, onDelete, isOwner }: {
  project: Project
  onDelete: (e: React.MouseEvent) => void
  isOwner: boolean
}) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/projects/${project.id}`)}
      className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-all cursor-pointer group"
    >
      {/* 頂部 badge + 刪除 */}
      <div className="flex items-center justify-between mb-3">
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: toAlpha(project.color, 0.12),
            color: project.color,
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          Project
        </div>

        {isOwner && (
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 標題 + 描述 */}
      <h2 className="font-semibold text-base mb-1">{project.name}</h2>
      {project.description ? (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {project.description}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground/50 italic mb-4">無描述</p>
      )}

      {/* 進度條 */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>Progress</span>
          <span style={{ color: project.color }} className="font-medium">0%</span>
        </div>
        <SegmentedBar progress={0} color={project.color} />
      </div>

      {/* 底部：Sprint + 頭像 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Timer className="w-3.5 h-3.5" />
          <span>尚未開始 Sprint</span>
        </div>
        <MemberAvatars memberIds={project.memberIds} />
      </div>
    </div>
  )
}

// 主頁面
export default function ProjectsPage() {
  const { user } = useAuth()
  const { projects, loading, createProject, deleteProject } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState(COLOR_OPTIONS[0].value)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null) 

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("請輸入專案名稱"); return }
    setSubmitting(true)
    await createProject(name.trim(), description.trim(), color)
    toast.success("專案建立成功")
    setName(""); setDescription(""); setColor(COLOR_OPTIONS[0].value)
    setOpen(false); setSubmitting(false)
  }

const handleDelete = (e: React.MouseEvent, projectId: string, projectName: string) => {
  e.stopPropagation()
  setDeleteTarget({ id: projectId, name: projectName })
}

const confirmDelete = async () => {
  if (!deleteTarget) return
  await deleteProject(deleteTarget.id)
  toast.success(`已刪除「${deleteTarget.name}」`)
  setDeleteTarget(null)
}


  if (loading) return (
    <div className="flex items-center justify-center h-full text-muted-foreground">載入中...</div>
  )

  return (

  <Dialog open={open} onOpenChange={setOpen}>
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Workspace</h1>
        <p className="text-sm text-muted-foreground mt-1">管理你的所有專案</p>
      </div>
      {/* 確認刪除模塊 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除專案？</AlertDialogTitle>
            <AlertDialogDescription>
              即將刪除「{deleteTarget?.name}」，此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="border-t-0 bg-transparent pt-2">
            <AlertDialogCancel>cancle</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter >
        </AlertDialogContent>
      </AlertDialog>

      {projects.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <p className="text-lg">還沒有任何專案</p>
          <p className="text-sm mt-1">點擊右上角「新增專案」開始吧</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isOwner={project.ownerId === user?.uid}
              onDelete={(e) => handleDelete(e, project.id, project.name)}
            />
          ))}
        </div>
      )}
    </div>

  <DialogContent className="sm:max-w-md rounded-2xl p-8">
    <DialogHeader className="mb-6">
      <DialogTitle className="text-2xl font-bold">Create Project</DialogTitle>
    </DialogHeader>
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
        <Input
          id="desc"
          placeholder="What's this project about..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1"
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