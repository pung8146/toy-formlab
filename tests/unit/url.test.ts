import { describe, expect, it } from 'vitest'
import { COLOR_LABELS, DEFAULT_CONFIG, FINISHES, FINISH_IDS, PART_IDS, PRESETS, type ColorId } from '../../src/product/lamp/catalog'
import { setPartColor, setPartFinish, type LampConfig } from '../../src/product/lamp/config'
import { parseConfigFragment, serializeConfig } from '../../src/product/lamp/url'

const valid = serializeConfig(DEFAULT_CONFIG)
const replaced = (key: string, value: string) => {
  const params = new URLSearchParams(valid)
  params.set(key, value)
  return params.toString()
}

const roundTrip = (config: LampConfig) => {
  const result = parseConfigFragment(serializeConfig(config))
  expect(result).toEqual({ ok: true, config })
}

describe('serializeConfig', () => {
  it('uses a fixed key order', () => {
    expect([...new URLSearchParams(valid).keys()]).toEqual([
      'v', 'p', 'base', 'shade', 'arm',
      'baseFinish', 'baseColor', 'stemFinish', 'stemColor', 'armFinish', 'armColor', 'shadeFinish', 'shadeColor',
    ])
  })

  it('round-trips shape changes and presets', () => {
    roundTrip({ ...DEFAULT_CONFIG, base: 'disc' })
    roundTrip({ ...DEFAULT_CONFIG, shade: 'dome' })
    roundTrip({ ...DEFAULT_CONFIG, arm: 'long' })
    for (const preset of PRESETS) roundTrip(preset.config)
  })

  it('round-trips every finish and color on every part', () => {
    for (const part of PART_IDS) {
      for (const finish of FINISH_IDS) {
        const base = setPartFinish(DEFAULT_CONFIG, part, finish).config
        for (const color of Object.keys(FINISHES[finish].colors) as ColorId[]) {
          expect(COLOR_LABELS[color]).toBeTruthy()
          roundTrip(setPartColor(base, part, color))
        }
      }
    }
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
    ['other product', replaced('p', 'chair-01')],
    ['unknown enum', replaced('base', 'hexagon')],
    ['color outside the finish', replaced('baseColor', 'silver')],
    ['duplicate key', `${valid}&base=disc`],
    ['unknown key', `${valid}&extra=1`],
    ['missing key', valid.replace(/&shadeColor=[^&]*/, '')],
    ['bad encoding', replaced('base', 'x').replace('base=x', 'base=%E0%A4%A')],
    ['too long', `${valid}&${'x'.repeat(1024)}`],
  ])('rejects %s as a whole', (_name, fragment) => {
    expect(parseConfigFragment(fragment)).toMatchObject({ ok: false })
  })
})
