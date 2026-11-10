import {
  ARM_LENGTHS,
  BASE_SHAPES,
  COLOR_LABELS,
  FINISHES,
  FINISH_IDS,
  PART_IDS,
  PART_LABELS,
  SHADE_SHAPES,
  SHAPE_LABELS,
  type ColorId,
  type PartId,
} from '../product/lamp/catalog'
import type { LampConfig } from '../product/lamp/config'
import { useLamp } from '../product/lamp/store'
import styles from './PartControls.module.css'

const SHAPE_FIELDS = {
  base: { legend: '받침 형태', options: BASE_SHAPES },
  shade: { legend: '갓 형태', options: SHADE_SHAPES },
  arm: { legend: '암 길이', options: ARM_LENGTHS },
} as const

const hasShape = (part: PartId): part is keyof typeof SHAPE_FIELDS => part !== 'stem'

export function describeConfig(config: LampConfig) {
  const shapes = `${SHAPE_LABELS[config.base]} 받침, ${SHAPE_LABELS[config.shade]} 갓, ${SHAPE_LABELS[config.arm]} 암`
  const finishes = PART_IDS.map((part) => {
    const { finish, color } = config.finishes[part]
    return `${PART_LABELS[part]} ${FINISHES[finish].label} ${COLOR_LABELS[color]}`
  }).join(', ')
  return `${shapes}. ${finishes}.`
}

export function PartControls() {
  const config = useLamp((s) => s.config)
  const part = useLamp((s) => s.selectedPart)
  const { selectPart, setFinish, setColor, setShape } = useLamp.getState()
  const { finish, color } = config.finishes[part]
  const colors = Object.entries(FINISHES[finish].colors) as [ColorId, string][]

  return (
    <form className={styles.form} onSubmit={(event) => event.preventDefault()}>
      <fieldset className={styles.group}>
        <legend>부품</legend>
        <div className={styles.parts}>
          {PART_IDS.map((id) => (
            <label key={id} className={styles.part}>
              <input type="radio" name="part" checked={part === id} onChange={() => selectPart(id)} />
              <span>{PART_LABELS[id]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {hasShape(part) && (
        <fieldset className={styles.group}>
          <legend>{SHAPE_FIELDS[part].legend}</legend>
          <div className={styles.options}>
            {SHAPE_FIELDS[part].options.map((id) => (
              <label key={id} className={styles.option}>
                <input type="radio" name="shape" checked={config[part] === id} onChange={() => setShape(part, id)} />
                <span>{SHAPE_LABELS[id]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className={styles.group}>
        <legend>재질</legend>
        <div className={styles.options}>
          {FINISH_IDS.map((id) => (
            <label key={id} className={styles.option}>
              <input type="radio" name="finish" checked={finish === id} onChange={() => setFinish(part, id)} />
              <span>{FINISHES[id].label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend>색</legend>
        <div className={styles.options}>
          {colors.map(([id, hex]) => (
            <label key={id} className={styles.swatch}>
              <input type="radio" name="color" checked={color === id} onChange={() => setColor(part, id)} />
              <span className={styles.chip} style={{ background: hex }} aria-hidden="true" />
              <span>{COLOR_LABELS[id]}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </form>
  )
}
