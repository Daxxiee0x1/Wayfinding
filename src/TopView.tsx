import { useCallback, useEffect, useRef, type ComponentRef } from "react"
import * as THREE from "three"
import { useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"

/** World-space rectangle of a floor: [x1, z1, x2, z2] */
export type TopBounds = [number, number, number, number]

/** Camera turn request: `n` is a counter (each new value runs once); turn `by` radians, or `to` an absolute heading
 *  (0 = north up). Positive turns the map clockwise. */
export type Spin = { n: number; by?: number; to?: number }

/** Near plane for a camera this far from the point it looks at: as far out as possible without clipping the floor
 *  (the camera never tilts below 75°, so the floor is at least ~0.25 × that distance away) */
const nearFor = (d: number) => Math.max(0.1, d * 0.03)

/** Tilt away from straight down (rad): just enough for walls to read as 3D */
const TILT = 0.35
const WALL = 4

/**
 * Peta 3D camera: starts almost top-down with the whole floor fitted into the part of the screen not covered by the UI
 * (desktop: header top-left + panel on the right; phone: top bar, floor switcher and bottom sheet), then orbits like
 * the original 3D view: drag / one finger = rotate 360° (and tilt), scroll / pinch = zoom, right-drag / two fingers =
 * pan along the floor. Panning is kept inside the floor so it cannot be lost off-screen; `reset` (a counter) brings the
 * start view back and `spin` turns it from the on-screen buttons. A long floor on a portrait screen starts turned 90°
 * when that shows it noticeably larger.
 * The near plane follows the zoom so depth stays precise: otherwise floor markings and floors z-fight (flicker) on phones.
 */
export default function TopView({
  bounds,
  reset = 0,
  spin,
  onHeading,
  /** current heading (rad): the screen angle of north, clockwise from up */
}: {
  bounds: TopBounds
  reset?: number
  spin?: Spin
  onHeading?: (a: number) => void
}) {
  const { camera, size, invalidate } = useThree()
  const ctl = useRef<ComponentRef<typeof OrbitControls>>(null)
  const [x1, z1, x2, z2] = bounds
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    const W = size.width,
      H = size.height
    const ins =
      W >= 640
        ? { t: 170, r: 344, b: 24, l: 24 }
        : { t: 64, r: 60, b: 104, l: 12 }
    const fw = Math.max(120, W - ins.l - ins.r),
      fh = Math.max(120, H - ins.t - ins.b)
    const tan = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)
    // camera distance at which `across` fits the free width and `along` (foreshortened by the tilt) the free height
    const need = (across: number, along: number) =>
      Math.max(
        ((along * Math.cos(TILT) + WALL * Math.sin(TILT)) * H) / (2 * tan * fh),
        (across * H) / (2 * tan * fw),
      ) * 1.08
    const w = x2 - x1,
      d = z2 - z1
    const upright = need(w, d),
      turned = need(d, w)
    const turn = turned < upright * 0.85
    const dist = turn ? turned : upright
    const cx = (x1 + x2) / 2,
      cz = (z1 + z2) / 2
    // north up by default (camera a little to the south); turned: east up (camera a little to the west)
    const dir = turn
      ? new THREE.Vector3(-Math.sin(TILT), Math.cos(TILT), 0)
      : new THREE.Vector3(0, Math.cos(TILT), Math.sin(TILT))
    cam.position.set(cx + dir.x * dist, dir.y * dist, cz + dir.z * dist)
    cam.up.set(0, 1, 0)
    cam.lookAt(cx, 0, cz)
    cam.near = nearFor(dist)
    cam.far = dist * 6
    // shift the image so the floor centre sits in the middle of the free area
    cam.setViewOffset(
      W,
      H,
      W / 2 - (ins.l + fw / 2),
      H / 2 - (ins.t + fh / 2),
      W,
      H,
    )
    cam.updateProjectionMatrix()
    const c = ctl.current
    if (c) {
      c.target.set(cx, 0, cz)
      c.minDistance = Math.max(6, dist * 0.15)
      c.maxDistance = dist * 1.6
      c.update()
      onHeading?.(c.getAzimuthalAngle())
    }
    invalidate()
    return () => {
      cam.clearViewOffset()
      cam.updateProjectionMatrix()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, size.width, size.height, x1, z1, x2, z2, reset, invalidate])

  // animated turn around the point being looked at (buttons / compass)
  useEffect(() => {
    const c = ctl.current
    if (!spin?.n || !c) return
    const from = c.getAzimuthalAngle()
    let delta = spin.to !== undefined ? spin.to - from : (spin.by ?? 0)
    delta = Math.atan2(Math.sin(delta), Math.cos(delta)) // shortest way round
    if (spin.by && Math.abs(Math.abs(delta) - Math.PI) < 1e-3) delta = spin.by
    const off = new THREE.Vector3(),
      sph = new THREE.Spherical()
    const t0 = performance.now(),
      dur = 380
    let raf = 0
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur),
        e = 1 - Math.pow(1 - k, 3)
      off.copy(c.object.position).sub(c.target)
      sph.setFromVector3(off)
      sph.theta = from + delta * e
      c.object.position.copy(c.target).add(off.setFromSpherical(sph))
      c.object.lookAt(c.target)
      c.update()
      invalidate()
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spin?.n])

  // keep the point being looked at inside the floor (camera moves along, so nothing jumps)
  const onChange = useCallback(() => {
    const c = ctl.current
    if (!c) return
    onHeading?.(c.getAzimuthalAngle())
    const cam = c.object as THREE.PerspectiveCamera
    const near = nearFor(cam.position.distanceTo(c.target))
    if (Math.abs(near - cam.near) > cam.near * 0.1) {
      cam.near = near
      cam.updateProjectionMatrix()
    }
    const t = c.target
    const dx = THREE.MathUtils.clamp(t.x, x1, x2) - t.x,
      dz = THREE.MathUtils.clamp(t.z, z1, z2) - t.z
    if (dx || dz) {
      t.x += dx
      t.z += dz
      c.object.position.x += dx
      c.object.position.z += dz
    }
  }, [onHeading, x1, z1, x2, z2])

  // screenSpacePanning off: panning slides along the floor instead of lifting the view
  return (
    <OrbitControls
      ref={ctl}
      makeDefault
      enableDamping
      dampingFactor={0.12}
      screenSpacePanning={false}
      maxPolarAngle={Math.PI / 2.4}
      onChange={onChange}
    />
  )
}

/**
 * The buildings never move, so the shadow map is drawn once and reused: moving the camera then costs no extra
 * shadow pass at all
 */
export function StaticShadows() {
  const { gl, invalidate } = useThree()
  useEffect(() => {
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
    invalidate()
    // a second pass once everything (instanced furniture, textures) has settled
    const id = requestAnimationFrame(() => {
      gl.shadowMap.needsUpdate = true
      invalidate()
    })
    return () => {
      cancelAnimationFrame(id)
      gl.shadowMap.autoUpdate = true
    }
  }, [gl, invalidate])
  return null
}
