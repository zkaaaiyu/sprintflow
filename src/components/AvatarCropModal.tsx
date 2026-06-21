// AvatarCropModal — 上傳頭貼後，讓使用者在儲存前自行調整裁切範圍、縮放
import { useRef, useState } from "react"
import AvatarEditor, { type AvatarEditorRef } from "react-avatar-editor"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut } from "lucide-react"

export default function AvatarCropModal({
  open,
  imageSrc,
  fileName,
  onClose,
  onSave,
}: {
  open: boolean
  imageSrc: string | null
  fileName: string
  onClose: () => void
  onSave: (file: File) => void
}) {
  const editorRef = useRef<AvatarEditorRef>(null)
  const [zoom, setZoom] = useState(1)
  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    if (!editorRef.current) return
    setSaving(true)
    try {
      const canvas = editorRef.current.getImageScaledToCanvas()
      canvas.toBlob((blob: Blob | null) => {
        if (!blob) return
        const file = new File([blob], fileName, { type: "image/jpeg" })
        onSave(file)
      }, "image/jpeg", 0.92)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl p-8">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold">Crop Profile Picture</DialogTitle>
        </DialogHeader>

        {/* 裁切預覽區 */}
        <div className="flex justify-center">
          {imageSrc && (
            <AvatarEditor
              ref={editorRef}
              image={imageSrc}
              width={250}
              height={250}
              border={24}
              borderRadius={125}
              scale={zoom}
              color={[0, 0, 0, 0.5]}
            />
          )}
        </div>

        {/* 縮放滑桿 */}
        <div className="flex items-center gap-3 mt-5">
          <ZoomOut className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-brand"
          />
          <ZoomIn className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !imageSrc}
            className="bg-brand hover:bg-brand-hover text-white rounded-full px-8"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

