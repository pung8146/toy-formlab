import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, PRESETS } from '../../src/product/chair/catalog'
import { MAX_PRESETS, STORAGE_KEY, createPreset, readSaved, validatePresetName, writeSaved, type SavedPreset } from '../../src/product/chair/storage'

function fakeStorage(initial?: string) {
  const data = new Map<string, string>()
  if (initial !== undefined) data.set(STORAGE_KEY, initial)
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  }
}

const preset = (name: string): SavedPreset => createPreset(name, DEFAULT_CONFIG)
const envelope = (presets: unknown, version: unknown = 1) => JSON.stringify({ version, presets })

describe('validatePresetName', () => {
  it('trims the name', () => {
    expect(validatePresetName('  작업실  ')).toEqual({ ok: true, name: '작업실' })
  })

  it('rejects an empty name', () => {
    expect(validatePresetName('   ').ok).toBe(false)
  })

  it('counts code points, so 32 emoji fit and 33 do not', () => {
    expect(validatePresetName('😀'.repeat(32)).ok).toBe(true)
    expect(validatePresetName('😀'.repeat(33)).ok).toBe(false)
  })
})

describe('createPreset', () => {
  it('gives the same name distinct ids', () => {
    expect(preset('A').id).not.toBe(preset('A').id)
  })

  it('stores a snapshot unaffected by later config objects', () => {
    const config = structuredClone(PRESETS[1].config)
    const saved = createPreset('A', config)
    config.fabric = 'plum'
    expect(saved.config.fabric).not.toBe('plum')
  })
})

describe('readSaved', () => {
  it('returns an empty list when nothing is stored', () => {
    expect(readSaved(fakeStorage())).toEqual({ status: 'ok', presets: [] })
  })

  it('round-trips through writeSaved', () => {
    const storage = fakeStorage()
    const presets = [preset('A')]
    expect(writeSaved(storage, presets)).toBe(true)
    expect(readSaved(storage)).toEqual({ status: 'ok', presets })
  })

  it('skips damaged items and keeps valid ones', () => {
    const good = preset('A')
    const bad = { ...preset('B'), config: { ...DEFAULT_CONFIG, fabric: 'leopard' } }
    const result = readSaved(fakeStorage(envelope([bad, 'nope', good])))
    expect(result).toEqual({ status: 'ok', presets: [good] })
  })

  it.each([
    ['broken JSON', '{oops'],
    ['unsupported version', envelope([], 2)],
    ['non-array presets', envelope('x')],
  ])('reports corrupt for %s', (_name, raw) => {
    expect(readSaved(fakeStorage(raw)).status).toBe('corrupt')
  })

  it('reports blocked when storage is unavailable or throws', () => {
    expect(readSaved(null).status).toBe('blocked')
    const throwing = { getItem: () => { throw new Error('denied') }, setItem: () => {} }
    expect(readSaved(throwing).status).toBe('blocked')
  })
})

describe('writeSaved', () => {
  it('returns false when quota is exceeded', () => {
    const full = { getItem: () => null, setItem: () => { throw new DOMException('quota', 'QuotaExceededError') } }
    expect(writeSaved(full, [preset('A')])).toBe(false)
  })

  it('returns false without storage', () => {
    expect(writeSaved(null, [])).toBe(false)
  })
})

it('caps presets at ten', () => {
  expect(MAX_PRESETS).toBe(10)
})

it('stores chair presets under their own key so old lamp presets are left alone', () => {
  expect(STORAGE_KEY).toBe('formlab:chair:v1')
})
