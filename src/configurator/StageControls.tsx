import { PRESETS } from '../product/lamp/catalog'
import { useLamp, type CameraCommand, type CameraPresetId } from '../product/lamp/store'
import styles from './StageControls.module.css'

const VIEW_BUTTONS: { id: CameraPresetId; label: string }[] = [
  { id: 'default', label: '기본 시점' },
  { id: 'front', label: '정면' },
  { id: 'side', label: '측면' },
  { id: 'top', label: '상단' },
]

const DEGREE = Math.PI / 180

const STEP_BUTTONS: { label: string; text: string; command: CameraCommand }[] = [
  { label: '왼쪽으로 회전', text: '←', command: { type: 'rotate', delta: -15 * DEGREE } },
  { label: '오른쪽으로 회전', text: '→', command: { type: 'rotate', delta: 15 * DEGREE } },
  { label: '위로 기울이기', text: '↑', command: { type: 'tilt', delta: -10 * DEGREE } },
  { label: '아래로 기울이기', text: '↓', command: { type: 'tilt', delta: 10 * DEGREE } },
  { label: '확대', text: '+', command: { type: 'zoom', factor: 0.9 } },
  { label: '축소', text: '−', command: { type: 'zoom', factor: 1.1 } },
]

export function StageControls() {
  const config = useLamp((s) => s.config)
  const lit = useLamp((s) => s.lit)
  const viewerReady = useLamp((s) => s.viewerReady)
  const { applyConfig, setLit, sendCamera } = useLamp.getState()

  return (
    <div className={styles.bar}>
      <div className={styles.group} role="group" aria-label="프리셋">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={styles.button}
            aria-pressed={JSON.stringify(config) === JSON.stringify(preset.config)}
            onClick={() => applyConfig(preset.config)}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {viewerReady && (
        <>
          <button type="button" className={styles.light} data-lit={lit} onClick={() => setLit(!lit)}>
            {lit ? '불 끄기' : '불 켜기'}
          </button>

          <div className={styles.views} role="group" aria-label="시점">
            {VIEW_BUTTONS.map(({ id, label }) => (
              <button key={id} type="button" className={styles.button} onClick={() => sendCamera({ type: 'preset', id })}>
                {label}
              </button>
            ))}
            {STEP_BUTTONS.map(({ label, text, command }) => (
              <button
                key={label}
                type="button"
                className={styles.step}
                aria-label={label}
                title={label}
                onClick={() => sendCamera(command)}
              >
                {text}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
