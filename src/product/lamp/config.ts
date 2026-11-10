import {
  ARM_LENGTHS,
  BASE_SHAPES,
  FINISHES,
  FINISH_IDS,
  PART_IDS,
  PRODUCT_ID,
  SHADE_SHAPES,
  type ArmLength,
  type BaseShape,
  type ColorId,
  type FinishId,
  type PartId,
  type ShadeShape,
} from './catalog'

export type PartFinish = { finish: FinishId; color: ColorId }

export type LampConfig = {
  product: typeof PRODUCT_ID
  base: BaseShape
  shade: ShadeShape
  arm: ArmLength
  finishes: Record<PartId, PartFinish>
}

export type ConfigResult = { ok: true; config: LampConfig } | { ok: false; error: string }

const fail = (error: string): ConfigResult => ({ ok: false, error })
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const includes = <T extends string>(list: readonly T[], value: unknown): value is T =>
  list.includes(value as T)
const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))

const CONFIG_KEYS = ['product', 'base', 'shade', 'arm', 'finishes']

export const finishHasColor = (finish: FinishId, color: ColorId) => Object.hasOwn(FINISHES[finish].colors, color)

// External input (URL, localStorage) is accepted whole or not at all.
export function validateConfig(input: unknown): ConfigResult {
  if (!isRecord(input) || !hasExactKeys(input, CONFIG_KEYS)) return fail('설정 형식이 올바르지 않습니다')
  if (input.product !== PRODUCT_ID) return fail('지원하지 않는 제품입니다')
  const { base, shade, arm, finishes } = input
  if (!includes(BASE_SHAPES, base) || !includes(SHADE_SHAPES, shade) || !includes(ARM_LENGTHS, arm)) {
    return fail('알 수 없는 형태 옵션입니다')
  }
  if (!isRecord(finishes) || !hasExactKeys(finishes, PART_IDS)) return fail('부품 구성이 올바르지 않습니다')

  const parsed = {} as Record<PartId, PartFinish>
  for (const part of PART_IDS) {
    const value = finishes[part]
    if (!isRecord(value) || !hasExactKeys(value, ['finish', 'color'])) return fail('마감 형식이 올바르지 않습니다')
    const { finish, color } = value
    if (!includes(FINISH_IDS, finish) || typeof color !== 'string' || !finishHasColor(finish, color as ColorId)) {
      return fail('알 수 없는 마감 또는 색입니다')
    }
    parsed[part] = { finish, color: color as ColorId }
  }
  return { ok: true, config: { product: PRODUCT_ID, base, shade, arm, finishes: parsed } }
}

const withPart = (config: LampConfig, part: PartId, value: PartFinish): LampConfig => ({
  ...config,
  finishes: { ...config.finishes, [part]: value },
})

export function setPartFinish(config: LampConfig, part: PartId, finish: FinishId) {
  const current = config.finishes[part].color
  const colorChanged = !finishHasColor(finish, current)
  const color = colorChanged ? FINISHES[finish].defaultColor : current
  return { config: withPart(config, part, { finish, color }), colorChanged }
}

export function setPartColor(config: LampConfig, part: PartId, color: ColorId): LampConfig {
  const { finish } = config.finishes[part]
  return finishHasColor(finish, color) ? withPart(config, part, { finish, color }) : config
}

type GeometryOptions = { base: BaseShape; shade: ShadeShape; arm: ArmLength }

export function setGeometryOption<K extends keyof GeometryOptions>(
  config: LampConfig,
  key: K,
  value: GeometryOptions[K],
): LampConfig {
  return { ...config, [key]: value }
}
