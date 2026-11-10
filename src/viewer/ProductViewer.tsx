import { Canvas } from '@react-three/fiber'
import { Suspense, useCallback, useRef, type PointerEvent } from 'react'
import { NeutralToneMapping } from 'three'
import { ChairModel } from '../product/chair/ChairModel'
import { useChair } from '../product/chair/store'
import { CameraRig } from './CameraControls'
import { Studio } from './Studio'
import styles from './ProductViewer.module.css'

const maxDpr = () => (window.matchMedia('(pointer: coarse)').matches ? 1.5 : 2)

type ProductViewerProps = { attempt: number; onReady: () => void; onContextLost: () => void }

export default function ProductViewer({ attempt, onReady, onContextLost }: ProductViewerProps) {
  const config = useChair((s) => s.config)
  const pointers = useRef(new Set<number>())
  const multiTouch = useRef(false)

  const onPointerDown = (event: PointerEvent) => {
    if (pointers.current.size === 0) multiTouch.current = false
    pointers.current.add(event.pointerId)
    if (pointers.current.size > 1) multiTouch.current = true
  }
  const onPointerEnd = (event: PointerEvent) => pointers.current.delete(event.pointerId)
  // two frames so the poster stays up until the chair has actually been drawn
  const onLoaded = useCallback(() => requestAnimationFrame(() => requestAnimationFrame(onReady)), [onReady])

  return (
    <div
      className={styles.viewer}
      onPointerDownCapture={onPointerDown}
      onPointerUpCapture={onPointerEnd}
      onPointerCancelCapture={onPointerEnd}
    >
      <Canvas
        frameloop="demand"
        shadows="percentage"
        dpr={[1, maxDpr()]}
        camera={{ fov: 35, near: 0.02, far: 20, position: [1, 0.7, 1.4] }}
        gl={{ toneMapping: NeutralToneMapping, antialias: true }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault()
            onContextLost()
          })
        }}
      >
        <CameraRig />
        <Suspense fallback={null}>
          <Studio />
          <ChairModel config={config} attempt={attempt} multiTouch={multiTouch} onLoaded={onLoaded} />
        </Suspense>
      </Canvas>
    </div>
  )
}
