import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useSprints, type SprintStatus } from "@/hooks/useSprints"
import { SPRINT_STATUS_CONFIG } from "@/lib/sprintStatus"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Calendar, ChevronRight } from "lucide-react"
import { toast } from "sonner"

//日期格式化
function formatDate(date: Date | null) {
  if (!date) return "—"
  return date.toLocaleDateString("zh-TW", { month: "short", day: "numeric", year: "numeric" })
}

export default function SprintsTab({
  projectId,
  createOpen,
  onCreateOpenChange,
}: {
  projectId: string
  createOpen: boolean
  onCreateOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const { sprints, loading, createSprint } = useSprints(projectId)
  //定義新建sprint相關state
  const [name, setName] = useState("")
  const [goal, setGoal] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("請輸入 Sprint 名稱"); return }
    if (!startDate || !endDate) { toast.error("請選擇日期範圍"); return }
    setSubmitting(true)
    await createSprint(name.trim(), goal.trim(), new Date(startDate), new Date(endDate))
    toast.success("Sprint 建立成功")
    setName(""); setGoal(""); setStartDate(""); setEndDate("")
    onCreateOpenChange(false)
    setSubmitting(false)
  }

  if (loading) return <div className="text-muted-foreground text-sm py-8 text-center">載入中...</div>

  return (
    <>
      {/* 下方 Sprint 列表卡片 */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden min-h-[calc(100vh-180px)]">
        {sprints.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>No sprints yet</p>
            <p className="text-sm mt-1">Click "+ Create Sprint" to get started</p>
          </div>
        ) : (
          <div className="p-5">
            <div className="relative">
              {/* 垂直 Timeline 線 */}
              <div className="absolute left-[5px] top-6 bottom-6 w-0.5 bg-border" />

              <div className="space-y-4">
                {sprints.map((sprint) => {
                  const cfg = SPRINT_STATUS_CONFIG[sprint.status]
                  const isActive = sprint.status === "active"
                  return (
                    <div key={sprint.id} className="flex items-center gap-4">
                      {/* Timeline 圓點 */}
                      <div
                        className="relative z-10 w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: isActive ? "var(--brand)" : "var(--border)" }}
                      />

                      {/* Sprint 卡片 */}
                      <div
                        onClick={() => navigate(`/projects/${projectId}/sprints/${sprint.id}`)}
                        className="flex-1 flex items-center gap-4 p-4 rounded-xl border cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all"
                        style={
                          isActive
                            ? { borderColor: "var(--brand-subtle-border)" }
                            : sprint.status === "completed"
                            ? { borderColor: `${cfg.bg}CC` }
                            : {}
                        }
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-semibold text-sm">{sprint.name}</span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                              style={{ color: cfg.color, backgroundColor: cfg.bg }}
                            >
                              {cfg.label}
                            </span>
                          </div>
                          {sprint.goal && (
                            <p className="text-xs text-muted-foreground truncate mb-0.5">{sprint.goal}</p>
                          )}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span>{formatDate(sprint.startDate)} — {formatDate(sprint.endDate)}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Sprint Dialog — 由父層 ProjectDetailPage 控制開關 */}
      <Dialog open={createOpen} onOpenChange={onCreateOpenChange}>
        <DialogContent className="sm:max-w-md rounded-2xl p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold">Create Sprint</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="font-semibold text-sm">Sprint Name</Label>
              <Input
                placeholder="e.g. Sprint 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-sm">Goal (optional)</Label>
              <Input
                placeholder="What does this sprint aim to achieve..."
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-semibold text-sm">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-sm">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-xl bg-muted border-0 h-11 focus-visible:ring-1"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-8">
            <Button variant="ghost" onClick={() => onCreateOpenChange(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={submitting}
              className="bg-brand hover:bg-brand-hover text-white rounded-full px-6"
            >
              {submitting ? "Creating..." : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
