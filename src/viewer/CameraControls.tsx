import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { MathUtils, Spherical, Vector3, type PerspectiveCamera } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { lampBounds } from '../product/lamp/ProceduralLamp'
import { useLamp, type CameraPresetId } from '../product/lamp/store'
import { prefersReducedMotion } from './motion'

const MIN_POLAR = 0.22
const MAX_POLAR = 1.52
const TRANSITION_SECONDS = 0.3
const VIEWS: Record<CameraPresetId, { theta: number; phi: number }> = {
  default: { theta: 0.62, phi: 1.3 },
  front: { theta: 0, phi: 1.5 },
  side: { theta: Math.PI / 2, phi: 1.5 },
  top: { theta: 0, phi: MIN_POLAR },
}

type Pose = { theta: number; phi: number; radius: number; center: Vector3 }
type Tween = { from: Pose; to: Pose; elapsed: number }

export function CameraRig() {
  const arm = useLamp((s) => s.config.arm)
  const command = useLamp((s) => s.cameraCommand)
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const aspect = useThree((s) => s.size.width / s.size.height)
  const invalidate = useThree((s) => s.invalidate)
  const controls = useRef<OrbitControlsImpl>(null)
  const tween = useRef<Tween | null>(null)

  const { center, radius: boundRadius } = useMemo(() => lampBounds(arm), [arm])
  const halfVertical = MathUtils.degToRad(camera.fov / 2)
  const halfHorizontal = Math.atan(Math.tan(halfVertical) * aspect)
  const fit = (boundRadius / Math.sin(Math.min(halfVertical, halfHorizontal))) * 1.15

  const apply = (pose: Pose) => {
    const orbit = controls.current!
    orbit.target.copy(pose.center)
    camera.position.setFromSpherical(new Spherical(pose.radius, pose.phi, pose.theta)).add(pose.center)
    orbit.update()
    invalidate()
  }

  const current = (): Pose => {
    const orbit = controls.current!
    const s = new Spherical().setFromVector3(camera.position.clone().sub(orbit.target))
    return { theta: s.theta, phi: s.phi, radius: s.radius, center: orbit.target.clone() }
  }

  const moveTo = (to: Pose) => {
    if (prefersReducedMotion()) {
      tween.current = null
      apply(to)
      return
    }
    tween.current = { from: current(), to, elapsed: 0 }
    invalidate()
  }

  const initialized = useRef(false)
  useLayoutEffect(() => {
    if (initialized.current) return
    initialized.current = true
    apply({ ...VIEWS.default, radius: fit, center })
    // first frame only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const orbit = controls.current!
    const stop = () => {
      tween.current = null
    }
    orbit.addEventListener('start', stop)
    return () => orbit.removeEventListener('start', stop)
  }, [])

  // Keep the viewer's chosen angle; only pull back if the new arm or window no longer fits.
  useEffect(() => {
    const now = current()
    if (now.center.distanceTo(center) > 1e-4 || now.radius < fit) {
      moveTo({ ...now, center, radius: Math.max(now.radius, fit) })
    }
    // driven by center and fit only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, fit])

  useEffect(() => {
    if (!command) return
    const now = current()
    if (command.type === 'preset') moveTo({ ...VIEWS[command.id], radius: fit, center })
    if (command.type === 'rotate') moveTo({ ...now, theta: now.theta + command.delta })
    if (command.type === 'tilt') moveTo({ ...now, phi: MathUtils.clamp(now.phi + command.delta, MIN_POLAR, MAX_POLAR) })
    if (command.type === 'zoom') moveTo({ ...now, radius: MathUtils.clamp(now.radius * command.factor, fit * 0.5, fit * 1.6) })
    // a new command object is the trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command])

  useFrame((_, delta) => {
    const active = tween.current
    if (!active) return
    active.elapsed += Math.min(delta, 1 / 30)
    const t = Math.min(active.elapsed / TRANSITION_SECONDS, 1)
    const eased = t * t * (3 - 2 * t)
    const { from, to } = active
    const turn = Math.atan2(Math.sin(to.theta - from.theta), Math.cos(to.theta - from.theta))
    apply({
      theta: from.theta + turn * eased,
      phi: MathUtils.lerp(from.phi, to.phi, eased),
      radius: MathUtils.lerp(from.radius, to.radius, eased),
      center: from.center.clone().lerp(to.center, eased),
    })
    if (t === 1) tween.current = null
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping={!prefersReducedMotion()}
      dampingFactor={0.12}
      minDistance={fit * 0.5}
      maxDistance={fit * 1.6}
      minPolarAngle={MIN_POLAR}
      maxPolarAngle={MAX_POLAR}
    />
  )
}
