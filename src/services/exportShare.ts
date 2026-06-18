export async function shareReport(blob: Blob, filename: string, title: string): Promise<boolean> {
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: blob.type })
    const shareData = { title, files: [file] }
    if (navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData)
        return true
      } catch {
        return false
      }
    }
  }

  const subject = encodeURIComponent(title)
  const body = encodeURIComponent('Adjunto el reporte de carga generado por App Car Energy.')
  window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
  return true
}

export async function saveWithPicker(blob: Blob, suggestedName: string): Promise<boolean> {
  if ('showSaveFilePicker' in window) {
    try {
      const ext = suggestedName.split('.').pop() || 'txt'
      const types: Record<string, any> = {
        pdf: { description: 'PDF', accept: { 'application/pdf': ['.pdf'] } },
        docx: { description: 'Word', accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] } },
        json: { description: 'JSON', accept: { 'application/json': ['.json'] } },
        txt: { description: 'Texto', accept: { 'text/plain': ['.txt'] } },
      }
      const handle = await (window as any).showSaveFilePicker({
        suggestedName,
        types: [types[ext] || types.txt]
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return true
    } catch {
      return false
    }
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = suggestedName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return true
}
