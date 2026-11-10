import { PART_IDS, PRODUCT_ID } from './catalog'
import { validateConfig, type ChairConfig, type ConfigResult } from './config'

const VERSION = '1'
const MAX_LENGTH = 1024
const KEYS = ['v', 'p', ...PART_IDS]

export function serializeConfig(config: ChairConfig) {
  return new URLSearchParams([['v', VERSION], ['p', config.product], ...PART_IDS.map((part) => [part, config[part]])]).toString()
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

  return validateConfig({ product: values.get('p'), ...Object.fromEntries(PART_IDS.map((part) => [part, values.get(part)])) })
}
