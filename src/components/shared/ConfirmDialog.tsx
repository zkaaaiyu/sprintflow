import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function ConfirmDialog({
  open,                       // 控制彈窗是否顯示
  onOpenChange,               // 彈窗狀態改變時的callback 
  title,                      
  description,
  confirmLabel = "Delete",
  onConfirm,
  loading = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
  loading?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm rounded-3xl p-8">
        <DialogHeader className="mb-4">
          <AlertCircle className="w-7 h-7 text-destructive mb-3" />
          <DialogTitle className="text-xl font-bold text-destructive">{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <blockquote className="border-l-2 border-destructive pl-3 mb-6">
          <p className="text-sm font-semibold">This action cannot be undone.</p>
        </blockquote>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1 rounded-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="flex-1 rounded-full bg-destructive hover:opacity-90 text-white"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Deleting..." : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
