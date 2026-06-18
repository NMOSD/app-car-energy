export function calculateKWh(startPercent: number, endPercent: number, capacityKWh: number): number {
  return Math.max(0, ((endPercent - startPercent) / 100) * capacityKWh)
}

export function countMonthsInRange(from: string, to: string): number {
  const fromDate = new Date(from)
  const toDate = new Date(to)
  if (toDate < fromDate) return 0
  return (toDate.getFullYear() - fromDate.getFullYear()) * 12 + toDate.getMonth() - fromDate.getMonth() + 1
}

export function formatCurrency(value: number): string {
  return `${value.toFixed(2)} €`
}

export function formatDateEU(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

export function parseEUDate(euDate: string): string | null {
  const parts = euDate.split('/')
  if (parts.length !== 3) return null
  const [day, month, year] = parts
  const isoDate = `${year}-${month}-${day}`
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null
  return isoDate
}

export function todayDate(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayDateTimeISO(): string {
  return new Date().toISOString()
}
