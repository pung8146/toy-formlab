import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, OPTIONS, PART_IDS, PRESETS } from '../../src/product/chair/catalog'
import { setOption, validateConfig } from '../../src/product/chair/config'

describe('validateConfig', () => {
  it('accepts every option on every part', () => {
    for (const part of PART_IDS) {
      for (const option of Object.keys(OPTIONS[part])) {
        expect(validateConfig({ ...DEFAULT_CONFIG, [part]: option }).ok).toBe(true)
      }
    }
  })

  it('accepts the default and every built-in preset', () => {
    expect(validateConfig(DEFAULT_CONFIG).ok).toBe(true)
    expect(PRESETS).toHaveLength(3)
    for (const preset of PRESETS) expect(validateConfig(preset.config).ok).toBe(true)
  })

  it('rejects an unknown option', () => {
    expect(validateConfig({ ...DEFAULT_CONFIG, fabric: 'leopard' }).ok).toBe(false)
  })

  it('rejects an option that belongs to another part', () => {
    expect(validateConfig({ ...DEFAULT_CONFIG, frame: 'brass' }).ok).toBe(false)
  })

  it('rejects an unknown part key', () => {
    expect(validateConfig({ ...DEFAULT_CONFIG, cushion: 'peacock' }).ok).toBe(false)
  })

  it('rejects a missing part', () => {
    const partial: Partial<typeof DEFAULT_CONFIG> = { ...DEFAULT_CONFIG }
    delete partial.hardware
    expect(validateConfig(partial).ok).toBe(false)
  })

  it('rejects another product', () => {
    expect(validateConfig({ ...DEFAULT_CONFIG, product: 'lamp-01' }).ok).toBe(false)
  })

  it.each([null, 'chair', 42, []])('rejects non-object input %j', (input) => {
    expect(validateConfig(input).ok).toBe(false)
  })

  it('does not accept inherited keys such as toString', () => {
    expect(validateConfig({ ...DEFAULT_CONFIG, fabric: 'toString' }).ok).toBe(false)
  })
})

describe('setOption', () => {
  it('changes one part and leaves the others', () => {
    const next = setOption(DEFAULT_CONFIG, 'fabric', 'mango')
    expect(next.fabric).toBe('mango')
    expect(next.frame).toBe(DEFAULT_CONFIG.frame)
    expect(next.hardware).toBe(DEFAULT_CONFIG.hardware)
  })

  it('ignores an option the part does not offer', () => {
    expect(setOption(DEFAULT_CONFIG, 'frame', 'brass')).toEqual(DEFAULT_CONFIG)
  })
})

it('defaults to peacock velvet on an ebony frame', () => {
  expect(DEFAULT_CONFIG).toEqual({ product: 'chair-01', fabric: 'peacock', frame: 'ebony', hardware: 'nickel' })
})
