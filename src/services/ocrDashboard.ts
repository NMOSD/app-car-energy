export interface OcrResult {
  batteryPercent: number | null
  mileageKm: number | null
  rawText: string
}

export async function extractDashboardData(imageFile: File): Promise<OcrResult> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng')
  try {
    const { data } = await worker.recognize(imageFile)
    const text = data.text

    const percentMatch = text.match(/(\d{1,3})\s*%/)
    const batteryPercent = percentMatch ? Math.min(100, parseInt(percentMatch[1], 10)) : null

    const kmMatch = text.match(/(\d{3,6})\s*km/i)
    const mileageKm = kmMatch ? parseInt(kmMatch[1], 10) : null

    return { batteryPercent, mileageKm, rawText: text }
  } finally {
    await worker.terminate()
  }
}
