export class WhereBuilder {
  private clauses: string[] = []
  private paramsObj: Record<string, any> = {}

  add(clause: string, params?: Record<string, any>): this {
    if (clause) this.clauses.push(clause)
    if (params) Object.assign(this.paramsObj, params)
    return this
  }

  toWhereSql(): string {
    if (!this.clauses.length) return ''
    return `WHERE ${this.clauses.join(' AND ')}`
  }

  params(): Record<string, any> {
    return { ...this.paramsObj }
  }
}
