import { validateConfig, type LampConfig } from './config'

export const STORAGE_KEY = 'formlab:storage:v1'
export const MAX_PRESETS = 10
const VERSION = 1
const MAX_NAME_LENGTH = 32

export type SavedPreset = { id: string; name: string; createdAt: string; config: LampConfig }
export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>
export type SavedState =
  | { status: 'ok'; presets: SavedPreset[] }
  | { status: 'corrupt'; presets: [] }
  | { status: 'blocked'; presets: [] }

export function validatePresetName(input: string): { ok: true; name: string } | { ok: false; error: string } {
  const name = input.trim()
  if (name === '') return { ok: false, error: '이름을 입력하세요' }
  if ([...name].length > MAX_NAME_LENGTH) return { ok: false, error: `이름은 ${MAX_NAME_LENGTH}자까지 입력할 수 있습니다` }
  return { ok: true, name }
}

export const createPreset = (name: string, config: LampConfig): SavedPreset => ({
  id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
  name,
  createdAt: new Date().toISOString(),
  config: structuredClone(config),
})

function parsePreset(value: unknown): SavedPreset | null {
  if (typeof value !== 'object' || value === null) return null
  const { id, name, createdAt, config } = value as Record<string, unknown>
  if (typeof id !== 'string' || typeof name !== 'string' || typeof createdAt !== 'string') return null
  if (!validatePresetName(name).ok) return null
  const result = validateConfig(config)
  return result.ok ? { id, name, createdAt, config: result.config } : null
}

export function readSaved(storage: StorageLike | null): SavedState {
  let raw: string | null
  try {
    if (!storage) return { status: 'blocked', presets: [] }
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return { status: 'blocked', presets: [] }
  }
  if (raw === null) return { status: 'ok', presets: [] }

  try {
    const parsed = JSON.parse(raw) as { version?: unknown; presets?: unknown }
    if (parsed.version !== VERSION || !Array.isArray(parsed.presets)) return { status: 'corrupt', presets: [] }
    return { status: 'ok', presets: parsed.presets.map(parsePreset).filter((preset) => preset !== null) }
  } catch {
    return { status: 'corrupt', presets: [] }
  }
}

export function writeSaved(storage: StorageLike | null, presets: SavedPreset[]) {
  if (!storage) return false
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, presets }))
    return true
  } catch {
    return false
  }
}
