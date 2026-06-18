// AvatarCropModal — 上傳頭貼後，讓使用者在儲存前自行調整裁切範圍、縮放
import { useState, useCallback } from "react"
import Cropper, { type Area } from "react-easy-crop"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut } from "lucide-react"
import { getCroppedImageFile } from "@/lib/cropImage"

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
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)

  // react-easy-crop 拖曳/縮放結束後會回傳目前裁切框在「原圖像素座標」下的範圍
  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    setSaving(true)
    try {
      const file = await getCroppedImageFile(imageSrc, croppedAreaPixels, fileName)
      onSave(file)
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

        {/* 裁切預覽區，Cropper 會鋪滿這個容器並顯示圓形遮罩 */}
        <div className="relative w-full h-72 bg-muted rounded-xl overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              style={{ cropAreaStyle: { border: "2px dashed white" } }}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
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
            disabled={saving || !croppedAreaPixels}
            className="bg-brand hover:bg-brand-hover text-white rounded-full px-8"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
