// getCroppedImageFile — 依照使用者選擇的裁切範圍，把圖片畫到 canvas 上，輸出成可上傳的 File
type CropArea = { x: number; y: number; width: number; height: number }

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = url
  })
}

export async function getCroppedImageFile(
  imageSrc: string,
  cropArea: CropArea,
  fileName: string
): Promise<File> {
  const image = await createImage(imageSrc)

  const outputCanvas = document.createElement("canvas")
  outputCanvas.width = cropArea.width
  outputCanvas.height = cropArea.height
  const outputCtx = outputCanvas.getContext("2d")!
  outputCtx.drawImage(
    image,
    cropArea.x, cropArea.y, cropArea.width, cropArea.height,
    0, 0, cropArea.width, cropArea.height
  )

  return new Promise((resolve, reject) => {
    outputCanvas.toBlob((blob) => {
      if (!blob) { reject(new Error("Canvas is empty")); return }
      resolve(new File([blob], fileName, { type: "image/jpeg" }))
    }, "image/jpeg", 0.92)
  })
}
