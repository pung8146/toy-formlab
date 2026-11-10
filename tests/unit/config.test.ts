import { describe, expect, it } from 'vitest'
import { ARM_LENGTHS, BASE_SHAPES, DEFAULT_CONFIG, PRESETS, SHADE_SHAPES } from '../../src/product/lamp/catalog'
import { setGeometryOption, setPartColor, setPartFinish, validateConfig } from '../../src/product/lamp/config'

const metalShade = setPartFinish(DEFAULT_CONFIG, 'shade', 'satin-metal').config

describe('validateConfig', () => {
  it('accepts all 8 shape combinations', () => {
    const combos = BASE_SHAPES.flatMap((base) =>
      SHADE_SHAPES.flatMap((shade) => ARM_LENGTHS.map((arm) => ({ ...DEFAULT_CONFIG, base, shade, arm }))),
    )
    expect(combos).toHaveLength(8)
    for (const combo of combos) expect(validateConfig(combo).ok).toBe(true)
  })

  it('accepts the default and every built-in preset', () => {
    expect(validateConfig(DEFAULT_CONFIG).ok).toBe(true)
    expect(PRESETS).toHaveLength(3)
    for (const preset of PRESETS) expect(validateConfig(preset.config).ok).toBe(true)
  })

  it('rejects an unknown shape option', () => {
    expect(validateConfig({ ...DEFAULT_CONFIG, base: 'hexagon' }).ok).toBe(false)
  })

  it('rejects an unknown part', () => {
    const finishes = { ...DEFAULT_CONFIG.finishes, cord: { finish: 'powder-coat', color: 'chalk' } }
    expect(validateConfig({ ...DEFAULT_CONFIG, finishes }).ok).toBe(false)
  })

  it('rejects a missing part', () => {
    const finishes: Partial<typeof DEFAULT_CONFIG.finishes> = { ...DEFAULT_CONFIG.finishes }
    delete finishes.arm
    expect(validateConfig({ ...DEFAULT_CONFIG, finishes }).ok).toBe(false)
  })

  it('rejects a color that the finish does not offer', () => {
    const finishes = { ...DEFAULT_CONFIG.finishes, base: { finish: 'powder-coat', color: 'silver' } }
    expect(validateConfig({ ...DEFAULT_CONFIG, finishes }).ok).toBe(false)
  })

  it.each([null, 'lamp', 42, []])('rejects non-object input %j', (input) => {
    expect(validateConfig(input).ok).toBe(false)
  })
})

describe('setPartFinish', () => {
  it('falls back to chalk when silver moves to powder coat and reports it', () => {
    const silver = setPartColor(metalShade, 'shade', 'silver')
    const result = setPartFinish(silver, 'shade', 'powder-coat')
    expect(result.config.finishes.shade).toEqual({ finish: 'powder-coat', color: 'chalk' })
    expect(result.colorChanged).toBe(true)
  })

  it('keeps graphite when moving to metal', () => {
    const graphite = setPartColor(DEFAULT_CONFIG, 'shade', 'graphite')
    const result = setPartFinish(graphite, 'shade', 'satin-metal')
    expect(result.config.finishes.shade).toEqual({ finish: 'satin-metal', color: 'graphite' })
    expect(result.colorChanged).toBe(false)
  })

  it('leaves other parts unchanged', () => {
    const result = setPartFinish(DEFAULT_CONFIG, 'shade', 'satin-metal')
    expect(result.config.finishes.base).toEqual(DEFAULT_CONFIG.finishes.base)
    expect(result.config.finishes.stem).toEqual(DEFAULT_CONFIG.finishes.stem)
    expect(result.config.finishes.arm).toEqual(DEFAULT_CONFIG.finishes.arm)
  })
})

describe('setPartColor', () => {
  it('ignores a color the current finish does not offer', () => {
    expect(setPartColor(DEFAULT_CONFIG, 'base', 'silver')).toEqual(DEFAULT_CONFIG)
  })
})

describe('setGeometryOption', () => {
  it('changes shape without touching finishes', () => {
    const next = setGeometryOption(DEFAULT_CONFIG, 'shade', 'dome')
    expect(next.shade).toBe('dome')
    expect(next.finishes).toEqual(DEFAULT_CONFIG.finishes)
  })
})

describe('default', () => {
  it('is the Atelier configuration', () => {
    expect(DEFAULT_CONFIG).toMatchObject({ base: 'square', shade: 'cone', arm: 'short' })
    expect(DEFAULT_CONFIG.finishes.base).toEqual({ finish: 'powder-coat', color: 'clay' })
    expect(DEFAULT_CONFIG.finishes.shade).toEqual({ finish: 'powder-coat', color: 'clay' })
    expect(DEFAULT_CONFIG.finishes.stem).toEqual({ finish: 'satin-metal', color: 'silver' })
    expect(DEFAULT_CONFIG.finishes.arm).toEqual({ finish: 'satin-metal', color: 'silver' })
  })
})
