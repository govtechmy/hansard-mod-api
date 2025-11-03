export function toPlainRows(rows: any[]): any[] {
  return rows.map(r => (r?.toJSON?.() ? r.toJSON() : r))
}
