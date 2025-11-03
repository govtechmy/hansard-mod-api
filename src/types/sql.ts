export type SqlPrimitive = string | number | boolean | null | Date
export type SqlValue = SqlPrimitive | readonly SqlPrimitive[]

export type SqlBindings = Record<string, SqlValue>
