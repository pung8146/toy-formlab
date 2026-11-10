import { Environment, Lightformer } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { memo, useEffect, useRef, useState } from 'react'
import {
  AdditiveBlending,
  CanvasTexture,
  LatheGeometry,
  MeshStandardMaterial,
  Object3D,
  SpriteMaterial,
  SRGBColorSpace,
  Vector2,
  type DirectionalLight,
  type HemisphereLight,
  type SpotLight,
} from 'three'
import { diffuserMaterial, shadeRim } from '../product/lamp/ProceduralLamp'
import { useLamp } from '../product/lamp/store'
import { prefersReducedMotion } from './motion'

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

function haloTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const context = canvas.getContext('2d')!
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128)
  gradient.addColorStop(0, 'rgba(255,214,160,1)')
  gradient.addColorStop(0.3, 'rgba(255,190,125,0.32)')
  gradient.addColorStop(0.65, 'rgba(255,170,100,0.06)')
  gradient.addColorStop(1, 'rgba(255,170,100,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 256, 256)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

const haloMaterial = new SpriteMaterial({
  map: haloTexture(),
  blending: AdditiveBlending,
  depthWrite: false,
  transparent: true,
  opacity: 0,
  toneMapped: false,
})

const TRANSITION_SECONDS = 0.4
const ENV_DAY = 0.95
const ENV_NIGHT = 0.14
const KEY_DAY = 1.15
const SPOT = 0.3
const BOUNCE = 0.3
const EMISSIVE = 3.4
const HALO = 0.42

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
  const lit = useLamp((s) => s.lit)
  const arm = useLamp((s) => s.config.arm)
  const scene = useThree((s) => s.scene)
  const invalidate = useThree((s) => s.invalidate)
  const key = useRef<DirectionalLight>(null)
  const spot = useRef<SpotLight>(null)
  const bounce = useRef<HemisphereLight>(null)
  const amount = useRef(lit ? 1 : 0)
  const [spotTarget] = useState(() => new Object3D())
  const rim = shadeRim(arm)

  const apply = (t: number) => {
    scene.environmentIntensity = ENV_DAY + (ENV_NIGHT - ENV_DAY) * t
    key.current!.intensity = KEY_DAY * (1 - t)
    spot.current!.intensity = SPOT * t
    bounce.current!.intensity = BOUNCE * t
    diffuserMaterial.emissiveIntensity = EMISSIVE * t
    haloMaterial.opacity = HALO * t
  }

  useEffect(() => {
    apply(amount.current)
    invalidate()
    // apply reads only stable refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lit, invalidate])

  useFrame((_, delta) => {
    const target = lit ? 1 : 0
    if (amount.current === target) return
    // Demand mode reports the whole idle gap as the first delta.
    const step = prefersReducedMotion() ? 1 : Math.min(delta, 1 / 30) / TRANSITION_SECONDS
    amount.current = target > amount.current ? Math.min(target, amount.current + step) : Math.max(target, amount.current - step)
    apply(amount.current)
    invalidate()
  })

  return (
    <>
      <StudioEnvironment />

      <directionalLight
        ref={key}
        position={[-0.3, 1.7, 0.55]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-0.7}
        shadow-camera-right={0.7}
        shadow-camera-top={0.7}
        shadow-camera-bottom={-0.7}
        shadow-camera-near={0.3}
        shadow-camera-far={4}
        shadow-bias={-0.0003}
        shadow-normalBias={0.003}
        shadow-radius={9}
      />
      <spotLight
        ref={spot}
        position={[rim.x, rim.y - 0.004, 0]}
        target={spotTarget}
        angle={1.2}
        penumbra={1}
        decay={2}
        color="#ffd9ae"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.02}
        shadow-camera-far={3}
        shadow-bias={-0.0004}
        shadow-normalBias={0.003}
        shadow-radius={2.5}
      />
      <primitive object={spotTarget} position={[rim.x, 0, 0]} />
      <hemisphereLight ref={bounce} args={['#000000', '#ffb878']} />
      <sprite material={haloMaterial} position={[rim.x, rim.y - 0.006, 0]} scale={[0.44, 0.26, 1]} />

      <mesh geometry={sweepGeometry} material={sweepMaterial} receiveShadow />
    </>
  )
}
