import { Suspense, useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { ContactShadows, Environment, Lightformer } from "@react-three/drei"
import { TagLayer, TagProjector } from "./Tags"
import { LOW, Q } from "./quality"
import { RouteLine, YouAreHere } from "./RouteMarkers"
import type { Floor, FloorNav, Pt } from "./Wayfinding"
import OutdoorScene from "./Outdoor"
import { OUT_H, OUT_W } from "./OutdoorData"
import BasementScene from "./Basement"
import { B_H, B_W } from "./BasementData"
import { F4_H, F4_W } from "./Floor4Data"
import { LB_BOUNDS } from "./LobbyData"
import {
  Core,
  Escalator,
  GlassDoor,
  Lift,
  S,
  Sign,
  Stairs,
  WALL_H,
  WALL_T,
  Wall,
  ZoneSign,
  steel,
  sz,
  useHoverProps,
  useTex,
  wx,
  wz,
  type Ctx,
} from "./Building3D"
import Floor4Scene from "./Floor4"
import LobbyScene from "./Lobby"
import TopView, { StaticShadows, type Spin, type TopBounds } from "./TopView"
import { SIGN } from "./palette"

/**
 * The whole 3D map (three.js, R3F, drei and every procedural scene) lives in this lazily loaded chunk, so the start
 * screen and the 2D plan never wait for it. There are no downloaded models or textures: the time goes into fetching
 * this chunk, building the procedural geometry/materials and compiling shaders for the first frame, and each of those
 * stages is reported to the loading overlay as it really happens.
 */
export type Stage = "module" | "scene" | "frame" | "ready"

/** Long partition (design x=232) made of wall segments with 4 glass doors */
function DoorWall({ ctx }: { ctx: Ctx }) {
  const x = wx(237),
    z0 = wz(40),
    z1 = wz(587)
  const door = 2.4
  const centers = [0.15, 0.38, 0.62, 0.85].map((f) => z0 + (z1 - z0) * f)
  const pts = [z0, ...centers.flatMap((c) => [c - door / 2, c + door / 2]), z1]
  return (
    <group>
      {Array.from({ length: 5 }).map((_, i) => {
        const a = pts[i * 2],
          b = pts[i * 2 + 1]
        return (
          <mesh
            key={i}
            position={[x, WALL_H / 2, (a + b) / 2]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[WALL_T, WALL_H, b - a]} />
            <meshStandardMaterial
              map={useTex().wallMarble}
              roughness={0.2}
              metalness={0.2}
            />
          </mesh>
        )
      })}
      {centers.map((c, i) => (
        <GlassDoor
          key={i}
          x={x}
          z0={c - door / 2}
          z1={c + door / 2}
          id={"dw" + i}
          ctx={ctx}
        />
      ))}
    </group>
  )
}

function Cafe({
  x,
  y,
  w,
  h,
  id,
  ctx,
}: {
  x: number
  y: number
  w: number
  h: number
  id: string
  ctx: Ctx
}) {
  const W = sz(w),
    D = sz(h)
  const hl = ctx.hover === id || ctx.focus === "cafe"
  return (
    <group
      position={[wx(x + w / 2), 0, wz(y + h / 2)]}
      {...useHoverProps(id, ctx)}
    >
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, 1.1, D]} />
        <meshStandardMaterial
          color={hl ? "#a87650" : "#7a5236"}
          roughness={0.6}
        />
      </mesh>
      <mesh position={[0, 1.13, 0]} castShadow>
        <boxGeometry args={[W + 0.1, 0.06, D + 0.1]} />
        <meshStandardMaterial color="#efe6da" roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.4, -D / 4]} castShadow>
        <boxGeometry args={[0.6, 0.5, 0.5]} />
        <meshStandardMaterial color="#222" metalness={0.7} />
      </mesh>
      {/* stools */}
      {[-0.6, 0.6].map((dx) => (
        <group key={dx} position={[W / 2 + 0.7, 0, dx]}>
          <mesh position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.8]} />
            <meshStandardMaterial {...steel} />
          </mesh>
          <mesh position={[0, 0.82, 0]} castShadow>
            <cylinderGeometry args={[0.25, 0.25, 0.08, 20]} />
            <meshStandardMaterial color="#5c3c27" />
          </mesh>
        </group>
      ))}
      <Sign kind="cafe" y={2.6} id={id} ctx={ctx} text="Kaw Kaw Coffee" />
    </group>
  )
}

