import type { ChairConfig } from './config'

export const PRODUCT_ID = 'chair-01'

export const PART_IDS = ['fabric', 'frame', 'hardware'] as const
export type PartId = (typeof PART_IDS)[number]

export const PART_LABELS: Record<PartId, string> = { fabric: '원단', frame: '프레임', hardware: '금속 부품' }

// `color` and `sheen` are sRGB values applied as glTF factors over the model's neutral textures;
// `swatch` is what the color reads as on screen, used for the UI chip.
export const OPTIONS = {
  fabric: {
    peacock: { label: '피콕', swatch: '#106467', color: '#00565a', sheen: '#1d9295' },
    mango: { label: '망고', swatch: '#e2532a', color: '#f23400', sheen: '#ff9b59' },
    sage: { label: '세이지', swatch: '#6f8a69', color: '#4f6b4b', sheen: '#7fa07a' },
    ink: { label: '잉크', swatch: '#26345a', color: '#121c38', sheen: '#34466f' },
    oat: { label: '오트밀', swatch: '#c2b49b', color: '#a89878', sheen: '#d2c4a8' },
    plum: { label: '플럼', swatch: '#6a2a4a', color: '#45172e', sheen: '#7a3b5c' },
  },
  frame: {
    ebony: { label: '에보니', swatch: '#2b2a28', color: '#353535' },
    walnut: { label: '월넛', swatch: '#6b4a2b', color: '#694b1a' },
    oak: { label: '오크', swatch: '#b89263', color: '#c09a63' },
  },
  hardware: {
    nickel: { label: '니켈', swatch: '#b9b6ae', color: '#918c84', metalness: 1, roughness: 0.3 },
    brass: { label: '브라스', swatch: '#c8a25d', color: '#c9a25e', metalness: 1, roughness: 0.32 },
    black: { label: '블랙', swatch: '#2b2b2b', color: '#2a2a2a', metalness: 0.6, roughness: 0.45 },
  },
} as const

export type OptionId<P extends PartId> = keyof (typeof OPTIONS)[P] & string

export const DEFAULT_CONFIG: ChairConfig = { product: PRODUCT_ID, fabric: 'peacock', frame: 'ebony', hardware: 'nickel' }

export const PRESETS: { id: string; name: string; config: ChairConfig }[] = [
  { id: 'peacock', name: 'Peacock', config: DEFAULT_CONFIG },
  { id: 'mango', name: 'Mango', config: { product: PRODUCT_ID, fabric: 'mango', frame: 'walnut', hardware: 'nickel' } },
  { id: 'oat', name: 'Oat', config: { product: PRODUCT_ID, fabric: 'oat', frame: 'oak', hardware: 'brass' } },
]
