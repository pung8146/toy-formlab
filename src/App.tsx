import { describeConfig, PartControls } from './configurator/PartControls'
import { PresetDialog } from './configurator/PresetDialog'
import { ShareActions } from './configurator/ShareActions'
import { StageControls } from './configurator/StageControls'
import { useChair } from './product/chair/store'
import { ViewerBoundary } from './viewer/ViewerBoundary'
import styles from './App.module.css'

export function App() {
  const config = useChair((s) => s.config)
  const notice = useChair((s) => s.notice)
  const setPresetDialogOpen = useChair((s) => s.setPresetDialogOpen)

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1>FormLab</h1>
        <span>Lounge Chair</span>
        <span className={styles.concept}>3D 모델 SheenChair · Wayfair · CC0</span>
        <button type="button" className={styles.headerButton} onClick={() => setPresetDialogOpen(true)}>
          저장 목록
        </button>
      </header>
      <main className={styles.main}>
        <section className={styles.stage} aria-label="제품 무대">
          <div className={styles.canvas} data-stage-view>
            <ViewerBoundary />
          </div>
          <StageControls />
        </section>
        <aside className={styles.panel} aria-label="구성 편집">
          <PartControls />
          <div className={styles.footer}>
            <p className={styles.summary} data-testid="summary">
              {describeConfig(config)}
            </p>
            <p className={styles.notice} role="status">
              {notice}
            </p>
            <ShareActions />
          </div>
        </aside>
      </main>
      <PresetDialog />
    </div>
  )
}
