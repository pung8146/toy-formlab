import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, OPTIONS, PART_IDS, PRESETS } from '../../src/product/chair/catalog'
import { setOption, type ChairConfig } from '../../src/product/chair/config'
import { parseConfigFragment, serializeConfig } from '../../src/product/chair/url'

const valid = serializeConfig(DEFAULT_CONFIG)
const replaced = (key: string, value: string) => {
  const params = new URLSearchParams(valid)
  params.set(key, value)
  return params.toString()
}

const roundTrip = (config: ChairConfig) => {
  expect(parseConfigFragment(serializeConfig(config))).toEqual({ ok: true, config })
}

describe('serializeConfig', () => {
  it('uses a fixed key order', () => {
    expect([...new URLSearchParams(valid).keys()]).toEqual(['v', 'p', 'fabric', 'frame', 'hardware'])
  })

  it('round-trips every option and every preset', () => {
    for (const part of PART_IDS) {
      for (const option of Object.keys(OPTIONS[part])) roundTrip(setOption(DEFAULT_CONFIG, part, option))
    }
    for (const preset of PRESETS) roundTrip(preset.config)
  })
})

describe('parseConfigFragment', () => {
  it('treats an empty fragment as no shared config', () => {
    expect(parseConfigFragment('')).toBeNull()
    expect(parseConfigFragment('#')).toBeNull()
  })

  it('accepts a leading hash', () => {
    expect(parseConfigFragment(`#${valid}`)).toEqual({ ok: true, config: DEFAULT_CONFIG })
  })

  it.each([
    ['unrelated text', 'hello'],
    ['unsupported version', replaced('v', '2')],
    ['the old lamp product', replaced('p', 'lamp-01')],
    ['unknown option', replaced('fabric', 'leopard')],
    ['option from another part', replaced('frame', 'brass')],
    ['duplicate key', `${valid}&fabric=mango`],
    ['unknown key', `${valid}&extra=1`],
    ['missing key', valid.replace(/&hardware=[^&]*/, '')],
    ['bad encoding', replaced('fabric', 'x').replace('fabric=x', 'fabric=%E0%A4%A')],
    ['too long', `${valid}&${'x'.repeat(1024)}`],
  ])('rejects %s as a whole', (_name, fragment) => {
    expect(parseConfigFragment(fragment)).toMatchObject({ ok: false })
  })
})
