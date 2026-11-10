import { useGLTF } from '@react-three/drei'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, type RefObject } from 'react'
import { Mesh, Vector3, type MeshPhysicalMaterial, type MeshStandardMaterial } from 'three'
import { outlineFor } from '../../viewer/outline'
import { OPTIONS, type PartId } from './catalog'
import type { ChairConfig } from './config'
import { useChair } from './store'

export const MODEL_URL = `${import.meta.env.BASE_URL}models/chair.glb`

// shortcut: measured once from the source model's accessor bounds; recompute if the model changes.
export const CHAIR_BOUNDS = { center: new Vector3(0, 0.343, 0.009), radius: 0.61 }

const PART_BY_MESH: Record<string, PartId> = {
  SheenChair_fabric: 'fabric',
  SheenChair_wood: 'frame',
  SheenChair_metal: 'hardware',
}

useGLTF.preload(MODEL_URL, false)

type ChairModelProps = {
  config: ChairConfig
  attempt: number
  multiTouch: RefObject<boolean>
  onLoaded: () => void
}

export function ChairModel({ config, attempt, multiTouch, onLoaded }: ChairModelProps) {
  // A retry needs a fresh cache key, otherwise the cached rejection is replayed.
  // Meshopt is decoded locally; Draco stays off so no decoder is fetched from a CDN.
  const { scene } = useGLTF(attempt ? `${MODEL_URL}?retry=${attempt}` : MODEL_URL, false)
  const invalidate = useThree((s) => s.invalidate)
  const gl = useThree((s) => s.gl)
  const selectPart = useChair((s) => s.selectPart)
  const selected = useChair((s) => (s.outlineVisible ? s.selectedPart : null))

  // Owned clones: the loader's cached materials are never mutated.
  const { root, meshes } = useMemo(() => {
    const root = scene.clone(true)
    const meshes = {} as Record<PartId, Mesh>
    root.traverse((object) => {
      object.castShadow = object.receiveShadow = true
      const part = PART_BY_MESH[object.name]
      if (part && object instanceof Mesh) {
        object.material = object.material.clone()
        object.userData.part = part
        meshes[part] = object
      }
    })
    return { root, meshes }
  }, [scene])

  useLayoutEffect(() => {
    const fabric = OPTIONS.fabric[config.fabric]
    const fabricMaterial = meshes.fabric.material as MeshPhysicalMaterial
    fabricMaterial.color.set(fabric.color)
    fabricMaterial.sheenColor.set(fabric.sheen)
    ;(meshes.frame.material as MeshStandardMaterial).color.set(OPTIONS.frame[config.frame].color)
    const hardware = OPTIONS.hardware[config.hardware]
    const hardwareMaterial = meshes.hardware.material as MeshStandardMaterial
    hardwareMaterial.color.set(hardware.color)
    hardwareMaterial.metalness = hardware.metalness
    hardwareMaterial.roughness = hardware.roughness
    invalidate()
  }, [config, meshes, invalidate])

  useEffect(() => {
    if (!selected) return
    const mesh = meshes[selected]
    const hull = outlineFor(mesh)
    mesh.add(hull)
    invalidate()
    return () => {
      mesh.remove(hull)
      invalidate()
    }
  }, [selected, meshes, invalidate])

  // The silhouette never changes (only colors and the camera do), so the shadow map is baked once.
  useLayoutEffect(() => {
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
    invalidate()
  }, [root, gl, invalidate])

  useEffect(onLoaded, [onLoaded])

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    const part = event.object.userData.part as PartId | undefined
    if (part && event.delta <= 6 && !multiTouch.current) selectPart(part)
  }

  return (
    <primitive
      object={root}
      onClick={onClick}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => (document.body.style.cursor = event.object.userData.part ? 'pointer' : '')}
      onPointerOut={() => (document.body.style.cursor = '')}
    />
  )
}
