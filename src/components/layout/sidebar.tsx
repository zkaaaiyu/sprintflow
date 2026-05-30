import { useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Settings,
  Zap,
  Layers,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { BRAND } from "@/lib/colors"
import { useSidebar } from "@/contexts/SidebarContext"
import { useWorkspace } from "@/hooks/useWorkspace"
import { useSprints } from "@/hooks/useSprints"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Project } from "@/hooks/useWorkspace"

const PROJECT_COLORS = ["#F97316", "#3B82F6", "#10B981", "#8B5CF6", "#F43F5E", "#06B6D4"]

// 單一 Project 列：有 active sprint 才可展開，沒有就直接點擊進入專案頁
function ProjectNavItem({ project }: { project: Project }) {
  const { collapsed } = useSidebar()
  const [open, setOpen] = useState(false)
  // 永遠訂閱，才能在展開前就知道有沒有 active sprint
  const { sprints } = useSprints(project.id)
  const activeSprint = sprints.find((s) => s.status === "active")

  // 收縮模式：不顯示 project 列表，只保留 Workspace icon
  if (collapsed) return null

  // 無 active sprint：直接點擊進入專案頁，不顯示展開箭頭
  if (!activeSprint) {
    return (
      <NavLink
        to={`/projects/${project.id}`}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            isActive
              ? "bg-orange-100 dark:bg-brand/15 text-brand"
              : "text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-brand/10 hover:text-brand"
          )
        }
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
        <span className="flex-1 text-left truncate">{project.name}</span>
      </NavLink>
    )
  }

  // 有 active sprint：可展開，只顯示 sprint 連結（不顯示「概覽」）
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-brand/10 hover:text-brand transition-colors"
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
        <span className="flex-1 text-left truncate">{project.name}</span>
        {open
          ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
          : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        }
      </button>

      {open && (
        <div className="ml-5 mt-0.5">
          <NavLink
            to={`/projects/${project.id}/sprints/${activeSprint.id}`}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors",
                isActive ? "bg-orange-50 dark:bg-brand/10 text-brand" : "text-gray-500 dark:text-gray-400 hover:bg-orange-50 dark:hover:bg-brand/10 hover:text-brand"
              )
            }
          >
            <Zap className="w-3 h-3 text-brand shrink-0" />
            <span className="text-brand font-medium truncate">{activeSprint.name}</span>
          </NavLink>
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const { collapsed, toggle } = useSidebar()
  const { projects, createProject } = useWorkspace()
  const navigate = useNavigate()

  // 預設展開，點 chevron 可收合 project 列表
  const [workspaceOpen, setWorkspaceOpen] = useState(true)

  const [showNewProject, setShowNewProject] = useState(false)
  const [newName, setNewName]   = useState("")
  const [newDesc, setNewDesc]   = useState("")
  const [newColor, setNewColor] = useState(PROJECT_COLORS[0])
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    await createProject(newName.trim(), newDesc.trim(), newColor)
    setNewName(""); setNewDesc(""); setNewColor(PROJECT_COLORS[0])
    setShowNewProject(false)
    setCreating(false)
  }

  return (
    <>
      <aside
        className={cn(
          "h-screen bg-[#F5F3EF] dark:bg-[#1e1e1e] border-r border-border flex flex-col shrink-0 overflow-hidden transition-all duration-200",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo + 收縮按鈕 */}
        <div className="h-16 flex items-center px-3 border-b border-border shrink-0">
          {!collapsed && (
            <span className="text-lg font-bold text-brand flex-1 truncate">SprintFlow</span>
          )}
          <button
            onClick={toggle}
            className="w-8 h-8 rounded-md hover:bg-orange-100 dark:hover:bg-brand/15 flex items-center justify-center transition-colors shrink-0"
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              : <ChevronLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            }
          </button>
        </div>

        {/* 主導覽 */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto overflow-x-hidden space-y-1">

          {/* Dashboard */}
          <NavLink
            to="/dashboard"
            title={collapsed ? "Dashboard" : undefined}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                isActive
                  ? "bg-orange-100 dark:bg-brand/15 text-brand"
                  : "text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-brand/10 hover:text-brand"
              )
            }
          >
            <LayoutDashboard className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Dashboard</span>}
          </NavLink>

          {/* Workspace：左側點擊導航到 /projects，右側 chevron 收合 project 列表 */}
          <div
            className={cn(
              "flex items-center rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-brand/10 hover:text-brand transition-colors",
              collapsed && "justify-center"
            )}
          >
            <button
              onClick={() => navigate("/projects")}
              title={collapsed ? "Workspace" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2 flex-1",
                collapsed && "justify-center px-0"
              )}
            >
              <Layers className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="font-semibold">Workspace</span>}
            </button>

            {/* chevron：只在展開模式下顯示，控制 project 列表收合 */}
            {!collapsed && (
              <button
                onClick={() => setWorkspaceOpen((o) => !o)}
                className="pr-3 py-2 text-muted-foreground hover:text-brand"
              >
                {workspaceOpen
                  ? <ChevronDown className="w-3.5 h-3.5" />
                  : <ChevronRight className="w-3.5 h-3.5" />
                }
              </button>
            )}
          </div>

          {/* Project 列表（sidebar 收縮時不顯示；workspaceOpen 收合時也不顯示） */}
          {!collapsed && workspaceOpen && (
            <div className="space-y-0.5 pl-2">
              {projects.map((project) => (
                <ProjectNavItem key={project.id} project={project} />
              ))}
              {projects.length === 0 && (
                <p className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">尚無專案</p>
              )}
            </div>
          )}
        </nav>

        {/* 底部操作 */}
        <div className="px-2 py-3 border-t border-border space-y-1 shrink-0">
          <button
            onClick={() => setShowNewProject(true)}
            title={collapsed ? "新增專案" : undefined}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-brand/10 hover:text-brand transition-colors",
              collapsed && "justify-center px-0"
            )}
          >
            <Plus className="w-5 h-5 shrink-0" />
            {!collapsed && <span>新增專案</span>}
          </button>

          <button
            title={collapsed ? "設定" : undefined}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-brand/10 hover:text-brand transition-colors",
              collapsed && "justify-center px-0"
            )}
          >
            <Settings className="w-5 h-5 shrink-0" />
            {!collapsed && <span>設定</span>}
          </button>
        </div>
      </aside>

      {/* 新增專案 Dialog */}
      <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
        <DialogContent className="sm:max-w-md rounded-2xl p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold">新增專案</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="font-semibold text-sm">專案名稱</Label>
              <Input
                placeholder="e.g. SprintFlow"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-sm">描述（選填）</Label>
              <Input
                placeholder="這個專案的目標是..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-sm">顏色</Label>
              <div className="flex gap-2">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      newColor === c && "ring-2 ring-offset-2 ring-gray-400"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-8">
            <Button variant="ghost" onClick={() => setShowNewProject(false)}>取消</Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="bg-brand hover:bg-brand-hover text-white rounded-full px-6"
            >
              {creating ? "建立中..." : "建立"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
