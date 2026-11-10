import { BackSide, Mesh, MeshBasicMaterial, type BufferGeometry } from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

const OUTLINE_WIDTH = 0.0028 // metres in world space
const hulls = new Map<BufferGeometry, BufferGeometry>()
const materials = new Map<string, MeshBasicMaterial>()

// Welded and re-smoothed so hard-edged geometry does not crack open when inflated.
function hullGeometry(geometry: BufferGeometry) {
  let hull = hulls.get(geometry)
  if (!hull) {
    const copy = geometry.clone()
    for (const name of Object.keys(copy.attributes)) if (name !== 'position') copy.deleteAttribute(name)
    hull = mergeVertices(copy, 1e-4)
    hull.computeVertexNormals()
    hulls.set(geometry, hull)
  }
  return hull
}

// Inverted hull: back faces pushed out along normals show only at the silhouette.
function hullMaterial(localOffset: number) {
  const key = localOffset.toFixed(6)
  let material = materials.get(key)
  if (!material) {
    material = new MeshBasicMaterial({ color: '#2f4fa8', side: BackSide, toneMapped: false })
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normal * ${key};`)
    }
    material.customProgramCacheKey = () => key
    materials.set(key, material)
  }
  return material
}

// The hull is a child of the mesh, so its offset is in the mesh's (possibly quantized and scaled) local space.
export function outlineFor(mesh: Mesh) {
  const hull = new Mesh(hullGeometry(mesh.geometry), hullMaterial(OUTLINE_WIDTH / mesh.getWorldScale(mesh.position.clone()).x))
  hull.raycast = () => {}
  return hull
}
