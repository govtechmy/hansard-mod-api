import type { SqlBindings } from '@/types'

export class WhereBuilder {
  private clauses: string[] = []
  private paramsObj: SqlBindings = {}

  add(clause: string, params?: SqlBindings): this {
    if (clause) this.clauses.push(clause)
    if (params) Object.assign(this.paramsObj, params)
    return this
  }

  toWhereSql(): string {
    if (!this.clauses.length) return ''
    return `WHERE ${this.clauses.join(' AND ')}`
  }

  params(): SqlBindings {
    return { ...this.paramsObj }
  }
}
