import type { ThreeEvent } from '@react-three/fiber'
import type { RefObject } from 'react'
import {
  BackSide,
  BufferGeometry,
  CubicBezierCurve3,
  ExtrudeGeometry,
  LatheGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Shape,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { FINISHES, type ArmLength, type BaseShape, type PartId, type ShadeShape } from './catalog'
import type { LampConfig } from './config'
import { useLamp } from './store'

type Point = [number, number]

const STEM_X = -0.045
const BASE_HEIGHT = 0.018
const STEM_TOP = 0.34
const ARM_REACH: Record<ArmLength, number> = { short: 0.16, long: 0.24 }
const BASE_HALF_WIDTH = 0.09
const SHADE_RADIUS: Record<ShadeShape, number> = { dome: 0.092, cone: 0.09 }
const SHADE_HEIGHT = 0.105
const SHELL = 0.002
const DIFFUSER_RADIUS: Record<ShadeShape, number> = { dome: 0.088, cone: 0.08 }
const DIFFUSER_INSET = 0.012
const SHADE_TOP = STEM_TOP - 0.005

// Rounds polyline corners so LatheGeometry's averaged normals read as a real bevel, not smeared shading.
function rounded(points: Point[], radius: number, steps = 5) {
  const out = [new Vector2(...points[0])]
  for (let i = 1; i < points.length - 1; i++) {
    const a = new Vector2(...points[i - 1])
    const b = new Vector2(...points[i])
    const c = new Vector2(...points[i + 1])
    const d = Math.min(radius, a.distanceTo(b) / 2, b.distanceTo(c) / 2)
    const start = b.clone().add(a.clone().sub(b).setLength(d))
    const end = b.clone().add(c.clone().sub(b).setLength(d))
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      out.push(start.clone().multiplyScalar((1 - t) ** 2).add(b.clone().multiplyScalar(2 * t * (1 - t))).add(end.clone().multiplyScalar(t ** 2)))
    }
  }
  out.push(new Vector2(...points[points.length - 1]))
  return out
}

const lathe = (points: Vector2[], segments = 72) => new LatheGeometry(points, segments)

function domeProfile(): Point[] {
  const R = SHADE_RADIUS.dome
  const H = SHADE_HEIGHT
  const arc = (radius: number, height: number, count: number) =>
    Array.from({ length: count }, (_, i): Point => {
      const a = (i / (count - 1)) * (Math.PI / 2)
      return [radius * Math.cos(a), -H + height * Math.sin(a)]
    })
  // The inner surface sits behind the diffuser, so it gets far fewer points.
  return [[R - SHELL, -H], ...arc(R, H, 33), ...arc(R - SHELL, H - SHELL, 9).reverse()]
}

const coneProfile = (): Point[] => {
  const R = SHADE_RADIUS.cone
  const H = SHADE_HEIGHT
  return [
    [R - SHELL, -H],
    [R, -H],
    [0.03, -0.006],
    [0.02, 0],
    [0, 0],
    [0, -0.01],
    [0.028, -0.012],
    [R - SHELL, -H],
  ]
}

function squareBase() {
  const half = BASE_HALF_WIDTH * 0.94
  const bevel = 0.003
  const corner = 0.02
  const inner = half - bevel
  const shape = new Shape()
  shape.moveTo(-inner + corner, -inner)
  shape.lineTo(inner - corner, -inner)
  shape.absarc(inner - corner, -inner + corner, corner, -Math.PI / 2, 0, false)
  shape.lineTo(inner, inner - corner)
  shape.absarc(inner - corner, inner - corner, corner, 0, Math.PI / 2, false)
  shape.lineTo(-inner + corner, inner)
  shape.absarc(-inner + corner, inner - corner, corner, Math.PI / 2, Math.PI, false)
  shape.lineTo(-inner, -inner + corner)
  shape.absarc(-inner + corner, -inner + corner, corner, Math.PI, Math.PI * 1.5, false)
  const geometry = new ExtrudeGeometry(shape, {
    depth: BASE_HEIGHT - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 5,
    curveSegments: 16,
  })
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, bevel, 0)
  return geometry
}

function gooseneck(reach: number) {
  const rise = 0.095
  const curve = new CubicBezierCurve3(
    new Vector3(0, 0, 0),
    new Vector3(0, rise, 0),
    new Vector3(reach, rise, 0),
    new Vector3(reach, -0.005, 0),
  )
  return new TubeGeometry(curve, 64, 0.0065, 12, false)
}

// Built once and reused; swapping options never allocates geometry.
const BASE_GEOMETRY: Record<BaseShape, BufferGeometry> = {
  disc: lathe(rounded([[0, 0], [BASE_HALF_WIDTH, 0], [BASE_HALF_WIDTH, BASE_HEIGHT], [0, BASE_HEIGHT]], 0.003)),
  square: squareBase(),
}
const SHADE_GEOMETRY: Record<ShadeShape, BufferGeometry> = {
  dome: lathe(domeProfile().map(([r, y]) => new Vector2(r, y))),
  cone: lathe(rounded(coneProfile(), 0.004)),
}
const ARM_GEOMETRY: Record<ArmLength, BufferGeometry> = { short: gooseneck(ARM_REACH.short), long: gooseneck(ARM_REACH.long) }
const STEM_GEOMETRY = lathe(rounded([[0, 0], [0.0075, 0], [0.0075, STEM_TOP - BASE_HEIGHT], [0, STEM_TOP - BASE_HEIGHT]], 0.001), 32)
const FOOT_COLLAR = lathe(rounded([[0, 0], [0.017, 0], [0.017, 0.006], [0.0095, 0.012], [0, 0.012]], 0.002), 32)
const NECK_COLLAR = lathe(rounded([[0, -0.012], [0.0105, -0.012], [0.0105, 0.012], [0, 0.012]], 0.0015), 32)
const SHADE_COLLAR = lathe(rounded([[0, 0], [0.019, 0], [0.019, 0.012], [0.0105, 0.018], [0, 0.018]], 0.002), 32)
const DIFFUSER = lathe(rounded([[0, -0.006], [0.6, -0.005], [1, 0], [0, 0.004]], 0.05), 32)
// Light-leak trim at the shade's mouth: from above the diffuser itself is hidden.
const RIM_RING = new TorusGeometry(1, 0.014, 8, 96).rotateX(Math.PI / 2)