let bankSign: THREE.Texture | null = null
function BANK_SIGN() {
  if (bankSign) return bankSign
  const c = document.createElement("canvas")
  c.width = 768
  c.height = 128
  const g = c.getContext("2d")!
  g.fillStyle = "#ffffff"
  g.beginPath()
  g.arc(64, 64, 46, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = "#1f9d47"
  g.lineWidth = 7
  g.beginPath()
  g.moveTo(36, 54)
  g.lineTo(64, 36)
  g.lineTo(92, 54)
  g.closePath()
  g.stroke()
  g.beginPath()
  g.moveTo(44, 58)
  g.lineTo(44, 86)
  g.moveTo(84, 58)
  g.lineTo(84, 86)
  g.moveTo(34, 92)
  g.lineTo(94, 92)
  g.stroke()
  g.fillStyle = "#ffffff"
  g.font = "800 64px system-ui, sans-serif"
  g.textBaseline = "middle"
  g.fillText("BANK SENTOSA", 130, 68)
  bankSign = new THREE.CanvasTexture(c)
  bankSign.colorSpace = THREE.SRGBColorSpace
  return bankSign
}

/** Bank Sentosa teller area: branded backdrop, counter with glass screens, teller chairs, queue stanchions */
function Bank({
  x,
  y,
  w,
  h,
  id,
  ctx,
}: {
  x: number
  y: number
  w: number
  h: number
  id: string
  ctx: Ctx
}) {
  const W = sz(w),
    D = sz(h)
  const hl = ctx.hover === id || ctx.focus === "bank"
  const tellers = [-1.8, 0, 1.8]
  return (
    <group
      position={[wx(x + w / 2), 0, wz(y + h / 2)]}
      {...useHoverProps(id, ctx)}
    >
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[W, 0.04, D]} />
        <meshStandardMaterial color="#d9c9a8" roughness={0.6} />
      </mesh>
      {/* backdrop */}
      <mesh position={[0, 1.6, D / 2 - 0.1]} castShadow>
        <boxGeometry args={[W, 3.2, 0.2]} />
        <meshStandardMaterial
          color={hl ? "#34d36a" : "#1f9d47"}
          roughness={0.5}
        />
      </mesh>
      <mesh position={[0, 2.6, D / 2 - 0.205]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[3.6, 0.6]} />
        <meshStandardMaterial
          map={BANK_SIGN()}
          transparent
          emissive="#ffffff"
          emissiveMap={BANK_SIGN()}
          emissiveIntensity={0.4}
        />
      </mesh>
      {/* counter */}
      <mesh position={[0, 0.55, 0.25]} castShadow receiveShadow>
        <boxGeometry args={[W - 0.3, 1.1, 0.7]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.13, 0.25]} castShadow>
        <boxGeometry args={[W - 0.2, 0.06, 0.8]} />
        <meshStandardMaterial color="#3b3b3b" roughness={0.2} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.5, -0.11]}>
        <boxGeometry args={[W - 0.3, 0.12, 0.02]} />
        <meshStandardMaterial
          color="#1fae4b"
          emissive="#1fae4b"
          emissiveIntensity={0.6}
        />
      </mesh>
      {/* glass screens */}
      <mesh position={[0, 1.6, 0.25]}>
        <boxGeometry args={[W - 0.3, 0.9, 0.03]} />
        <meshPhysicalMaterial
          color="#d7f0ff"
          transparent
          opacity={0.3}
          roughness={0.05}
        />
      </mesh>
      {tellers.map((dx, i) => (
        <group key={i} position={[dx, 0, 0]}>
          <mesh position={[0, 1.5, 0.75]}>
            <boxGeometry args={[0.5, 0.35, 0.03]} />
            <meshStandardMaterial
              color="#111"
              emissive="#334155"
              emissiveIntensity={0.4}
            />
          </mesh>
          <mesh position={[0, 1.32, 0.78]}>
            <boxGeometry args={[0.05, 0.2, 0.05]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          {/* teller number */}
          <mesh position={[0, 2.15, 0.23]}>
            <boxGeometry args={[0.5, 0.25, 0.04]} />
            <meshStandardMaterial
              color="#111"
              emissive="#ef4444"
              emissiveIntensity={0.9}
            />
          </mesh>
          {/* chair */}
          <mesh position={[0, 0.55, 0.95]} castShadow>
            <boxGeometry args={[0.45, 0.08, 0.45]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
          <mesh position={[0, 0.9, 1.15]} castShadow>
            <boxGeometry args={[0.45, 0.6, 0.06]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
          <mesh position={[0, 0.27, 0.95]}>
            <cylinderGeometry args={[0.03, 0.03, 0.5]} />
            <meshStandardMaterial {...steel} />
          </mesh>
          {/* customer stool */}
          <mesh position={[0, 0.45, -0.5]} castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.08, 20]} />
            <meshStandardMaterial color="#1f9d47" />
          </mesh>
          <mesh position={[0, 0.22, -0.5]}>
            <cylinderGeometry args={[0.03, 0.03, 0.44]} />
            <meshStandardMaterial {...steel} />
          </mesh>
        </group>
      ))}
      {/* queue stanchions */}
      {[-2.4, -1.2, 0, 1.2, 2.4].map((dx) => (
        <group key={dx} position={[dx, 0, -1.9]}>
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.9]} />
            <meshStandardMaterial {...steel} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.04, 20]} />
            <meshStandardMaterial {...steel} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.85, -1.9]}>
        <boxGeometry args={[4.8, 0.05, 0.02]} />
        <meshStandardMaterial color="#b91c1c" />
      </mesh>
      <Sign kind="bank" y={4.2} id={id} ctx={ctx} text="Bank Sentosa" />
    </group>
  )
}

