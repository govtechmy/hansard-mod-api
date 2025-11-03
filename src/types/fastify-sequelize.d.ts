import 'fastify'

import type { Sequelize } from 'sequelize'

import type { initAreaModel } from '@/models/area.model'
import type { initAttendanceModel } from '@/models/attendance.model'
import type { initAuthorModel } from '@/models/author.model'
import type { initAuthorHistoryModel } from '@/models/author-history.model'
import type { initParliamentaryCycleModel } from '@/models/parliamentary-cycle.model'
import type { initSittingModel } from '@/models/sitting.model'
import type { initSpeechModel } from '@/models/speech.model'

type AreaModel = ReturnType<typeof initAreaModel>
type AttendanceModel = ReturnType<typeof initAttendanceModel>
type AuthorModel = ReturnType<typeof initAuthorModel>
type AuthorHistoryModel = ReturnType<typeof initAuthorHistoryModel>
type ParliamentaryCycleModel = ReturnType<typeof initParliamentaryCycleModel>
type SittingModel = ReturnType<typeof initSittingModel>
type SpeechModel = ReturnType<typeof initSpeechModel>

export interface AppModels {
  Area: AreaModel
  Attendance: AttendanceModel
  Author: AuthorModel
  AuthorHistory: AuthorHistoryModel
  ParliamentaryCycle: ParliamentaryCycleModel
  Sitting: SittingModel
  Speech: SpeechModel
}

declare module 'fastify' {
  interface FastifyInstance {
    sequelize: Sequelize
    models: AppModels
  }
}