const fixedMaterial = new MeshStandardMaterial({ color: '#2d2c2a', metalness: 0.55, roughness: 0.42 })
export const diffuserMaterial = new MeshStandardMaterial({
  color: '#f2ece0',
  roughness: 0.7,
  emissive: '#ffcf96',
  emissiveIntensity: 0,
})

// Inverted-hull outline: back faces pushed out along normals show only at the silhouette.
const outlineMaterial = new MeshBasicMaterial({ color: '#2f4fa8', side: BackSide, toneMapped: false })
outlineMaterial.onBeforeCompile = (shader) => {
  shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * 0.0028;')
}

const outlineHulls = new Map<BufferGeometry, BufferGeometry>()

// Welded and re-smoothed so hard-edged geometry does not crack open when inflated.
function outlineHull(geometry: BufferGeometry) {
  let hull = outlineHulls.get(geometry)
  if (!hull) {
    const copy = geometry.clone()
    copy.deleteAttribute('normal')
    copy.deleteAttribute('uv')
    hull = mergeVertices(copy, 1e-5)
    hull.computeVertexNormals()
    outlineHulls.set(geometry, hull)
  }
  return hull
}

const armEnd = (arm: ArmLength) => STEM_X + ARM_REACH[arm]

export function lampBounds(arm: ArmLength) {
  const minX = -BASE_HALF_WIDTH
  const maxX = armEnd(arm) + SHADE_RADIUS.dome
  const height = STEM_TOP + 0.08
  const depth = BASE_HALF_WIDTH * 2
  const width = maxX - minX
  return {
    center: new Vector3((minX + maxX) / 2, height / 2, 0),
    radius: Math.sqrt(width ** 2 + height ** 2 + depth ** 2) / 2,
  }
}

export const shadeRim = (arm: ArmLength) => new Vector3(armEnd(arm), SHADE_TOP - SHADE_HEIGHT, 0)

type PartProps = {
  id: PartId
  geometry: BufferGeometry
  position?: [number, number, number]
  multiTouch: RefObject<boolean>
}

function Part({ id, geometry, position, multiTouch }: PartProps) {
  const { finish, color } = useLamp((s) => s.config.finishes[id])
  const outlined = useLamp((s) => s.outlineVisible && s.selectedPart === id)
  const selectPart = useLamp((s) => s.selectPart)
  const recipe = FINISHES[finish]

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (event.delta <= 6 && !multiTouch.current) selectPart(id)
  }

  return (
    <mesh
      geometry={geometry}
      position={position}
      castShadow
      receiveShadow
      onClick={onClick}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <meshStandardMaterial color={recipe.colors[color]} metalness={recipe.metalness} roughness={recipe.roughness} />
      {outlined && <mesh geometry={outlineHull(geometry)} material={outlineMaterial} />}
    </mesh>
  )
}

export function ProceduralLamp({ config, multiTouch }: { config: LampConfig; multiTouch: RefObject<boolean> }) {
  const shadeX = armEnd(config.arm)
  const diffuser = DIFFUSER_RADIUS[config.shade]
  const rimRadius = SHADE_RADIUS[config.shade] - SHELL / 2
  const shared = { multiTouch }

  return (
    <group>
      <Part id="base" geometry={BASE_GEOMETRY[config.base]} {...shared} />
      <Part id="stem" geometry={STEM_GEOMETRY} position={[STEM_X, BASE_HEIGHT, 0]} {...shared} />
      <Part id="arm" geometry={ARM_GEOMETRY[config.arm]} position={[STEM_X, STEM_TOP, 0]} {...shared} />
      <Part id="shade" geometry={SHADE_GEOMETRY[config.shade]} position={[shadeX, SHADE_TOP, 0]} {...shared} />

      <mesh geometry={FOOT_COLLAR} material={fixedMaterial} position={[STEM_X, BASE_HEIGHT, 0]} castShadow />
      <mesh geometry={NECK_COLLAR} material={fixedMaterial} position={[STEM_X, STEM_TOP, 0]} castShadow />
      <mesh geometry={SHADE_COLLAR} material={fixedMaterial} position={[shadeX, SHADE_TOP - 0.002, 0]} castShadow />
      <mesh
        geometry={DIFFUSER}
        material={diffuserMaterial}
        position={[shadeX, SHADE_TOP - SHADE_HEIGHT + DIFFUSER_INSET, 0]}
        scale={[diffuser, 1, diffuser]}
      />
      <mesh geometry={RIM_RING} material={diffuserMaterial} position={[shadeX, SHADE_TOP - SHADE_HEIGHT, 0]} scale={rimRadius} />
    </group>
  )
}