// Building outline (design px). Everything behind the walls is outside the model.
const OUTLINE: [number, number][] = [
  [0, 0],
  [578, 0],
  [578, 108],
  [628, 108],
  [628, 136],
  [1011, 136],
  [1011, 108],
  [1062, 108],
  [1062, 305],
  [1200, 305],
  [1200, 368],
  [1066, 368],
  [1066, 500],
  [1011, 500],
  [1011, 466],
  [628, 466],
  [628, 500],
  [578, 500],
  [578, 645],
  [0, 645],
]
// Outer frame edges get a low curb instead of a full wall
const isFrame = (a: [number, number], b: [number, number]) =>
  (a[0] === 0 && b[0] === 0) ||
  (a[1] === 0 && b[1] === 0) ||
  (a[1] === 645 && b[1] === 645) ||
  (a[0] === 1200 && b[0] === 1200)

function FloorSlab() {
  const tex = useTex()
  const geo = useMemo(() => {
    const s = new THREE.Shape()
    OUTLINE.forEach(([x, y], i) =>
      i ? s.lineTo(wx(x), -wz(y)) : s.moveTo(wx(x), -wz(y)),
    )
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: false })
    const pos = g.attributes.position,
      uv = g.attributes.uv
    for (let i = 0; i < pos.count; i++)
      uv.setXY(i, pos.getX(i) / 4, pos.getY(i) / 4)
    return g
  }, [])
  const t = useMemo(() => {
    const c = tex.floor.clone()
    c.repeat.set(1, 1)
    c.needsUpdate = true
    return c
  }, [tex])
  return (
    <mesh
      geometry={geo}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.5, 0]}
      receiveShadow
    >
      <meshStandardMaterial map={t} roughness={0.18} metalness={0.2} />
    </mesh>
  )
}

