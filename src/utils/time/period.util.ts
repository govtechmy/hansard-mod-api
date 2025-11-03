import { Sequelize } from 'sequelize'

import type { AppModels } from '@/types/fastify-sequelize'

interface TermRow {
  term: number | null
}

interface DateRow {
  start_date: string | null
}

export async function deriveDefaultStartDateDR(models: AppModels): Promise<string> {
  const { ParliamentaryCycle } = models
  const maxTermRow = (await ParliamentaryCycle.findOne({
    attributes: [[Sequelize.fn('max', Sequelize.col('term')), 'term']],
    where: { house: 0 },
    raw: true,
  })) as TermRow | null
  const maxTerm = maxTermRow?.term
  if (maxTerm == null) {
    const minStart = (await ParliamentaryCycle.findOne({
      attributes: [[Sequelize.fn('min', Sequelize.col('start_date')), 'start_date']],
      raw: true,
    })) as DateRow | null
    return minStart?.start_date ?? new Date().toISOString().slice(0, 10)
  }
  const termStart = (await ParliamentaryCycle.findOne({
    attributes: [[Sequelize.fn('min', Sequelize.col('start_date')), 'start_date']],
    where: { house: 0, term: maxTerm },
    raw: true,
  })) as DateRow | null
  return termStart?.start_date ?? new Date().toISOString().slice(0, 10)
}

export function isMonthlyResample(start: string, end: string): boolean {
  const periodDays = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))
  return periodDays >= 1095
}

export function resampleSeries(
  series: Array<{ date: Date | string; count: number }>,
  start: string,
  end: string,
): { date: string[]; freq: number[] } {
  const monthly = isMonthlyResample(start, end)
  const chart_data = { date: [] as string[], freq: [] as number[] }
  if (monthly) {
    const monthMap = new Map<string, number>()
    for (const row of series) {
      const key = new Date(row.date).toISOString().slice(0, 7)
      monthMap.set(key, (monthMap.get(key) ?? 0) + Number(row.count))
    }
    const startD = new Date(new Date(start).getFullYear(), new Date(start).getMonth(), 1)
    const endD = new Date(new Date(end).getFullYear(), new Date(end).getMonth(), 1)
    for (let d = new Date(startD); d <= endD; d.setMonth(d.getMonth() + 1)) {
      const key = new Date(d).toISOString().slice(0, 7)
      chart_data.date.push(key)
      chart_data.freq.push(monthMap.get(key) ?? 0)
    }
  } else {
    const dayMap = new Map<string, number>()
    for (const row of series) {
      const key = new Date(row.date).toISOString().slice(0, 10)
      dayMap.set(key, (dayMap.get(key) ?? 0) + Number(row.count))
    }
    const startD = new Date(start)
    const endD = new Date(end)
    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      const key = new Date(d).toISOString().slice(0, 10)
      chart_data.date.push(key)
      chart_data.freq.push(dayMap.get(key) ?? 0)
    }
  }
  return chart_data
}
