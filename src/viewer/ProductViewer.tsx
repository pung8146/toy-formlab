import { Canvas } from '@react-three/fiber'
import { useRef, type PointerEvent } from 'react'
import { NeutralToneMapping } from 'three'
import { ProceduralLamp } from '../product/lamp/ProceduralLamp'
import { useLamp } from '../product/lamp/store'
import { CameraRig } from './CameraControls'
import { Studio } from './Studio'
import styles from './ProductViewer.module.css'

const maxDpr = () => (window.matchMedia('(pointer: coarse)').matches ? 1.5 : 2)

type ProductViewerProps = { onReady: () => void; onContextLost: () => void }

export default function ProductViewer({ onReady, onContextLost }: ProductViewerProps) {
  const config = useLamp((s) => s.config)
  const pointers = useRef(new Set<number>())
  const multiTouch = useRef(false)

  const onPointerDown = (event: PointerEvent) => {
    if (pointers.current.size === 0) multiTouch.current = false
    pointers.current.add(event.pointerId)
    if (pointers.current.size > 1) multiTouch.current = true
  }
  const onPointerEnd = (event: PointerEvent) => pointers.current.delete(event.pointerId)

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
        camera={{ fov: 35, near: 0.02, far: 20, position: [0.6, 0.5, 1] }}
        gl={{ toneMapping: NeutralToneMapping, antialias: true }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault()
            onContextLost()
          })
          // two frames so the poster stays up until the lamp has actually been drawn
          requestAnimationFrame(() => requestAnimationFrame(onReady))
        }}
      >
        <Studio />
        <ProceduralLamp config={config} multiTouch={multiTouch} />
        <CameraRig />
      </Canvas>
    </div>
  )
}
