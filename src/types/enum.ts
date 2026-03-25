export enum RESPONSE_STATUS {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

// House identifiers and codes (aligned with Django model semantics)
export const HOUSE = ['dewan-rakyat', 'dewan-negara', 'kamar-khas', 'semua'] as const
export type House = (typeof HOUSE)[number]

export enum HOUSE_CODE {
  DEWAN_RAKYAT = 0,
  DEWAN_NEGARA = 1,
  KAMAR_KHAS = 2,
  SEMUA = 3,
}

export const HOUSE_TO_CODE: Record<House, number> = {
  'dewan-rakyat': HOUSE_CODE.DEWAN_RAKYAT,
  'dewan-negara': HOUSE_CODE.DEWAN_NEGARA,
  'kamar-khas': HOUSE_CODE.KAMAR_KHAS,
  semua: HOUSE_CODE.SEMUA,
}
