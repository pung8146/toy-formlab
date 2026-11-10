import { PART_IDS, PRODUCT_ID, type PartId } from './catalog'
import { validateConfig, type ConfigResult, type LampConfig } from './config'

const VERSION = '1'
const MAX_LENGTH = 1024

const finishKey = (part: PartId) => `${part}Finish`
const colorKey = (part: PartId) => `${part}Color`
const KEYS = ['v', 'p', 'base', 'shade', 'arm', ...PART_IDS.flatMap((part) => [finishKey(part), colorKey(part)])]

export function serializeConfig(config: LampConfig) {
  const params = new URLSearchParams({
    v: VERSION,
    p: config.product,
    base: config.base,
    shade: config.shade,
    arm: config.arm,
  })
  for (const part of PART_IDS) {
    params.set(finishKey(part), config.finishes[part].finish)
    params.set(colorKey(part), config.finishes[part].color)
  }
  return params.toString()
}

const fail = (error: string): ConfigResult => ({ ok: false, error })

// Null means the URL carries no shared config; anything else is applied whole or rejected whole.
export function parseConfigFragment(hash: string): ConfigResult | null {
  const fragment = hash.replace(/^#/, '')
  if (fragment === '') return null
  if (fragment.length > MAX_LENGTH) return fail('공유 링크가 너무 깁니다')

  const entries = [...new URLSearchParams(fragment)]
  const values = new Map(entries)
  if (entries.length !== KEYS.length || values.size !== KEYS.length || !KEYS.every((key) => values.has(key))) {
    return fail('공유 링크의 항목이 올바르지 않습니다')
  }
  if (values.get('v') !== VERSION) return fail('지원하지 않는 링크 버전입니다')
  if (values.get('p') !== PRODUCT_ID) return fail('지원하지 않는 제품입니다')

  return validateConfig({
    product: values.get('p'),
    base: values.get('base'),
    shade: values.get('shade'),
    arm: values.get('arm'),
    finishes: Object.fromEntries(
      PART_IDS.map((part) => [part, { finish: values.get(finishKey(part)), color: values.get(colorKey(part)) }]),
    ),
  })
}
