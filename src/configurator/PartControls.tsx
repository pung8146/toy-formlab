import { OPTIONS, PART_IDS, PART_LABELS, type PartId } from '../product/chair/catalog'
import type { ChairConfig } from '../product/chair/config'
import { useChair } from '../product/chair/store'
import styles from './PartControls.module.css'

type Option = { label: string; swatch: string }
const optionsOf = (part: PartId) => Object.entries(OPTIONS[part]) as [string, Option][]

export function describeConfig(config: ChairConfig) {
  return `${PART_IDS.map((part) => `${PART_LABELS[part]} ${(OPTIONS[part] as Record<string, Option>)[config[part]].label}`).join(', ')}.`
}

export function PartControls() {
  const config = useChair((s) => s.config)
  const part = useChair((s) => s.selectedPart)
  const { selectPart, setOption } = useChair.getState()

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

      <fieldset className={styles.group}>
        <legend>{PART_LABELS[part]} 마감</legend>
        <div className={styles.options}>
          {optionsOf(part).map(([id, option]) => (
            <label key={id} className={styles.swatch}>
              <input type="radio" name="option" checked={config[part] === id} onChange={() => setOption(part, id)} />
              <span className={styles.chip} style={{ background: option.swatch }} aria-hidden="true" />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </form>
  )
}
