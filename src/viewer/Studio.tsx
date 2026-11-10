import { Environment, Lightformer } from '@react-three/drei'
import { memo } from 'react'
import { LatheGeometry, MeshStandardMaterial, Vector2 } from 'three'

const FLOOR_RADIUS = 1.8
const CURVE = 0.8
const sweepPoints = [
  new Vector2(FLOOR_RADIUS + CURVE, 4),
  ...Array.from({ length: 25 }, (_, i) => {
    const a = (i / 24) * (Math.PI / 2)
    return new Vector2(FLOOR_RADIUS + CURVE * Math.cos(a), CURVE - CURVE * Math.sin(a))
  }),
  new Vector2(0, 0),
]
const sweepGeometry = new LatheGeometry(sweepPoints, 64)
const sweepMaterial = new MeshStandardMaterial({ color: '#dedcd5', roughness: 1 })

// Memoized because drei's Environment resets scene.environmentIntensity whenever it re-renders.
const StudioEnvironment = memo(function StudioEnvironment() {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={['#c2c1bc']} />
      <Lightformer form="rect" intensity={2.4} color="#fffaf2" position={[0, 3, 0.6]} rotation-x={Math.PI / 2} scale={[4, 3, 1]} />
      <Lightformer form="rect" intensity={3} color="#ffffff" position={[-3, 1.2, 1]} rotation-y={Math.PI / 2} scale={[1, 3.5, 1]} />
      <Lightformer form="rect" intensity={1.6} color="#f2f5ff" position={[3, 0.9, -0.6]} rotation-y={-Math.PI / 2} scale={[0.5, 3.5, 1]} />
    </Environment>
  )
})

export function Studio() {
  return (
    <>
      <StudioEnvironment />
      <directionalLight
        position={[-0.5, 2.2, 1.1]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-0.8}
        shadow-camera-right={0.8}
        shadow-camera-top={0.8}
        shadow-camera-bottom={-0.8}
        shadow-camera-near={0.5}
        shadow-camera-far={4}
        shadow-bias={-0.0004}
        shadow-normalBias={0.004}
        shadow-radius={8}
      />
      <mesh geometry={sweepGeometry} material={sweepMaterial} receiveShadow />
    </>
  )
}
