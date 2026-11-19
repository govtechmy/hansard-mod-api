export enum RESPONSE_STATUS {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

// House identifiers and codes (aligned with Django model semantics)
export const HOUSE = ['dewan-rakyat', 'dewan-negara', 'kamar-khas', 'majlis-mengangkat-sumpah', 'semua'] as const
export type House = (typeof HOUSE)[number]

export enum HOUSE_CODE {
  DEWAN_RAKYAT = 0,
  DEWAN_NEGARA = 1,
  KAMAR_KHAS = 2,
  MAJLIS_MENGANGKAT_SUMPAH = 3,
  SEMUA = 10,
}

export const HOUSE_TO_CODE: Record<House, number> = {
  'dewan-rakyat': HOUSE_CODE.DEWAN_RAKYAT,
  'dewan-negara': HOUSE_CODE.DEWAN_NEGARA,
  'kamar-khas': HOUSE_CODE.KAMAR_KHAS,
  'majlis-mengangkat-sumpah': HOUSE_CODE.MAJLIS_MENGANGKAT_SUMPAH,
  semua: HOUSE_CODE.SEMUA,
}

export const ALL_HOUSE_CODES = [0, 1, 2, 3]
