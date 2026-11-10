import { useState } from 'react'
import { DEFAULT_CONFIG } from '../product/chair/catalog'
import { shareLink, useChair } from '../product/chair/store'
import styles from './ShareActions.module.css'

export function ShareActions() {
  const { setPresetDialogOpen, setNotice, applyConfig } = useChair.getState()
  const [manualLink, setManualLink] = useState('')
  const [confirmingReset, setConfirmingReset] = useState(false)

  const copyLink = async () => {
    const link = shareLink(useChair.getState().config)
    try {
      await navigator.clipboard.writeText(link)
      setManualLink('')
      setNotice('링크를 복사했습니다')
    } catch {
      setManualLink(link)
      setNotice('클립보드를 쓸 수 없어 링크를 아래에 표시했습니다')
    }
  }

  return (
    <div className={styles.actions}>
      <div className={styles.row}>
        <button type="button" className={styles.primary} onClick={() => setPresetDialogOpen(true)}>
          저장
        </button>
        <button type="button" className={styles.button} onClick={copyLink}>
          링크 복사
        </button>
      </div>

      {manualLink && (
        <label className={styles.manual}>
          공유 링크
          <input readOnly value={manualLink} onFocus={(event) => event.target.select()} />
        </label>
      )}

      {confirmingReset ? (
        <div className={styles.confirm}>
          <span>기본 구성으로 되돌립니다. 저장 목록은 유지됩니다.</span>
          <div className={styles.row}>
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                applyConfig(DEFAULT_CONFIG, '기본 구성으로 되돌렸습니다')
                setConfirmingReset(false)
              }}
            >
              초기화 확인
            </button>
            <button type="button" className={styles.button} onClick={() => setConfirmingReset(false)}>
              취소
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className={styles.quiet} onClick={() => setConfirmingReset(true)}>
          구성 초기화
        </button>
      )}
    </div>
  )
}