function OutlineWalls() {
  return (
    <>
      {OUTLINE.map((p, i) => {
        const q = OUTLINE[(i + 1) % OUTLINE.length]
        return (
          <Wall
            key={i}
            x1={p[0]}
            y1={p[1]}
            x2={q[0]}
            y2={q[1]}
            h={isFrame(p, q) ? 0.25 : WALL_H}
          />
        )
      })}
    </>
  )
}

/** Reception desk: curved wood front, stone top, monitors, chairs, logo wall */
function Reception({
  x,
  y,
  id,
  ctx,
}: {
  x: number
  y: number
  id: string
  ctx: Ctx
}) {
  const tex = useTex()
  const hl = ctx.hover === id
  const R = 2.6
  return (
    <group
      position={[wx(x), 0, wz(y)]}
      rotation={[0, -Math.PI / 2, 0]}
      {...useHoverProps(id, ctx)}
    >
      {/* curved front */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <cylinderGeometry
          args={[R, R, 1.1, 48, 1, true, -Math.PI / 2.6, (Math.PI / 2.6) * 2]}
        />
        <meshStandardMaterial
          map={tex.wood}
          color={hl ? "#f3d2b0" : "#ffffff"}
          side={THREE.DoubleSide}
          roughness={0.55}
        />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry
          args={[
            R - 0.6,
            R - 0.6,
            0.75,
            48,
            1,
            true,
            -Math.PI / 2.6,
            (Math.PI / 2.6) * 2,
          ]}
        />
        <meshStandardMaterial color="#e7e2d8" side={THREE.DoubleSide} />
      </mesh>
      {/* stone top */}
      <mesh position={[0, 1.12, 0]} castShadow>
        <ringGeometry
          args={[
            R - 0.65,
            R + 0.08,
            48,
            1,
            Math.PI / 2 - Math.PI / 2.6,
            (Math.PI / 2.6) * 2,
          ]}
        />
        <meshStandardMaterial
          color="#f5f5f4"
          roughness={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* LED strip */}
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry
          args={[
            R + 0.01,
            R + 0.01,
            0.04,
            48,
            1,
            true,
            -Math.PI / 2.6,
            (Math.PI / 2.6) * 2,
          ]}
        />
        <meshStandardMaterial
          color="#fde68a"
          emissive="#fbbf24"
          emissiveIntensity={1.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      {[-0.7, 0.7].map((dx) => (
        <group key={dx} position={[dx, 0, R - 1.1]}>
          <mesh
            position={[0, 1.42, 0.05]}
            rotation={[0, Math.PI, 0]}
            castShadow
          >
            <boxGeometry args={[0.55, 0.34, 0.03]} />
            <meshStandardMaterial
              color="#111"
              emissive="#1e3a8a"
              emissiveIntensity={0.4}
            />
          </mesh>
          <mesh position={[0, 1.18, 0.08]}>
            <boxGeometry args={[0.06, 0.1, 0.06]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <mesh position={[0, 0.5, -0.5]} castShadow>
            <boxGeometry args={[0.5, 0.1, 0.5]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
          <mesh position={[0, 0.85, -0.75]} castShadow>
            <boxGeometry args={[0.5, 0.6, 0.08]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
          <mesh position={[0, 0.25, -0.5]}>
            <cylinderGeometry args={[0.03, 0.03, 0.45]} />
            <meshStandardMaterial {...steel} />
          </mesh>
        </group>
      ))}
      {/* bell & flowers */}
      <mesh position={[0, 1.18, R - 0.3]}>
        <sphereGeometry args={[0.08, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.2} />
      </mesh>
      <Sign kind="info" y={2.8} id={id} ctx={ctx} text="Resepsionis" />
    </group>
  )
}

const LIFT_X = [653, 725, 798, 871, 944]

function Scene({ ctx, nav }: { ctx: Ctx; nav: FloorNav }) {
  const conv = (x: number, y: number): Pt => [wx(x), wz(y)]
  const root = useRef<THREE.Group>(null)
  return (
    <group
      ref={root}
      onClick={(e) => {
        if (!nav.picking || !root.current) return
        e.stopPropagation()
        const l = root.current.worldToLocal(e.point.clone())
        nav.onSet([l.x * S + 600, l.z * S + 322])
      }}
    >
      {nav.yah && <YouAreHere p={nav.yah} conv={conv} size={0.7} y={0.03} />}
      {nav.leg && (
        <RouteLine leg={nav.leg} conv={conv} width={0.7} y={0.03} pin={2.6} />
      )}
      <hemisphereLight args={["#fff6e8", "#9aa3b2", 0.6]} />
      <directionalLight
        position={[22, 40, 18]}
        intensity={1.8}
        color="#fff4e0"
        castShadow
        shadow-bias={-0.0004}
        shadow-mapSize={[Q.shadowMap, Q.shadowMap]}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />
      <Environment resolution={Q.envRes}>
        <Lightformer
          form="rect"
          intensity={2}
          position={[0, 10, 0]}
          rotation-x={Math.PI / 2}
          scale={[30, 30, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1}
          position={[20, 5, 0]}
          rotation-y={-Math.PI / 2}
          scale={[20, 10, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1}
          position={[-20, 5, 0]}
          rotation-y={Math.PI / 2}
          scale={[20, 10, 1]}
        />
      </Environment>

      <FloorSlab />

      <DoorWall ctx={ctx} />

      <OutlineWalls />

      {/* lift bank walls: one continuous marble wall per row, doors mounted on its face */}
      <Core x1={628} y1={136} x2={1011} y2={192} />
      <Core x1={628} y1={410} x2={1011} y2={466} />
      <ZoneSign
        x={820}
        y={192}
        face={1}
        text="LIFT  G – 19"
        sub="Lantai G sampai 19"
        color={SIGN.lift}
      />
      <ZoneSign
        x={820}
        y={410}
        face={-1}
        text="LIFT  19 – 33"
        sub="Lantai 19 sampai 33"
        color={SIGN.liftB}
      />

      <Lift
        x={582}
        y={110}
        w={46}
        h={82}
        face={1}
        kind="cargo"
        id="cargo"
        ctx={ctx}
        label="Lift Barang"
      />
      {LIFT_X.map((x, i) => (
        <Lift
          key={"a" + i}
          x={x}
          y={136}
          w={43}
          h={56}
          face={1}
          kind="lift"
          id={"la" + i}
          ctx={ctx}
          bare
          label={`Lift A${i + 1} · G–19`}
        />
      ))}
      {LIFT_X.map((x, i) => (
        <Lift
          key={"b" + i}
          x={x}
          y={410}
          w={43}
          h={56}
          face={-1}
          kind="lift"
          id={"lb" + i}
          ctx={ctx}
          bare
          label={`Lift B${i + 1} · 19–33`}
        />
      ))}

      <Stairs x={1011} y={110} w={46} h={82} doorFace={1} id="st1" ctx={ctx} />
      <Stairs x={582} y={410} w={46} h={82} doorFace={-1} id="st2" ctx={ctx} />
      <Stairs x={1011} y={410} w={46} h={82} doorFace={-1} id="st3" ctx={ctx} />

      <Escalator x={397} y={376} w={46} h={125} id="esc" ctx={ctx} />
      <GlassDoor
        x={wx(1064)}
        z0={wz(305)}
        z1={wz(368)}
        id="door"
        ctx={ctx}
        exit
      />
      <Cafe x={288} y={556} w={46} h={63} id="cafe" ctx={ctx} />
      <Bank x={363} y={556} w={112} h={63} id="bank" ctx={ctx} />
      <Reception x={548} y={160} id="reception" ctx={ctx} />

      {!LOW && (
        <ContactShadows
          position={[0, 0.02, 0]}
          opacity={0.4}
          scale={70}
          blur={2}
          far={6}
          resolution={Q.contactRes}
          frames={1}
        />
      )}
    </group>
  )
}

/** World rectangle of each floor for the fixed top view (ground + Lobby share ground-floor px; the others are centred) */
const TOP_BOUNDS: Record<Floor, TopBounds> = {
  outdoor: [-OUT_W / 2 / S, -OUT_H / 2 / S, OUT_W / 2 / S, OUT_H / 2 / S],
  ground: [wx(0), wz(0), wx(1200), wz(645)],
  lobby: [
    wx(LB_BOUNDS.x1),
    wz(LB_BOUNDS.y1),
    wx(LB_BOUNDS.x2),
    wz(LB_BOUNDS.y2),
  ],
  lt4: [-F4_W / 2 / S, -F4_H / 2 / S, F4_W / 2 / S, F4_H / 2 / S],
  basement: [-B_W / 2 / S, -B_H / 2 / S, B_W / 2 / S, B_H / 2 / S],
}

/** Reports "ready" only after the GPU has actually drawn a frame of the scene (not merely after React mounted it) */
function FirstFrame({ onReady }: { onReady: () => void }) {
  const invalidate = useThree((s) => s.invalidate)
  const done = useRef(false)
  // frameloop="demand": ask for the first frame explicitly
  useEffect(() => {
    invalidate()
  }, [invalidate])
  useFrame(() => {
    if (done.current) return
    done.current = true
    // useFrame runs just before gl.render in the same tick; the next animation frame comes after it was presented
    requestAnimationFrame(onReady)
  })
  return null
}

export type Map3DProps = {
  view: Floor
  nav: (f: Floor) => FloorNav
  ctx: Ctx
  activeId?: string
  onPick: (id: string) => void
  onEnter: () => void
  reset: number
  spin: Spin
  onHeading: (a: number) => void
  onStage: (s: Stage) => void
}

export default function Map3D({
  view,
  nav,
  ctx,
  activeId,
  onPick,
  onEnter,
  reset,
  spin,
  onHeading,
  onStage,
}: Map3DProps) {
  // this component only renders once its chunk has been fetched and evaluated: geometry is built next
  useEffect(() => {
    onStage("scene")
  }, [onStage])
  return (
    <>
      <Canvas
        shadows={Q.shadows ? { type: THREE.PCFShadowMap } : false}
        // nothing animates on its own: draw a frame only when something changes (camera, hover, selection, route)
        frameloop="demand"
        dpr={Q.dpr}
        gl={{
          antialias: Q.antialias,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        camera={{ position: [28, 30, 34], fov: 45 }}
        // scene graph committed: what remains is shader compilation and the first draw
        onCreated={() => onStage("frame")}
      >
        {Q.shadows && <StaticShadows />}
        {/* Peta 3D: starts from above, then moves like a map (pan / zoom / rotate) */}
        <TopView
          bounds={TOP_BOUNDS[view]}
          reset={reset}
          spin={spin}
          onHeading={onHeading}
        />
        <Suspense fallback={null}>
          {view === "outdoor" ? (
            <OutdoorScene onEnter={onEnter} nav={nav("outdoor")} />
          ) : view === "basement" ? (
            <BasementScene
              nav={nav("basement")}
              activeId={activeId}
              onPick={onPick}
            />
          ) : view === "lobby" ? (
            <LobbyScene
              nav={nav("lobby")}
              activeId={activeId}
              onPick={onPick}
            />
          ) : view === "lt4" ? (
            <Floor4Scene nav={nav("lt4")} activeId={activeId} onPick={onPick} />
          ) : (
            <Scene ctx={ctx} nav={nav("ground")} />
          )}
          <FirstFrame onReady={() => onStage("ready")} />
        </Suspense>
        <TagProjector />
      </Canvas>
      <TagLayer />
    </>
  )
}
