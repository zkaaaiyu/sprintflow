// AvatarCropModal — 上傳頭貼後，讓使用者在儲存前自行調整裁切範圍、縮放
import { useRef, useState } from "react"
import AvatarEditor, { type AvatarEditorRef } from "react-avatar-editor"  // 裁切畫布元件
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut } from "lucide-react"

export default function AvatarCropModal({
  open,       // 是否顯示這個 Modal
  imageSrc,   // 用戶選的圖片，是一個 base64 字串或 URL
  fileName,   // 原始檔案名稱（存檔時要用）
  onClose,    // 關閉 Modal 的 callback
  onSave,     // 裁切完成後把 File 物件傳回去的 callback
}: {
  open: boolean
  imageSrc: string | null
  fileName: string
  onClose: () => void
  onSave: (file: File) => void
}) {
  const editorRef = useRef<AvatarEditorRef>(null) // 建立一個ref綁定 直接操作 AvatarEditor 
  // 之後可直接呼叫 editorRef.current.getImageScaledToCanvas()取出裁切後的畫布內容
  const [zoom, setZoom] = useState(1)
  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    if (!editorRef.current) return //確認有綁定ref
    setSaving(true) 
    try {
      const canvas = editorRef.current.getImageScaledToCanvas() //用canvas接收裁切好的畫布
      // 呼叫 AvatarEditor 的方法，取出「縮放到正確尺寸後的 Canvas 物件」 就像截圖一樣，把目前畫面的結果輸出成一張 250x250 的圖
      // Canvas 的內建方法，把圖片轉成二進位資料（Blob） toBlob 是非同步的，所以用 callback 接結果
      canvas.toBlob((blob: Blob | null) => {  
        if (!blob) return
        const file = new File([blob], fileName, { type: "image/jpeg" }) //打包成file文件
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
          {/* Cancel 按鈕 */}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {/*  Save 按鈕 */}
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

