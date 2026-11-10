import { create } from 'zustand'
import { DEFAULT_CONFIG, type PartId } from './catalog'
import { setOption, type ChairConfig } from './config'
import { MAX_PRESETS, createPreset, readSaved, validatePresetName, writeSaved, type SavedPreset, type SavedState } from './storage'
import { parseConfigFragment, serializeConfig } from './url'

export type CameraPresetId = 'default' | 'front' | 'side' | 'top'
export type CameraCommand =
  | { type: 'preset'; id: CameraPresetId }
  | { type: 'rotate'; delta: number }
  | { type: 'tilt'; delta: number }
  | { type: 'zoom'; factor: number }

type ChairState = {
  config: ChairConfig
  selectedPart: PartId
  outlineVisible: boolean
  notice: string
  cameraCommand: CameraCommand | null
  viewerReady: boolean
  saved: SavedPreset[]
  storageStatus: SavedState['status']
  presetDialogOpen: boolean
  sendCamera: (command: CameraCommand) => void
  selectPart: (part: PartId) => void
  setOption: (part: PartId, option: string) => void
  applyConfig: (config: ChairConfig, notice?: string) => void
  setNotice: (notice: string) => void
  setViewerReady: (ready: boolean) => void
  setPresetDialogOpen: (open: boolean) => void
  savePreset: (name: string) => string | null
  deletePreset: (id: string) => string | null
  loadPreset: (preset: SavedPreset) => void
}

const SAVE_FAILED = '저장하지 못했습니다. 링크 복사로 구성을 보관하세요.'

const browserStorage = () => {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export const useChair = create<ChairState>((set, get) => ({
  config: DEFAULT_CONFIG,
  selectedPart: 'fabric',
  outlineVisible: false, // no outline until the visitor picks a part, so the first view stays clean
  notice: '',
  cameraCommand: null,
  viewerReady: false,
  saved: [],
  storageStatus: 'ok',
  presetDialogOpen: false,
  sendCamera: (cameraCommand) => set({ cameraCommand: { ...cameraCommand } }),
  selectPart: (selectedPart) => set({ selectedPart, outlineVisible: true }),
  setOption: (part, option) => set({ config: setOption(get().config, part, option), notice: '' }),
  applyConfig: (config, notice = '') => set({ config, notice }),
  setNotice: (notice) => set({ notice }),
  setViewerReady: (viewerReady) => set({ viewerReady }),
  setPresetDialogOpen: (presetDialogOpen) => set({ presetDialogOpen }),
  savePreset: (input) => {
    const name = validatePresetName(input)
    if (!name.ok) return name.error
    const { saved, config } = get()
    if (saved.length >= MAX_PRESETS) return `저장은 ${MAX_PRESETS}개까지입니다. 항목을 지우고 다시 저장하세요.`
    const next = [...saved, createPreset(name.name, config)]
    if (!writeSaved(browserStorage(), next)) return SAVE_FAILED
    set({ saved: next })
    return null
  },
  deletePreset: (id) => {
    const next = get().saved.filter((preset) => preset.id !== id)
    if (!writeSaved(browserStorage(), next)) return SAVE_FAILED
    set({ saved: next })
    return null
  },
  loadPreset: (preset) => set({ config: preset.config, notice: `${preset.name} 구성을 불러왔습니다`, presetDialogOpen: false }),
}))

export const shareLink = (config: ChairConfig) =>
  `${location.origin}${location.pathname}${location.search}#${serializeConfig(config)}`

function applyHash() {
  const result = parseConfigFragment(location.hash)
  if (!result) return
  const { applyConfig } = useChair.getState()
  if (result.ok) applyConfig(result.config)
  else applyConfig(DEFAULT_CONFIG, `공유 링크를 읽을 수 없어 기본 구성으로 시작합니다. ${result.error}.`)
}

export function bootChair() {
  const { status, presets } = readSaved(browserStorage())
  useChair.setState({ storageStatus: status, saved: presets })
  applyHash()
  window.addEventListener('hashchange', applyHash)
}
