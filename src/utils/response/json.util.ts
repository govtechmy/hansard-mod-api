type JsonLike<T> = T & { toJSON?: () => T }

export function toPlainRows<T>(rows: ReadonlyArray<JsonLike<T>>): T[] {
  return rows.map(row => (typeof row.toJSON === 'function' ? row.toJSON() : (row as T)))
}
