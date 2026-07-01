// sidebar：導航連結 + 專案列表 + 建立/加入專案 Modal
import { useState } from "react"
import { NavLink, useNavigate, useMatch } from "react-router-dom" 
//navlink 的 classname 可以傳一個函式 接收isActive處理高亮問題
//useNavigate 取得跳轉函式
//useMatch：檢查當前網址是否符合某個路徑 符合回傳物件 不符合回傳 null
import {
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Settings,
  Zap,
  Layers,
} from "lucide-react" //引入icon元件
import { cn } from "@/lib/utils"
import { BRAND } from "@/lib/colors"
import { useSidebar } from "@/contexts/SidebarContext"
import { useWorkspace } from "@/hooks/useWorkspace"// 專案資料 + CRUD 的 hook
import { useAllActiveSprints } from "@/hooks/useAllActiveSprints" // 取得所有 active sprint
import type { Sprint } from "@/hooks/useSprints"
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
import { COLOR_OPTIONS } from "@/lib/constants"

type ModalTab = "create" | "join" 

// ProjectNavItem 負責渲染 Sidebar 裡每一個專案的連結
function ProjectNavItem({ project, activeSprint }: { project: Project; activeSprint: Sprint | null }) {
  const { collapsed } = useSidebar() //  從 SidebarContext 取出 collapsed，判斷側邊欄是否收合
  const [open, setOpen] = useState(false) // 控制 Project 的展開箭頭狀態
  const isActive = !!useMatch(`/projects/${project.id}`) //用usematch 檢查專案路徑對不對（高亮判斷） （用!!轉換成布林值） 
  
  if (collapsed) return null   // Sidebar 收合時，Project 列表整個不顯示

  if (!activeSprint) { //處理如果專案裡面沒有active的sprint
    return (
      <NavLink //直接做頁面跳轉 如果當前網址匹配navlink的網址會自動高亮
        to={`/projects/${project.id}`}
        className={({ isActive }) => 
          cn( // shadcn提供的 className 工具
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            isActive
              ? "bg-brand text-white"  // 當前頁面：品牌色背景 + 白字
              : "text-gray-300 hover:bg-white/10 hover:text-white" // 其他：灰字 + hover 效果
          )
        }
      >
        {/* 專案顏色圓點 */}
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
         {/* 專案名稱顯示 */}
        <span className="flex-1 text-left truncate">{project.name}</span>
      </NavLink>
    )
  }
  // ─── 有 active sprint 的情況：顯示專案連結 + 展開箭頭 + sprint 子連結 ───
  return (
    <div>
      {/* 外層 div 同時包著「專案連結」和「展開箭頭按鈕」，共用高亮樣式 */}
      <div className={cn(
        "flex items-center rounded-lg text-sm font-medium transition-colors",
        isActive ? "bg-brand text-white" : "text-gray-300 hover:bg-white/10 hover:text-white"
      )}>
        {/* navitem 左側部分：點了跳到專案詳情頁 */}
        <NavLink
          to={`/projects/${project.id}`}
          className="flex items-center gap-2 px-3 py-2 flex-1 min-w-0"
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
          <span className="flex-1 text-left truncate">{project.name}</span>
        </NavLink>
         
        {/* navitem 右側部分：點了展開/收合 sprint 子連結（不跳轉） */}
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn("pr-3 py-2 shrink-0", isActive ? "text-white/70 hover:text-white" : "text-gray-500 hover:text-white")}
        >
          {open  
            ? <ChevronDown className="w-3.5 h-3.5" /> //切換箭頭狀態
            : <ChevronRight className="w-3.5 h-3.5" /> 
          }
        </button>
      </div>
      
      {/* 如果open 顯示 project item 裡面 active 的 sprint */}
      {open && (
        <div className="ml-5 mt-0.5">
          <NavLink
            to={`/projects/${project.id}/sprints/${activeSprint.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-white/10 hover:text-white transition-colors"
          >
            {/* 閃電 icon 跟 active sprint name */}
            <Zap className="w-3 h-3 shrink-0" style={{ color: BRAND }} /> 
            <span className="font-medium truncate" style={{ color: BRAND }}>{activeSprint.name}</span>
          </NavLink>
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const { collapsed, toggle } = useSidebar() // 控制開合
  const { projects, createProject, joinProject } = useWorkspace()  // 專案資料 + 建立/加入函式
  const { activeSprintMap } = useAllActiveSprints(projects.map(p => p.id)) /// 傳入所有專案的 id 陣列，取回一個 Map（物件）再轉換成一個只有id的陣列
  const navigate = useNavigate()

  // ─── UI 狀態 ───
  const workspaceActive = !!useMatch("/projects") // 如果當前網址是/projects 就判斷 workspace 是 active 狀態 workspaceActive = true
  const [workspaceOpen, setWorkspaceOpen] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalTab, setModalTab] = useState<ModalTab>("create")

  // create project 表單狀態
  const [name, setName] = useState("")
  const [desc, setDesc] = useState("")
  const [color, setColor] = useState(COLOR_OPTIONS[0].value)
  const [submitting, setSubmitting] = useState(false)

  // join project 表單狀態
  const [inviteCode, setInviteCode] = useState("")
  const [joining, setJoining] = useState(false)

  // Modal 開關處理函式（重置表單）
  const handleOpenChange = (open: boolean) => {
    setShowModal(open)
    if (!open) {
      setModalTab("create")
      setName(""); setDesc(""); setColor(COLOR_OPTIONS[0].value)
      setInviteCode("")
    }
  }
  // 處理建立專案函式
  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Please enter a project name"); return }
    setSubmitting(true)
    await createProject(name.trim(), desc.trim(), color)// 呼叫從 useWorkspace 取得的 createProject 函式，把表單資料傳進去
    toast.success("Project created")
    setName(""); setDesc(""); setColor(COLOR_OPTIONS[0].value) //重置表單
    setShowModal(false); setSubmitting(false)
  }
  // 處理加入專案函式
  const handleJoin = async () => {
    if (!inviteCode.trim()) { toast.error("Please enter an invite code"); return }
    setJoining(true)
    const result = await joinProject(inviteCode.trim())// joinProject 回傳三種結果：
    if (result === null) {  //   null  → 找不到這個邀請碼
      toast.error("Invite code not found") 
    } else if (result === "already") { //   "already" → 已經是這個專案的成員了
      toast.error("You're already a member of this project")
    } else { //   projectId（字串）→ 成功加入，回傳專案 id
      toast.success("Joined project!")
      setShowModal(false)
      navigate(`/projects/${result}`) //加入成功後跳轉
    }
    setJoining(false)
  }

  return (
    //React Fragment
    <> 
     {/* ── sidebar 本體 ── */}
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
            onClick={toggle} //sidebarcontext 寫的toggle函式
            className="w-8 h-8 rounded-md hover:bg-white/10 flex items-center justify-center transition-colors shrink-0"
          >
            {collapsed //箭頭切換
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
                collapsed && "justify-center px-0",    // 收合時：icon 置中，移除左右 padding
                isActive
                  ? "bg-brand text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              )
            }
          >
            <LayoutDashboard className="w-5 h-5 shrink-0" /> 
            {!collapsed && <span>Dashboard</span>}
          </NavLink>

          {/* Workspace 按鈕 */}
          <div
            className={cn(
              "flex items-center rounded-lg text-sm font-medium transition-colors",
              workspaceActive ? "bg-brand text-white" : "text-gray-300 hover:bg-white/10 hover:text-white",
              collapsed && "justify-center"
            )}
          >
            <button
              onClick={() => navigate("/projects")} //點擊挑轉到projects
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
                  ? <ChevronDown className="w-3.5 h-3.5" />  //workspace item 箭頭切換
                  : <ChevronRight className="w-3.5 h-3.5" />
                }
              </button>
            )}
          </div>

          {/* Project 列表 */}
          {!collapsed && workspaceOpen && (         //sidebar 跟 workspace 都展開才顯示
            <div className="space-y-0.5 pl-2">
              {projects.map((project) => (
                <ProjectNavItem key={project.id} project={project} activeSprint={activeSprintMap[project.id] ?? null} />
              ))}
              {projects.length === 0 && (
                <p className="px-3 py-2 text-xs text-gray-600">No projects yet</p>
              )}
            </div>
          )}
        </nav>

        {/* 底部操作 new + settings icon */}
        <div className="px-2 py-3 border-t border-white/10 space-y-1 shrink-0">
         
         {/* New Project 按鈕 */}
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

          {/* Settings */}
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
            {(["create", "join"] as ModalTab[]).map((tab) => ( //map 渲染出兩個tab
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

          {/* 根據 modalTab 顯示不同的表單內容 */}
          {modalTab === "create" ? (
            <>
              <div className="space-y-5">

                {/* 專案名稱 */}
                <div className="space-y-2">
                  <Label className="font-semibold text-sm">Project Name</Label>
                  <Input
                    placeholder="e.g. SprintFlow"
                    value={name}
                    onChange={(e) => setName(e.target.value)} //
                    autoFocus
                    className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1"
                  />
                </div>
                 {/* 專案描述 */}
                <div className="space-y-2">
                  <Label className="font-semibold text-sm">Description</Label>
                  <textarea
                    placeholder="What's this project about..."
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl bg-muted border-0 px-3 py-2.5 text-sm resize-none outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                
                {/* 顏色選擇 */}
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
                {/* 如果按取消就調用handleOpenChange 關閉 modal 重置表單  */}
                <Button variant="ghost" onClick={() => handleOpenChange(false)}>Cancel</Button> 
                <Button
                  onClick={handleCreate} //調用建立專案的函式
                  disabled={submitting} //submitting 時禁用
                  className="bg-brand hover:bg-brand-hover text-white rounded-full px-6"
                >
                  {submitting ? "Creating..." : "Create"}
                </Button>
              </div>
            </>
          ) : (
             // ── 加入專案表單 ──
            <>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="font-semibold text-sm">Invite Code</Label>
                  <Input
                    placeholder="Enter invite code..."
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()} //鍵盤事件讓點擊enter也可以觸發加入
                    className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1"
                    autoFocus //點開自動聚焦
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
