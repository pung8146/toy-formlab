import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLamp } from '../product/lamp/store'
import styles from './PresetDialog.module.css'

export function PresetDialog() {
  const open = useLamp((s) => s.presetDialogOpen)
  const saved = useLamp((s) => s.saved)
  const storageStatus = useLamp((s) => s.storageStatus)
  const { setPresetDialogOpen, savePreset, deletePreset, loadPreset } = useLamp.getState()
  const dialog = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const corrupt = storageStatus === 'corrupt'

  useEffect(() => {
    const element = dialog.current!
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  }, [open])

  const onClose = () => {
    setPresetDialogOpen(false)
    setError('')
    setConfirmingId(null)
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const failure = savePreset(name)
    setError(failure ?? '')
    if (!failure) setName('')
  }

  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="preset-title" onClose={onClose}>
      <h2 id="preset-title">저장 목록</h2>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <label htmlFor="preset-name">이름</label>
        <div className={styles.row}>
          <input
            id="preset-name"
            className={styles.input}
            value={name}
            disabled={corrupt}
            aria-describedby="preset-error"
            onChange={(event) => setName(event.target.value)}
          />
          <button type="submit" className={styles.primary} disabled={corrupt}>
            저장
          </button>
        </div>
        <p id="preset-error" className={styles.error} role="alert">
          {corrupt ? '저장된 데이터를 읽을 수 없어 저장을 껐습니다. 링크 복사로 구성을 보관하세요.' : error}
        </p>
      </form>

      {saved.length > 0 && (
        <ul className={styles.list}>
          {saved.map((preset) => (
            <li key={preset.id} className={styles.item}>
              <span className={styles.name}>{preset.name}</span>
              {confirmingId === preset.id ? (
                <span className={styles.actions}>
                  <span>이 항목을 삭제할까요?</span>
                  <button
                    type="button"
                    className={styles.button}
                    onClick={() => {
                      setError(deletePreset(preset.id) ?? '')
                      setConfirmingId(null)
                    }}
                  >
                    삭제 확인
                  </button>
                  <button type="button" className={styles.button} onClick={() => setConfirmingId(null)}>
                    취소
                  </button>
                </span>
              ) : (
                <span className={styles.actions}>
                  <button type="button" className={styles.button} aria-label={`${preset.name} 불러오기`} onClick={() => loadPreset(preset)}>
                    불러오기
                  </button>
                  <button type="button" className={styles.button} aria-label={`${preset.name} 삭제`} disabled={corrupt} onClick={() => setConfirmingId(preset.id)}>
                    삭제
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className={styles.note}>이 브라우저에만 저장됩니다.</p>
      <button type="button" className={styles.button} onClick={() => setPresetDialogOpen(false)}>
        닫기
      </button>
    </dialog>
  )
}
