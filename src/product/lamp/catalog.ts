import type { LampConfig } from './config'

export const PRODUCT_ID = 'lamp-01'

export const PART_IDS = ['base', 'stem', 'arm', 'shade'] as const
export type PartId = (typeof PART_IDS)[number]

export const BASE_SHAPES = ['disc', 'square'] as const
export type BaseShape = (typeof BASE_SHAPES)[number]
export const SHADE_SHAPES = ['dome', 'cone'] as const
export type ShadeShape = (typeof SHADE_SHAPES)[number]
export const ARM_LENGTHS = ['short', 'long'] as const
export type ArmLength = (typeof ARM_LENGTHS)[number]

export const FINISH_IDS = ['powder-coat', 'satin-metal'] as const
export type FinishId = (typeof FINISH_IDS)[number]
export type ColorId = 'chalk' | 'graphite' | 'clay' | 'sage' | 'cobalt' | 'silver' | 'champagne'

export const PART_LABELS: Record<PartId, string> = { base: '받침', stem: '기둥', arm: '암', shade: '갓' }

export const SHAPE_LABELS: Record<BaseShape | ShadeShape | ArmLength, string> = {
  disc: '원형',
  square: '사각',
  dome: '돔',
  cone: '원뿔',
  short: '짧게',
  long: '길게',
}

export const COLOR_LABELS: Record<ColorId, string> = {
  chalk: '초크',
  graphite: '그래파이트',
  clay: '클레이',
  sage: '세이지',
  cobalt: '코발트',
  silver: '실버',
  champagne: '샴페인',
}

type Finish = {
  label: string
  metalness: number
  roughness: number
  defaultColor: ColorId
  colors: Partial<Record<ColorId, string>>
}

export const FINISHES: Record<FinishId, Finish> = {
  'powder-coat': {
    label: '분체도장',
    metalness: 0,
    roughness: 0.65,
    defaultColor: 'chalk',
    colors: { chalk: '#e8e4da', graphite: '#3a3c3b', clay: '#b5694a', sage: '#8a9a82', cobalt: '#2f4fa8' },
  },
  'satin-metal': {
    label: '새틴 금속',
    metalness: 1,
    roughness: 0.32,
    defaultColor: 'silver',
    colors: { silver: '#c9cbcc', champagne: '#c9b38e', graphite: '#4a4c4f' },
  },
}

const allPaint = (color: ColorId) => {
  const finish = { finish: 'powder-coat', color } as const
  return { base: finish, stem: finish, arm: finish, shade: finish }
}

const clay = { finish: 'powder-coat', color: 'clay' } as const
const silver = { finish: 'satin-metal', color: 'silver' } as const

export const DEFAULT_CONFIG: LampConfig = {
  product: PRODUCT_ID,
  base: 'square',
  shade: 'cone',
  arm: 'short',
  finishes: { base: clay, stem: silver, arm: silver, shade: clay },
}

export const PRESETS: { id: string; name: string; config: LampConfig }[] = [
  { id: 'atelier', name: 'Atelier', config: DEFAULT_CONFIG },
  {
    id: 'chalk',
    name: 'Chalk',
    config: { product: PRODUCT_ID, base: 'disc', shade: 'dome', arm: 'short', finishes: allPaint('chalk') },
  },
  {
    id: 'graphite',
    name: 'Graphite',
    config: { product: PRODUCT_ID, base: 'disc', shade: 'dome', arm: 'long', finishes: allPaint('graphite') },
  },
]
