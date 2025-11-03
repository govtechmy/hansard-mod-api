export function validateDateIso(dateStr: string): boolean {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return false
  // Basic YYYY-MM-DD length check
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}
