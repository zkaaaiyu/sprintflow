import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useSprints, type SprintStatus } from "@/hooks/useSprints"
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
import { Plus, Calendar, ChevronRight } from "lucide-react"
import { toast } from "sonner"

// 定義 狀態配置 的型別
const STATUS_CONFIG: Record<SprintStatus, { label: string; color: string; bg: string }> = {
  planning:  { label: "Planning",  color: "#6B7280", bg: "#F3F4F6" },
  active:    { label: "Active",    color: "#F97316", bg: "#FFF7ED" },
  completed: { label: "Completed", color: "#10B981", bg: "#ECFDF5" },
}
//時間格式化函數
function formatDate(date: Date | null) {
  if (!date) return "—"
  return date.toLocaleDateString("zh-TW", { month: "short", day: "numeric", year: "numeric" })
}


//SprintTab 組件
export default function SprintsTab({ projectId }: { projectId: string }) {
  const navigate = useNavigate() 
  const { sprints, loading, createSprint } = useSprints(projectId) // 傳入id解構出 sprints, loading, createSprint
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [goal, setGoal] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("請輸入 Sprint 名稱"); return }
    if (!startDate || !endDate) { toast.error("請選擇日期範圍"); return }
    setSubmitting(true) //解鎖
    await createSprint(name.trim(), goal.trim(), new Date(startDate), new Date(endDate))
    toast.success("Sprint 建立成功")
    setName(""); setGoal(""); setStartDate(""); setEndDate("") //清空表單
    setOpen(false) //關閉表單
    setSubmitting(false) //上鎖
  }

  if (loading) return <div className="text-muted-foreground text-sm">載入中...</div>

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div>
        {/* 空狀態 */}
        {sprints.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p>No sprints yet</p>
            <p className="text-sm mt-1">Click the + button to create your first sprint</p>
          </div>
        )}

        {/* Timeline 清單 */}
        <div>
          {sprints.map((sprint, index) => {
            const cfg = STATUS_CONFIG[sprint.status]
            const isActive = sprint.status === "active"
            return (
              <div key={sprint.id} className="flex gap-4">
                {/* 左側時間軸 */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-3 h-3 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: isActive ? "#F97316" : "#D1D5DB" }}
                  />
                  {index < sprints.length - 1 && (
                    <div className="w-px flex-1 mt-1 bg-border min-h-[40px]" />
                  )}
                </div>

                {/* Sprint 卡片 */}
                <div
                  onClick={() => navigate(`/projects/${projectId}/sprints/${sprint.id}`)}
                  className={`flex-1 mb-4 p-4 rounded-xl border cursor-pointer hover:shadow-sm transition-all ${
                    isActive ? "border-orange-200 bg-orange-50/50" : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{sprint.name}</span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ color: cfg.color, backgroundColor: cfg.bg }}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      {sprint.goal && (
                        <p className="text-xs text-muted-foreground mb-2">{sprint.goal}</p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(sprint.startDate)} — {formatDate(sprint.endDate)}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Dialog 內容 */}
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

      {/* FAB */}
      <DialogTrigger asChild>
        <button className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-[#F97316] hover:bg-[#ea6c0a] text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-40">
          <Plus className="w-6 h-6" />
        </button>
      </DialogTrigger>
    </Dialog>
  )
}