import { create } from 'zustand'
import { COLOR_LABELS, DEFAULT_CONFIG, FINISHES, type ColorId, type FinishId, type PartId } from './catalog'
import { setGeometryOption, setPartColor, setPartFinish, type LampConfig } from './config'
import { MAX_PRESETS, createPreset, readSaved, validatePresetName, writeSaved, type SavedPreset, type SavedState } from './storage'
import { parseConfigFragment, serializeConfig } from './url'

type GeometryKey = 'base' | 'shade' | 'arm'

export type CameraPresetId = 'default' | 'front' | 'side' | 'top'
export type CameraCommand =
  | { type: 'preset'; id: CameraPresetId }
  | { type: 'rotate'; delta: number }
  | { type: 'tilt'; delta: number }
  | { type: 'zoom'; factor: number }

type LampState = {
  config: LampConfig
  selectedPart: PartId
  outlineVisible: boolean
  lit: boolean
  notice: string
  cameraCommand: CameraCommand | null
  viewerReady: boolean
  saved: SavedPreset[]
  storageStatus: SavedState['status']
  presetDialogOpen: boolean
  sendCamera: (command: CameraCommand) => void
  selectPart: (part: PartId) => void
  setFinish: (part: PartId, finish: FinishId) => void
  setColor: (part: PartId, color: ColorId) => void
  setShape: (key: GeometryKey, value: LampConfig[GeometryKey]) => void
  applyConfig: (config: LampConfig, notice?: string) => void
  setLit: (lit: boolean) => void
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

export const useLamp = create<LampState>((set, get) => ({
  config: DEFAULT_CONFIG,
  selectedPart: 'shade',
  outlineVisible: false, // no outline until the visitor picks a part, so the first view stays clean
  lit: false,
  notice: '',
  cameraCommand: null,
  viewerReady: false,
  saved: [],
  storageStatus: 'ok',
  presetDialogOpen: false,
  sendCamera: (cameraCommand) => set({ cameraCommand: { ...cameraCommand } }),
  selectPart: (selectedPart) => set({ selectedPart, outlineVisible: true }),
  setFinish: (part, finish) => {
    const before = get().config.finishes[part].color
    const { config, colorChanged } = setPartFinish(get().config, part, finish)
    const notice = colorChanged
      ? `${COLOR_LABELS[before]} 색은 ${FINISHES[finish].label}에 없어 ${COLOR_LABELS[config.finishes[part].color]}로 바꿨습니다`
      : ''
    set({ config, notice })
  },
  setColor: (part, color) => set({ config: setPartColor(get().config, part, color), notice: '' }),
  setShape: (key, value) => set({ config: setGeometryOption(get().config, key, value as never), notice: '' }),
  applyConfig: (config, notice = '') => set({ config, notice }),
  setLit: (lit) => set({ lit }),
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

export const shareLink = (config: LampConfig) =>
  `${location.origin}${location.pathname}${location.search}#${serializeConfig(config)}`

function applyHash() {
  const result = parseConfigFragment(location.hash)
  if (!result) return
  const { applyConfig } = useLamp.getState()
  if (result.ok) applyConfig(result.config)
  else applyConfig(DEFAULT_CONFIG, `공유 링크를 읽을 수 없어 기본 구성으로 시작합니다. ${result.error}.`)
}

export function bootLamp() {
  const { status, presets } = readSaved(browserStorage())
  useLamp.setState({ storageStatus: status, saved: presets })
  applyHash()
  window.addEventListener('hashchange', applyHash)
}
