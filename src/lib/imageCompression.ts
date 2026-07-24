const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.8
const LOAD_TIMEOUT_MS = 8000

/**
 * Redimensiona (lado maior até 1600px) e reencoda como JPEG no próprio
 * navegador via <canvas>, antes do upload — sem lib nova, sem servidor
 * envolvido. Se qualquer etapa falhar ou demorar demais, resolve com o
 * arquivo original (nunca trava a UI nem impede o upload). Se o resultado
 * comprimido ficar maior que o original (raro, ex.: imagem já pequena),
 * mantém o original.
 */
export async function compressImage(file: File): Promise<File> {
  try {
    const compressed = await Promise.race([
      compress(file),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), LOAD_TIMEOUT_MS)),
    ])
    if (!compressed || compressed.size >= file.size) return file
    return compressed
  } catch {
    return file
  }
}

async function compress(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas 2D indisponível")
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
  )
  if (!blob) throw new Error("Falha ao gerar imagem comprimida")

  const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg"
  return new File([blob], newName, { type: "image/jpeg" })
}
