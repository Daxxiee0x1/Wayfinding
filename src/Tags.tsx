import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

/**
 * Lightweight replacement for drei <Html>: 3D anchors register their DOM content in a
 * shared store, and a single DOM layer outside the Canvas renders it. This avoids drei
 * creating/unmounting a separate React root per label (which triggers React warnings).
 */
type Entry = {
  id: number
  obj: THREE.Object3D
  node: ReactNode
  distanceFactor?: number
  style?: CSSProperties
  hidden?: boolean
}

/**
 * Whether labels inside this subtree are shown (a provider can hide a whole scene's labels; `keep` overrides it).
 */
export const TagScope = createContext(true)
const entries = new Map<number, Entry>()
const els = new Map<number, HTMLDivElement>()
const listeners = new Set<() => void>()
let version = 0
let seq = 0
const emit = () => {
  version++
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
/** The Canvas renders on demand: new / changed labels ask it for a frame so they get positioned */
let requestFrame: (() => void) | null = null

export function Tag({
  position,
  children,
  distanceFactor,
  style,
  keep,
}: {
  position: [number, number, number]
  children: ReactNode
  distanceFactor?: number
  style?: CSSProperties
  keep?: boolean
}) {
  const visible = useContext(TagScope) || !!keep
  const ref = useRef<THREE.Group>(null)
  const id = useMemo(() => ++seq, [])
  useLayoutEffect(() => {
    entries.set(id, {
      id,
      obj: ref.current!,
      node: children,
      distanceFactor,
      style,
      hidden: !visible,
    })
    emit()
  })
  useLayoutEffect(
    () => () => {
      entries.delete(id)
      emit()
    },
    [id],
  )
  return <group ref={ref} position={position} />
}

const v = new THREE.Vector3()
/** Scenes of the Canvases that are currently mounted */
const liveScenes = new Set<THREE.Object3D>()
const rootOf = (o: THREE.Object3D) => {
  while (o.parent) o = o.parent
  return o
}

export function TagProjector() {
  const { camera, size, invalidate, scene } = useThree()
  useEffect(() => {
    requestFrame = invalidate
    liveScenes.add(scene)
    const off = subscribe(invalidate)
    return () => {
      off()
      liveScenes.delete(scene)
      if (requestFrame === invalidate) requestFrame = null
    }
  }, [invalidate, scene])
  useFrame(() => {
    // use this frame's camera (OrbitControls updates it earlier in the frame; matrices are otherwise stale until render)
    camera.updateMatrixWorld()
    const cam = camera as THREE.PerspectiveCamera & THREE.OrthographicCamera
    const ortho = cam.isOrthographicCamera
    const k = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov || 45) / 2)
    let stale = false
    for (const e of entries.values()) {
      const el = els.get(e.id)
      if (!el) continue
      // Only labels of this scene are placed with this camera. A label whose scene is gone (e.g. the previous floor
      // left behind after switching / a hot reload) is dropped instead of floating over the new floor.
      const root = rootOf(e.obj)
      if (root !== scene) {
        if (!liveScenes.has(root)) {
          entries.delete(e.id)
          el.style.display = "none"
          stale = true
        }
        continue
      }
      e.obj.getWorldPosition(v)
      const dist = v.distanceTo(camera.position)
      v.project(camera)
      if (v.z > 1 || v.z < -1) {
        el.style.display = "none"
        continue
      }
      el.style.display = ""
      const x = ((v.x + 1) / 2) * size.width
      const y = ((1 - v.y) / 2) * size.height
      const s = !e.distanceFactor
        ? 1
        : ortho
          ? THREE.MathUtils.clamp(
              (e.distanceFactor * cam.zoom) / 900,
              0.45,
              1.2,
            )
          : e.distanceFactor / (k * dist)
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${s.toFixed(3)})`
      el.style.zIndex = String(Math.round((1 - v.z) * 1000))
    }
    if (stale) emit()
  })
  return null
}

export function TagLayer() {
  useSyncExternalStore(subscribe, () => version)
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      style={{ isolation: "isolate" }}
    >
      {[...entries.values()]
        .filter((e) => !e.hidden)
        .map((e) => (
          <div
            key={e.id}
            ref={(el) => {
              if (el) {
                els.set(e.id, el)
                requestFrame?.()
              } else els.delete(e.id)
            }}
            className="absolute left-0 top-0"
            style={{
              display: "none",
              willChange: "transform",
              pointerEvents: "auto",
              ...e.style,
            }}
          >
            {e.node}
          </div>
        ))}
    </div>
  )
}
