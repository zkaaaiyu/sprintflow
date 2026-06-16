import { useState } from "react"
import { NavLink, useNavigate, useMatch } from "react-router-dom"
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
import { toast } from "sonner"
import type { Project } from "@/hooks/useWorkspace"

const PROJECT_COLORS = ["#d16e56", "#4A5270", "#8B3A42", "#9B7EC8", "#C96B8E", "#73a38c", "#B8893A", "#5a6438"]

const COLOR_OPTIONS = [
  { label: "Clay",     value: "#d16e56" },
  { label: "Slate",    value: "#4A5270" },
  { label: "Wine",     value: "#8B3A42" },
  { label: "Lavender", value: "#9B7EC8" },
  { label: "Blush",    value: "#C96B8E" },
  { label: "Sage",     value: "#73a38c" },
  { label: "Amber",    value: "#B8893A" },
  { label: "Olive",    value: "#5a6438" },
]

type ModalTab = "create" | "join"

function ProjectNavItem({ project }: { project: Project }) {
  const { collapsed } = useSidebar()
  const [open, setOpen] = useState(false)
  const { sprints } = useSprints(project.id)
  const isActive = !!useMatch(`/projects/${project.id}`)
  const activeSprint = sprints.find((s) => s.status === "active")

  if (collapsed) return null

  if (!activeSprint) {
    return (
      <NavLink
        to={`/projects/${project.id}`}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            isActive
              ? "bg-brand text-white"
              : "text-gray-300 hover:bg-white/10 hover:text-white"
          )
        }
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
        <span className="flex-1 text-left truncate">{project.name}</span>
      </NavLink>
    )
  }

  return (
    <div>
      <div className={cn(
        "flex items-center rounded-lg text-sm font-medium transition-colors",
        isActive ? "bg-brand text-white" : "text-gray-300 hover:bg-white/10 hover:text-white"
      )}>
        <NavLink
          to={`/projects/${project.id}`}
          className="flex items-center gap-2 px-3 py-2 flex-1 min-w-0"
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
          <span className="flex-1 text-left truncate">{project.name}</span>
        </NavLink>
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn("pr-3 py-2 shrink-0", isActive ? "text-white/70 hover:text-white" : "text-gray-500 hover:text-white")}
        >
          {open
            ? <ChevronDown className="w-3.5 h-3.5" />
            : <ChevronRight className="w-3.5 h-3.5" />
          }
        </button>
      </div>

      {open && (
        <div className="ml-5 mt-0.5">
          <NavLink
            to={`/projects/${project.id}/sprints/${activeSprint.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Zap className="w-3 h-3 shrink-0" style={{ color: BRAND }} />
            <span className="font-medium truncate" style={{ color: BRAND }}>{activeSprint.name}</span>
          </NavLink>
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const { collapsed, toggle } = useSidebar()
  const { projects, createProject, joinProject } = useWorkspace()
  const navigate = useNavigate()

  const workspaceActive = !!useMatch("/projects")
  const [workspaceOpen, setWorkspaceOpen] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalTab, setModalTab] = useState<ModalTab>("create")

  // create 狀態
  const [name, setName] = useState("")
  const [desc, setDesc] = useState("")
  const [color, setColor] = useState(COLOR_OPTIONS[0].value)
  const [submitting, setSubmitting] = useState(false)

  // join 狀態
  const [inviteCode, setInviteCode] = useState("")
  const [joining, setJoining] = useState(false)

  const handleOpenChange = (open: boolean) => {
    setShowModal(open)
    if (!open) {
      setModalTab("create")
      setName(""); setDesc(""); setColor(COLOR_OPTIONS[0].value)
      setInviteCode("")
    }
  }

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Please enter a project name"); return }
    setSubmitting(true)
    await createProject(name.trim(), desc.trim(), color)
    toast.success("Project created")
    setName(""); setDesc(""); setColor(COLOR_OPTIONS[0].value)
    setShowModal(false); setSubmitting(false)
  }

  const handleJoin = async () => {
    if (!inviteCode.trim()) { toast.error("Please enter an invite code"); return }
    setJoining(true)
    const result = await joinProject(inviteCode.trim())
    if (result === null) {
      toast.error("Invite code not found")
    } else if (result === "already") {
      toast.error("You're already a member of this project")
    } else {
      toast.success("Joined project!")
      setShowModal(false)
      navigate(`/projects/${result}`)
    }
    setJoining(false)
  }

  return (
    <>
      <aside
        className={cn(
          "relative z-10 h-screen bg-[#2B2B2B] border-r border-white/10 flex flex-col shrink-0 overflow-hidden transition-all duration-200",
          collapsed ? "w-16" : "w-60 shadow-[4px_0_16px_rgba(0,0,0,0.35)]"
        )}
      >
        {/* Logo + 收縮按鈕 */}
        <div className="h-16 flex items-center px-3 border-b border-white/10 shrink-0">
          {!collapsed && (
            <span className="text-2xl font-bold text-brand flex-1 truncate">SprintFlow</span>
          )}
          <button
            onClick={toggle}
            className="w-8 h-8 rounded-md hover:bg-white/10 flex items-center justify-center transition-colors shrink-0"
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4 text-gray-300" />
              : <ChevronLeft className="w-4 h-4 text-gray-300" />
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
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                isActive
                  ? "bg-brand text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              )
            }
          >
            <LayoutDashboard className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Dashboard</span>}
          </NavLink>

          {/* Workspace */}
          <div
            className={cn(
              "flex items-center rounded-lg text-sm font-medium transition-colors",
              workspaceActive ? "bg-brand text-white" : "text-gray-300 hover:bg-white/10 hover:text-white",
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

            {!collapsed && (
              <button
                onClick={() => setWorkspaceOpen((o) => !o)}
                className="pr-3 py-2 text-gray-500 hover:text-white"
              >
                {workspaceOpen
                  ? <ChevronDown className="w-3.5 h-3.5" />
                  : <ChevronRight className="w-3.5 h-3.5" />
                }
              </button>
            )}
          </div>

          {/* Project 列表 */}
          {!collapsed && workspaceOpen && (
            <div className="space-y-0.5 pl-2">
              {projects.map((project) => (
                <ProjectNavItem key={project.id} project={project} />
              ))}
              {projects.length === 0 && (
                <p className="px-3 py-2 text-xs text-gray-600">No projects yet</p>
              )}
            </div>
          )}
        </nav>

        {/* 底部操作 */}
        <div className="px-2 py-3 border-t border-white/10 space-y-1 shrink-0">
          <button
            onClick={() => setShowModal(true)}
            title={collapsed ? "New Project" : undefined}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors",
              collapsed && "justify-center px-0"
            )}
          >
            <Plus className="w-5 h-5 shrink-0" />
            {!collapsed && <span>New Project</span>}
          </button>

          <NavLink
            to="/settings"
            title={collapsed ? "Settings" : undefined}
            className={({ isActive }) => cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive ? "bg-brand text-white" : "text-gray-300 hover:bg-white/10 hover:text-white",
              collapsed && "justify-center px-0"
            )}
          >
            <Settings className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Settings</span>}
          </NavLink>
        </div>
      </aside>

      {/* New Project / Join Project Modal */}
      <Dialog open={showModal} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md rounded-2xl p-8">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-bold">
              {modalTab === "create" ? "Create Project" : "Join Project"}
            </DialogTitle>
          </DialogHeader>

          {/* Tab 切換 */}
          <div className="flex gap-1 bg-muted p-1 rounded-xl mb-6">
            {(["create", "join"] as ModalTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setModalTab(tab)}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-sm font-medium transition-all",
                  modalTab === tab ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab === "create" ? "Create Project" : "Join Project"}
              </button>
            ))}
          </div>

          {modalTab === "create" ? (
            <>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="font-semibold text-sm">Project Name</Label>
                  <Input
                    placeholder="e.g. SprintFlow"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-sm">Description</Label>
                  <Input
                    placeholder="What's this project about..."
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
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
                <Button variant="ghost" onClick={() => handleOpenChange(false)}>Cancel</Button>
                <Button
                  onClick={handleCreate}
                  disabled={submitting}
                  className="bg-brand hover:bg-brand-hover text-white rounded-full px-6"
                >
                  {submitting ? "Creating..." : "Create"}
                </Button>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
