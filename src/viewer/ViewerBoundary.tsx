import { Component, lazy, Suspense, useCallback, useState, type ReactNode } from 'react'
import { serializeConfig } from '../product/chair/url'
import { useChair } from '../product/chair/store'
import styles from './ViewerBoundary.module.css'

type ViewerStatus = 'loading' | 'ready' | 'unsupported' | 'failed' | 'context-lost' | 'chunk-error'

let chunkFailed = false
const ProductViewer = lazy(() =>
  import('./ProductViewer').catch((error) => {
    chunkFailed = true
    throw error
  }),
)

function supportsWebGL2() {
  return document.createElement('canvas').getContext('webgl2') !== null
}

class Catch extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

const POSTER = `${import.meta.env.BASE_URL}assets/chair/poster.jpg`
const POSTER_NOTE = '3D를 표시할 수 없어 사진으로 보여 줍니다. 사진은 기본 구성이며 현재 구성과 다를 수 있습니다. 편집과 저장, 공유는 계속 쓸 수 있습니다.'

export function ViewerBoundary() {
  const [status, setStatus] = useState<ViewerStatus>(() => (supportsWebGL2() ? 'loading' : 'unsupported'))
  const [attempt, setAttempt] = useState(0)
  const setViewerReady = useChair((s) => s.setViewerReady)

  const leave = useCallback(
    (next: ViewerStatus) => {
      setViewerReady(false)
      setStatus(next)
    },
    [setViewerReady],
  )
  const onReady = useCallback(() => {
    setViewerReady(true)
    setStatus('ready')
  }, [setViewerReady])
  const onContextLost = useCallback(() => leave('context-lost'), [leave])
  const onError = () => leave(chunkFailed ? 'chunk-error' : 'failed')

  const retry = () => {
    setStatus('loading')
    setAttempt((value) => value + 1)
  }
  const reopen = () => {
    location.hash = serializeConfig(useChair.getState().config)
    location.reload()
  }

  const showViewer = status === 'loading' || status === 'ready'
  const showNote = status !== 'loading' && status !== 'ready'

  return (
    <>
      {showViewer && (
        <Catch key={attempt} onError={onError}>
          <Suspense fallback={null}>
            <ProductViewer attempt={attempt} onReady={onReady} onContextLost={onContextLost} />
          </Suspense>
        </Catch>
      )}
      {status !== 'ready' && (
        <img className={styles.poster} src={POSTER} alt="라운지 체어 기본 구성 사진" />
      )}
      {status === 'loading' && <p className={styles.loading}>3D 뷰어 준비 중</p>}
      {showNote && (
        <div className={styles.note}>
          <p>{POSTER_NOTE}</p>
          {(status === 'context-lost' || status === 'failed') && (
            <button type="button" className={styles.button} onClick={retry}>
              다시 시도
            </button>
          )}
          {status === 'chunk-error' && (
            <button type="button" className={styles.button} onClick={reopen}>
              페이지 다시 열기
            </button>
          )}
        </div>
      )}
    </>
  )
}
