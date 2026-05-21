import { useParams } from "react-router-dom"
import { useState } from "react"
import { useWorkspace } from "@/hooks/useWorkspace"
import SprintsTab from "./tabs/SprintsTab"
import BacklogTab from "@/pages/tabs/BacklogTab"

type Tab = "sprints" | "backlog" | "settings"

export default function ProjectDetailPage() {
  const { projectId } = useParams() 
  const { projects, loading } = useWorkspace()
  const [activeTab, setActiveTab] = useState<Tab>("sprints")

  if (loading) return (
    <div className="flex items-center justify-center h-full text-muted-foreground">載入中...</div>
  )

  const project = projects.find((p) => p.id === projectId)  // 用find方法遍歷projects數組找到id跟查詢參數projectid一樣的

  if (!project) return (
    <div className="flex items-center justify-center h-full text-muted-foreground">找不到此專案</div>
  )

  return (
    <div className="max-w-5xl mx-auto">
      {/* 頁面標題 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
          <h1 className="text-2xl font-bold">{project.name}</h1>
        </div>
        {project.description && (
          <p className="text-sm text-muted-foreground">{project.description}</p>
        )}
      </div>

      {/* Tab 切換列 */}
      <div className="flex gap-1 border-b border-border mb-6">
        {(["sprints", "backlog", "settings"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "sprints" ? "Sprints" : tab === "backlog" ? "Backlog" : "Settings"}
          </button>
        ))}
      </div>

      
      {activeTab === "sprints" && (
        <SprintsTab projectId={projectId!} />
      )}
      {activeTab === "backlog" && (
        <BacklogTab projectId={projectId!} memberIds={project.memberIds} />
      )}
      {activeTab === "settings" && (
        <div className="text-muted-foreground">Settings tab — 待實作</div>
      )}
    </div>
  )
}