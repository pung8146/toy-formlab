import { OPTIONS, PART_IDS, PRODUCT_ID, type OptionId, type PartId } from './catalog'

export type ChairConfig = {
  product: typeof PRODUCT_ID
  fabric: OptionId<'fabric'>
  frame: OptionId<'frame'>
  hardware: OptionId<'hardware'>
}

export type ConfigResult = { ok: true; config: ChairConfig } | { ok: false; error: string }

const KEYS = ['product', ...PART_IDS]

export const hasOption = (part: PartId, option: unknown): boolean =>
  typeof option === 'string' && Object.hasOwn(OPTIONS[part], option)

// External input (URL, localStorage) is accepted whole or not at all.
export function validateConfig(input: unknown): ConfigResult {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return { ok: false, error: '설정 형식이 올바르지 않습니다' }
  const value = input as Record<string, unknown>
  if (Object.keys(value).length !== KEYS.length || !KEYS.every((key) => Object.hasOwn(value, key))) {
    return { ok: false, error: '설정 항목이 올바르지 않습니다' }
  }
  if (value.product !== PRODUCT_ID) return { ok: false, error: '지원하지 않는 제품입니다' }
  if (!PART_IDS.every((part) => hasOption(part, value[part]))) return { ok: false, error: '알 수 없는 옵션입니다' }
  return { ok: true, config: { product: PRODUCT_ID, fabric: value.fabric, frame: value.frame, hardware: value.hardware } as ChairConfig }
}

export function setOption(config: ChairConfig, part: PartId, option: string): ChairConfig {
  return hasOption(part, option) ? { ...config, [part]: option } : config
}
