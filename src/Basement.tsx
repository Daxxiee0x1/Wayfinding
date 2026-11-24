import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react"
import * as THREE from "three"
import { useThree } from "@react-three/fiber"
import { ContactShadows, Environment, Lightformer } from "@react-three/drei"
import type { FloorNav, Pt } from "./Wayfinding"
import { RouteLine, YouAreHere } from "./RouteMarkers"
import { LOW, Q } from "./quality"
import {
  Lift,
  PinTag,
  S,
  WALL_H,
  Wall,
  makeTex,
  steel,
  sz,
  useTex,
  wx,
  wz,
  type Ctx,
} from "./Building3D"
import {
  B_AISLE_Y,
  B_COLOR,
  B_EXITS,
  B_H,
  B_LIFT,
  B_LIFT_STATUS,
  B_LOTS,
  B_MOSQUE,
  B_OFF_COLOR,
  B_RAMP,
  B_ROOMS,
  B_STAIRS,
  B_W,
  B_WALL,
  B_WUDHU,
  BIcon,
  PICTO,
  type BKind,
  type BPlace,
  type BRect,
} from "./BasementData"

/*
 * Basement in 3D, built from the same parts as the other floors (plaster walls, stainless lift, pictogram tags).
 * Design px → world via wx/wz (S = 20); the whole floor is offset so the plan is centred on the origin.
 * Repeated objects (cars, racks, tables, steps, prayer rugs) are instanced: one draw call per part.
 */
export const B_OFF: [number, number, number] = [
  (600 - B_W / 2) / S,
  0,
  (322 - B_H / 2) / S,
]
const DOOR_PX = 36
const cx = (r: BRect) => (r[0] + r[2]) / 2
const cy = (r: BRect) => (r[1] + r[3]) / 2
type V3 = [number, number, number]

/* ---------- textures ---------- */
let BT: { concrete: THREE.Texture; rug: THREE.Texture } | null = null
function useBTex() {
  if (!BT) {
    BT = {
      // light grey epoxy-coated concrete, as in parking basements
      concrete: makeTex(
        (g, n) => {
          g.fillStyle = "#9ea3a8"
          g.fillRect(0, 0, n, n)
          for (let i = 0; i < n * 5; i++) {
            g.fillStyle = `rgba(${
              Math.random() < 0.5 ? "0,0,0" : "255,255,255"
            },${Math.random() * 0.07})`
            g.fillRect(Math.random() * n, Math.random() * n, 3, 3)
          }
          g.strokeStyle = "rgba(60,64,70,0.35)"
          g.lineWidth = 2
          g.strokeRect(0, 0, n, n)
        },
        [B_W / 160, B_H / 160],
        256,
      ),
      // prayer rug (tinted per instance): border, field pattern and the mihrab arch towards the qibla (+u)
      rug: (() => {
        const c = document.createElement("canvas")
        c.width = 256
        c.height = 128
        const g = c.getContext("2d")!
        g.fillStyle = "#d4d4d4"
        g.fillRect(0, 0, 256, 128)
        g.fillStyle = "#ffffff"
        g.fillRect(10, 8, 236, 112)
        g.fillStyle = "#bdbdbd"
        g.fillRect(18, 16, 220, 96)
        g.strokeStyle = "#ffffff"
        g.lineWidth = 4
        g.beginPath()
        g.moveTo(40, 22)
        g.lineTo(170, 22)
        g.quadraticCurveTo(236, 22, 236, 64)
        g.quadraticCurveTo(236, 106, 170, 106)
        g.lineTo(40, 106)
        g.closePath()
        g.stroke()
        g.fillStyle = "#ffffff"
        for (let i = 0; i < 4; i++)
          for (let j = 0; j < 3; j++) {
            g.save()
            g.translate(60 + i * 30, 40 + j * 24)
            g.rotate(Math.PI / 4)
            g.fillRect(-4, -4, 8, 8)
            g.restore()
          }
        for (let y = 10; y < 120; y += 6) {
          g.fillRect(0, y, 6, 2)
          g.fillRect(250, y, 6, 2)
        }
        const t = new THREE.CanvasTexture(c)
        t.colorSpace = THREE.SRGBColorSpace
        t.anisotropy = 8
        return t
      })(),
    }
  }
  return BT
}

/* ---------- instancing helper ---------- */
export type I = { p: V3; s: V3; ry?: number; c?: string }
export function Inst({
  items,
  geo,
  children,
  cast = true,
}: {
  items: I[]
  geo?: THREE.BufferGeometry
  children: ReactElement
  cast?: boolean
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      e = new THREE.Euler(),
      col = new THREE.Color()
    items.forEach((it, i) => {
      q.setFromEuler(e.set(0, it.ry ?? 0, 0))
      mesh.setMatrixAt(
        i,
        m.compose(new THREE.Vector3(...it.p), q, new THREE.Vector3(...it.s)),
      )
      if (it.c) mesh.setColorAt(i, col.set(it.c))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items])
  if (!items.length) return null
  return (
    <instancedMesh
      ref={ref}
      args={[geo, undefined, items.length]}
      castShadow={cast}
      receiveShadow
    >
      {!geo && <boxGeometry args={[1, 1, 1]} />}
      {children}
    </instancedMesh>
  )
}

/* ---------- floor + perimeter ---------- */
function Slab() {
  const t = useBTex()
  return (
    <>
      <mesh position={[wx(B_W / 2), -0.25, wz(B_H / 2)]} receiveShadow>
        <boxGeometry args={[sz(B_W), 0.5, sz(B_H)]} />
        <meshStandardMaterial
          map={t.concrete}
          roughness={0.55}
          metalness={0.05}
        />
      </mesh>
      {/* perimeter walls, open on the west side where the exit ramp leaves the basement */}
      {([
        [0, 0, B_W, 0],
        [B_W, 0, B_W, B_H],
        [0, B_H, B_W, B_H],
        [0, 0, 0, B_RAMP.y1],
        [0, B_RAMP.y2, 0, B_H],
      ] as BRect[]).map(([a, b, c, d], i) => (
        <Wall key={i} x1={a} y1={b} x2={c} y2={d} finish="creamConcrete" />
      ))}
      {/* solid white wall in front of the mosque, between it and the parking hall */}
      <mesh
        position={[
          wx((B_WALL[0] + B_WALL[2]) / 2),
          WALL_H / 2,
          wz((B_WALL[1] + B_WALL[3]) / 2),
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[sz(B_WALL[2] - B_WALL[0]), WALL_H, sz(B_WALL[3] - B_WALL[1])]}
        />
        <meshStandardMaterial color="#f8fafc" roughness={0.5} />
      </mesh>
    </>
  )
}

/** Vehicle exit: no barrier here — a marked line, then the ramp straight up to the outdoor driveway */
const RAMP_TOP_X = -110 // plan x where the ramp reaches street level (outside the west wall)
function ExitRamp() {
  const { x2, line, y1, y2 } = B_RAMP
  const run = sz(x2 - RAMP_TOP_X),
    ang = Math.atan2(WALL_H, run),
    zc = wz((y1 + y2) / 2),
    W = sz(y2 - y1)
  const chevron = useMemo(() => {
    const sh = new THREE.Shape()
    sh.moveTo(0.9, -1.6)
    sh.lineTo(-0.6, 0)
    sh.lineTo(0.9, 1.6)
    sh.lineTo(1.6, 1.6)
    sh.lineTo(0.1, 0)
    sh.lineTo(1.6, -1.6)
    sh.closePath()
    return new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2)
  }, [])
  const stripes = useMemo<I[]>(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        p: [wx((line[0] + line[1]) / 2), 0.04, wz(y1) + (i + 0.5) * (W / 12)],
        s: [sz(line[1] - line[0]), 0.08, W / 12 - 0.02],
        c: i % 2 ? "#111827" : "#facc15",
      })),
    [line, y1, W],
  )
  return (
    <group>
      {/* ramp deck rising to the west, with painted chevrons pointing up */}
      <group
        position={[wx((x2 + RAMP_TOP_X) / 2), WALL_H / 2, zc]}
        rotation={[0, 0, -ang]}
      >
        <mesh receiveShadow castShadow>
          <boxGeometry args={[Math.hypot(run, WALL_H), 0.3, W]} />
          <meshStandardMaterial color="#6b7076" roughness={0.8} />
        </mesh>
        {[-4, 0, 4].map((dx) => (
          <mesh key={dx} geometry={chevron} position={[dx, 0.16, 0]}>
            <meshStandardMaterial color="#f8fafc" side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
      {/* low side walls along the ramp */}
      {[y1, y2].map((y) => (
        <Wall
          key={y}
          x1={0}
          y1={y}
          x2={x2}
          y2={y}
          h={1.2}
          finish="creamConcrete"
        />
      ))}
      {/* striped line where the ramp starts (the grey bar on the plan) */}
      <Inst items={stripes} cast={false}>
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </Inst>
    </group>
  )
}

/** Painted driving aisle: dashed centre line + arrows towards the exit ramp */
function AisleMarkings() {
  const arrow = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-1.8, -0.3)
    s.lineTo(0.4, -0.3)
    s.lineTo(0.4, -0.85)
    s.lineTo(1.8, 0)
    s.lineTo(0.4, 0.85)
    s.lineTo(0.4, 0.3)
    s.lineTo(-1.8, 0.3)
    s.closePath()
    return new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2)
  }, [])
  const z = wz(B_AISLE_Y)
  const dashes = useMemo<I[]>(
    () =>
      Array.from({ length: Math.floor(sz(1800 - 300) / 3) }, (_, i) => ({
        p: [wx(300) + i * 3, 0.012, z],
        s: [1.6, 0.01, 0.16],
      })),
    [z],
  )
  const arrows = useMemo<I[]>(
    () =>
      [380, 720, 1000, 1290, 1600].flatMap((x): I[] =>
        [-2, 2].map((dz) => ({
          p: [wx(x), 0.014, z + dz],
          s: [1, 1, 1],
          ry: Math.PI,
        })),
      ),
    [z],
  )
  return (
    <group>
      <Inst items={dashes} cast={false}>
        <meshStandardMaterial color="#f8fafc" />
      </Inst>
      <Inst items={arrows} geo={arrow} cast={false}>
        <meshStandardMaterial color="#f8fafc" side={THREE.DoubleSide} />
      </Inst>
    </group>
  )
}

/* ---------- car parks ---------- */
const CAR_COLORS = [
  "#e5e7eb",
  "#111827",
  "#9ca3af",
  "#b91c1c",
  "#1d4ed8",
  "#f5f5f4",
  "#374151",
]
function CarParks({ onPick }: { onPick: (id: string) => void }) {
  const parts = useMemo(() => {
    const lot: I[] = [],
      line: I[] = [],
      body: I[] = [],
      cabin: I[] = [],
      wheel: I[] = []
    B_LOTS.forEach((l, li) => {
      const X1 = wx(l.r[0]),
        X2 = wx(l.r[2]),
        Z1 = wz(l.r[1]),
        Z2 = wz(l.r[3])
      lot.push({
        p: [(X1 + X2) / 2, 0.008, (Z1 + Z2) / 2],
        s: [X2 - X1, 0.01, Z2 - Z1],
      })
      // two rows of stalls along the long sides, cars nose-in, a drive lane in between
      const n = Math.floor((Z2 - Z1 - 0.4) / 2.6),
        pitch = (Z2 - Z1) / n
      const rows: [number, number][] = [
        [X1 + 2.6, 1],
        [X2 - 2.6, -1],
      ]
      rows.forEach(([x, dir], side) => {
        for (let i = 0; i <= n; i++)
          line.push({ p: [x, 0.016, Z1 + i * pitch], s: [5, 0.01, 0.12] })
        for (let i = 0; i < n; i++) {
          if ((i * 7 + side * 3 + li * 5) % 5 === 0) continue
          const z = Z1 + (i + 0.5) * pitch
          body.push({
            p: [x, 0.55, z],
            s: [4.2, 0.62, 1.8],
            c: CAR_COLORS[(i * 3 + side + li * 2) % CAR_COLORS.length],
          })
          cabin.push({ p: [x + dir * 0.25, 1.1, z], s: [2.2, 0.52, 1.6] })
          if (!LOW)
            for (const [dx, dz] of [
              [-1.3, -0.86],
              [1.3, -0.86],
              [-1.3, 0.86],
              [1.3, 0.86],
            ])
              wheel.push({ p: [x + dx, 0.32, z + dz], s: [0.64, 0.64, 0.22] })
        }
      })
    })
    return { lot, line, body, cabin, wheel }
  }, [])
  return (
    <group>
      {B_LOTS.map((l) => (
        <mesh
          key={l.id}
          position={[wx(cx(l.r)), 0.02, wz(cy(l.r))]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={(e) => {
            e.stopPropagation()
            onPick(l.id)
          }}
        >
          <planeGeometry args={[sz(l.r[2] - l.r[0]), sz(l.r[3] - l.r[1])]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      <Inst items={parts.lot} cast={false}>
        <meshStandardMaterial color="#4b5563" roughness={0.7} />
      </Inst>
      <Inst items={parts.line} cast={false}>
        <meshStandardMaterial color="#f8fafc" />
      </Inst>
      <Inst items={parts.body}>
        <meshStandardMaterial color="#ffffff" metalness={0.6} roughness={0.3} />
      </Inst>
      <Inst items={parts.cabin}>
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.1} />
      </Inst>
      <Inst items={parts.wheel} cast={false}>
        <meshStandardMaterial color="#111111" />
      </Inst>
    </group>
  )
}

/* ---------- rooms ---------- */
/** Walls of a room (skipping sides on the perimeter) with a door gap at `door` */
function RoomWalls({ q }: { q: BPlace }) {
  const [x1, y1, x2, y2] = q.r
  const [dx, dy] = q.door ?? [-1, -1]
  const sides: BRect[] = [
    [x1, y1, x2, y1],
    [x2, y1, x2, y2],
    [x1, y2, x2, y2],
    [x1, y1, x1, y2],
  ]
  const segs = sides
    .filter(
      ([a, b, c, d]) =>
        !(
          (a === c && (a === 0 || a === B_W)) ||
          (b === d && (b === 0 || b === B_H))
        ),
    )
    .flatMap(([a, b, c, d]): BRect[] => {
      if (b === d && Math.abs(b - dy) < 1 && dx > a && dx < c)
        return [
          [a, b, dx - DOOR_PX / 2, b],
          [dx + DOOR_PX / 2, b, c, d],
        ]
      if (a === c && Math.abs(a - dx) < 1 && dy > b && dy < d)
        return [
          [a, b, a, dy - DOOR_PX / 2],
          [a, dy + DOOR_PX / 2, c, d],
        ]
      return [[a, b, c, d]]
    })
  return (
    <>
      {segs.map(([a, b, c, d], i) => (
        <Wall key={i} x1={a} y1={b} x2={c} y2={d} finish="creamConcrete" />
      ))}
    </>
  )
}

const ROOM_TINT: Partial<Record<BKind, string>> = {
  storage: "#d6d3d1",
  security: "#e2e8f0",
  toilet: "#e0f2fe",
  canteen: "#f5e6d3",
  wudhu: "#cffafe",
}
function RoomFloor({
  q,
  active,
  onPick,
}: {
  q: BPlace
  active: boolean
  onPick: (id: string) => void
}) {
  const tex = useTex()
  return (
    <mesh
      position={[wx(cx(q.r)), 0.012, wz(cy(q.r))]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      onClick={(e) => {
        e.stopPropagation()
        onPick(q.id)
      }}
    >
      <planeGeometry args={[sz(q.r[2] - q.r[0]), sz(q.r[3] - q.r[1])]} />
      <meshStandardMaterial
        map={tex.plaster}
        color={active ? "#fdba74" : (ROOM_TINT[q.kind] ?? "#e7e5e4")}
        roughness={0.4}
        emissive={active ? "#f97316" : "#000000"}
        emissiveIntensity={active ? 0.25 : 0}
      />
    </mesh>
  )
}

/** Racks with cartons (storage), tables + stools + counter (canteen), desk + monitors (security), partitions (toilet), taps + bench (wudhu, on the east wall) */
function Furnishing() {
  const tex = useTex()
  const parts = useMemo(() => {
    const rack: I[] = [],
      carton: I[] = [],
      table: I[] = [],
      chair: I[] = [],
      wood: I[] = [],
      metal: I[] = [],
      partition: I[] = []
    const [storage, security, toilet, canteen] = B_ROOMS.map((q) => q.r)
    const wudhu = B_WUDHU.r
    // storage: four long racks along z, three shelves each, cartons on the shelves
    const z1 = wz(storage[1] + 40),
      z2 = wz(storage[3] - 50),
      len = z2 - z1
    ;[40, 100, 160, 220].forEach((x, k) => {
      const X = wx(x)
      for (const y of [0.15, 0.95, 1.75])
        rack.push({ p: [X, y, (z1 + z2) / 2], s: [1.1, 0.06, len] })
      for (let i = 0; i <= 6; i++)
        rack.push({ p: [X, 1.1, z1 + (len * i) / 6], s: [1.1, 2.2, 0.08] })
      if (!LOW)
        [0.18, 0.98, 1.78].forEach((y, j) => {
          for (let i = 0; i < 12; i++) {
            if ((i + k + j) % 4 === 0) continue
            const h = 0.45 + ((i * 13 + k) % 3) * 0.1
            carton.push({
              p: [X, y + h / 2 + 0.03, z1 + 0.6 + i * ((len - 1.2) / 11)],
              s: [0.8, h, 0.7],
              c: ["#b98a55", "#a87b48", "#c99a62"][(i + k) % 3],
            })
          }
        })
    })
    // canteen: serving counter along the back wall, round tables with four stools
    wood.push({
      p: [wx(cx(canteen)), 0.5, wz(canteen[1] + 14)],
      s: [sz(canteen[2] - canteen[0]) - 3, 1, 0.8],
    })
    for (let i = 0; i < 5; i++)
      for (let j = 0; j < 2; j++) {
        const x = wx(
            canteen[0] + 40 + i * ((canteen[2] - canteen[0] - 80) / 4),
          ),
          z = wz(canteen[1] + 62 + j * 42)
        table.push({ p: [x, 0.74, z], s: [1.1, 0.05, 1.1] })
        metal.push({ p: [x, 0.37, z], s: [0.08, 0.72, 0.08] })
        if (!LOW)
          for (const [a, b] of [
            [0.85, 0],
            [-0.85, 0],
            [0, 0.85],
            [0, -0.85],
          ])
            chair.push({ p: [x + a, 0.45, z + b], s: [0.42, 0.06, 0.42] })
      }
    // security post: desk with a monitor wall
    wood.push({
      p: [wx(cx(security)), 0.75, wz(security[1] + 30)],
      s: [sz(security[2] - security[0]) - 2.5, 0.06, 1],
    })
    for (let i = -1; i <= 1; i++)
      metal.push({
        p: [wx(cx(security)) + i * 1.3, 1.6, wz(security[1]) + 0.12],
        s: [1.2, 0.7, 0.05],
        c: "#0b1220",
      })
    // toilet: centre partition (men | women) and cubicle walls
    // toilet (tall, door on the east side): centre partition men | women across the room, cubicles along the west wall
    partition.push({
      p: [wx(cx(toilet)), 1.1, wz(cy(toilet))],
      s: [sz(toilet[2] - toilet[0]), 2.2, 0.08],
    })
    for (const f of [0.18, 0.34, 0.66, 0.82])
      partition.push({
        p: [
          wx(toilet[0]) + 0.7,
          1,
          wz(toilet[1] + (toilet[3] - toilet[1]) * f),
        ],
        s: [1.4, 1.9, 0.05],
      })
    // wudhu: row of taps on the east wall above a drain channel, low stone bench in front
    const wn = 7,
      wl = wudhu[3] - wudhu[1] - 30
    for (let i = 0; i < wn; i++)
      metal.push({
        p: [wx(B_W) - 0.25, 0.95, wz(wudhu[1] + 15 + (i + 0.5) * (wl / wn))],
        s: [0.35, 0.08, 0.08],
      })
    partition.push({
      p: [wx(B_W) - 0.4, 0.03, wz(cy(wudhu))],
      s: [0.5, 0.06, sz(wl)],
      c: "#94a3b8",
    })
    wood.push({
      p: [wx(B_W) - 1.3, 0.22, wz(cy(wudhu))],
      s: [0.5, 0.44, sz(wl)],
    })
    return { rack, carton, table, chair, wood, metal, partition }
  }, [])
  return (
    <group>
      <Inst items={parts.rack}>
        <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.4} />
      </Inst>
      <Inst items={parts.carton}>
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </Inst>
      <Inst items={parts.wood}>
        <meshStandardMaterial map={tex.wood} roughness={0.5} />
      </Inst>
      <Inst items={parts.table}>
        <meshStandardMaterial color="#f5f5f4" roughness={0.3} />
      </Inst>
      <Inst items={parts.chair}>
        <meshStandardMaterial color="#b45309" roughness={0.6} />
      </Inst>
      <Inst items={parts.metal}>
        <meshStandardMaterial {...steel} color="#ffffff" />
      </Inst>
      <Inst items={parts.partition}>
        <meshStandardMaterial color="#7dd3fc" roughness={0.4} />
      </Inst>
    </group>
  )
}

/* ---------- mosque: prayer rugs only (no building), in rows facing the qibla to the west (-x) ---------- */
const RUG_COLORS = ["#7f1d1d", "#14532d", "#1e3a8a", "#9a3412", "#4c1d95"]
function PrayerRugs({
  active,
  onPick,
}: {
  active: boolean
  onPick: (id: string) => void
}) {
  const t = useBTex()
  const geo = useMemo(
    () => new THREE.PlaneGeometry(1.2, 0.7).rotateX(-Math.PI / 2),
    [],
  )
  const r = B_MOSQUE.r
  const rugs = useMemo<I[]>(() => {
    // everyone faces the qibla to the west (-x): imam in front at the west side, rows behind him to the east
    const X1 = wx(r[0]),
      Z1 = wz(r[1]),
      Z2 = wz(r[3])
    const out: I[] = [
      {
        p: [X1 + 0.9, 0.016, (Z1 + Z2) / 2],
        s: [1, 1, 1],
        ry: Math.PI,
        c: "#a16207",
      },
    ] // imam
    for (let row = 0; row < 4; row++) {
      const x = X1 + 2.4 + row * 1.5
      for (let z = Z1 + 0.6; z <= Z2 - 0.6; z += 0.8)
        out.push({
          p: [x, 0.015, z],
          s: [1, 1, 1],
          ry: Math.PI,
          c: RUG_COLORS[row % RUG_COLORS.length],
        })
    }
    return out
  }, [r])
  return (
    <group>
      {/* invisible pick area so the prayer space stays clickable without drawing a building */}
      <mesh
        position={[wx(cx(r)), 0.02, wz(cy(r))]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => {
          e.stopPropagation()
          onPick(B_MOSQUE.id)
        }}
      >
        <planeGeometry args={[sz(r[2] - r[0]), sz(r[3] - r[1])]} />
        <meshBasicMaterial
          color="#f97316"
          transparent
          opacity={active ? 0.25 : 0}
          depthWrite={false}
        />
      </mesh>
      <Inst items={rugs} geo={geo} cast={false}>
        <meshStandardMaterial map={t.rug} color="#ffffff" roughness={0.95} />
      </Inst>
    </group>
  )
}

/* ---------- stairs up to the three outdoor basement doors ---------- */
function StairShafts({ onPick }: { onPick: (id: string) => void }) {
  const steps = useMemo<I[]>(() => {
    const out: I[] = []
    const n = LOW ? 10 : 16,
      rise = 3.6 / n
    for (const q of B_STAIRS) {
      const [x1, y1, x2, y2] = q.r
      const W = sz(x2 - x1) - 0.2,
        entry = q.up === -1 ? wz(y2) : wz(y1),
        far = q.up === -1 ? wz(y1) : wz(y2)
      const run = Math.abs(far - entry) - 1.2 // landing at the entry
      for (let i = 0; i < n; i++) {
        const h = (i + 1) * rise
        const z = entry + Math.sign(far - entry) * (1.2 + (i + 0.5) * (run / n))
        out.push({
          p: [wx((x1 + x2) / 2), h / 2, z],
          s: [W, h, run / n + 0.01],
          c: i % 2 ? "#a8a29e" : "#d6d3d1",
        })
      }
    }
    return out
  }, [])
  return (
    <group>
      <Inst items={steps}>
        <meshStandardMaterial color="#ffffff" roughness={0.7} />
      </Inst>
      {B_STAIRS.map((q) => {
        const [x1, y1, x2, y2] = q.r
        const doorY = q.up === -1 ? y2 : y1
        return (
          <group
            key={q.id}
            onClick={(e) => {
              e.stopPropagation()
              onPick(q.id)
            }}
          >
            {/* shaft walls on the long sides and the far end (the perimeter wall closes the others) */}
            <Wall x1={x1} y1={y1} x2={x1} y2={y2} finish="creamConcrete" />
            <Wall x1={x2} y1={y1} x2={x2} y2={y2} finish="creamConcrete" />
            {q.up === -1 && y1 > 0 && (
              <Wall x1={x1} y1={y1} x2={x2} y2={y1} finish="creamConcrete" />
            )}
            {/* red handrail climbing with the flight */}
            <mesh
              position={[wx(x1) + 0.12, 2.7, wz((y1 + y2) / 2)]}
              rotation={[-q.up * Math.atan2(3.6, sz(y2 - y1) - 1.2), 0, 0]}
            >
              <boxGeometry args={[0.05, 0.05, sz(y2 - y1)]} />
              <meshStandardMaterial color="#b91c1c" />
            </mesh>
            {/* illuminated green sign above the entry */}
            <mesh
              position={[
                wx((x1 + x2) / 2),
                WALL_H - 0.4,
                wz(doorY) + (q.up === -1 ? 0.12 : -0.12),
              ]}
            >
              <boxGeometry args={[sz(x2 - x1) - 0.3, 0.4, 0.08]} />
              <meshStandardMaterial
                color="#16a34a"
                emissive="#22c55e"
                emissiveIntensity={1.6}
              />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/* ---------- pictogram tags ---------- */
/** Same pin as the other floors: pictogram first, the name on hover / when selected; tapping it selects the place */
function Pictogram({
  p,
  kind,
  label,
  letter,
  active,
  onClick,
  h = WALL_H + 0.35,
}: {
  p: Pt
  kind: BKind
  label: string
  letter?: string
  active?: boolean
  onClick?: () => void
  h?: number
}) {
  return (
    <PinTag
      position={[wx(p[0]), h, wz(p[1])]}
      distanceFactor={60}
      color={B_COLOR[kind]}
      icon={<BIcon kind={kind} letter={letter} />}
      text={label}
      active={active}
      onClick={onClick}
    />
  )
}

/** Out-of-service lift: greyed tile with the plan's lift sticker crossed out; status shows with the name */
function LiftOffPin({ p, h }: { p: Pt; h: number }) {
  return (
    <PinTag
      position={[wx(p[0]), h, wz(p[1])]}
      distanceFactor={60}
      color={B_OFF_COLOR}
      text="Lift"
      sub={B_LIFT_STATUS}
      icon={
        <>
          <img
            src={PICTO.lift}
            alt=""
            className="h-full w-full rounded-[3px] opacity-60"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="h-0.5 w-[120%] rotate-45 rounded bg-red-600" />
          </span>
        </>
      }
    />
  )
}

/** Closed lift: yellow/black barrier in front of the doors */
function LiftClosed() {
  const [x1, , x2, y2] = B_LIFT.r
  const z = wz(y2) + 0.7
  return (
    <group>
      {[x1 - 4, x2 + 4].map((x) => (
        <mesh key={x} position={[wx(x), 0.5, z]} castShadow>
          <cylinderGeometry args={[0.06, 0.09, 1, 10]} />
          <meshStandardMaterial color="#facc15" />
        </mesh>
      ))}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh
          key={i}
          position={[wx(x1 - 4) + ((i + 0.5) * sz(x2 - x1 + 8)) / 5, 0.85, z]}
        >
          <boxGeometry args={[sz(x2 - x1 + 8) / 5, 0.14, 0.05]} />
          <meshStandardMaterial color={i % 2 ? "#111827" : "#facc15"} />
        </mesh>
      ))}
    </group>
  )
}

/** Camera target: with the side panel (sm+) aim right of centre so the mosque / wudhu at the east end stay visible */
export const bTarget = (width: number): V3 =>
  width >= 640 ? [20, 0, 4] : [0, 0, 4]
export function BasementCamera() {
  const { camera, size } = useThree()
  useEffect(() => {
    const k = Math.min(2.6, Math.max(1, 1.9 / (size.width / size.height)))
    const t = bTarget(size.width)
    camera.position.set(t[0] + 4, 66 * k, t[2] + 62 * k)
    camera.lookAt(...t)
    camera.updateProjectionMatrix()
  }, [camera, size.width, size.height])
  return null
}

export default function BasementScene({
  nav,
  activeId,
  onPick,
}: {
  nav: FloorNav
  activeId?: string
  onPick?: (id: string) => void
}) {
  const root = useRef<THREE.Group>(null)
  const [hover, setHover] = useState<string | null>(null)
  const ctx: Ctx = { focus: null, hover, setHover }
  const conv = (x: number, y: number): Pt => [wx(x), wz(y)]
  const pick = (id: string) => {
    if (!nav.picking && onPick) onPick(id)
  }
  const a = (id: string) => activeId === id
  return (
    <>
      <>
        <hemisphereLight args={["#eef2f7", "#7c8594", 0.75]} />
        <directionalLight
          position={[26, 44, 20]}
          intensity={1.6}
          color="#f8fafc"
          castShadow
          shadow-bias={-0.0004}
          shadow-mapSize={[Q.shadowMap, Q.shadowMap]}
          shadow-camera-left={-56}
          shadow-camera-right={56}
          shadow-camera-top={32}
          shadow-camera-bottom={-32}
        />
        <Environment resolution={Q.envRes}>
          <Lightformer
            form="rect"
            intensity={2}
            position={[0, 10, 0]}
            rotation-x={Math.PI / 2}
            scale={[40, 30, 1]}
          />
          <Lightformer
            form="rect"
            intensity={1}
            position={[30, 5, 0]}
            rotation-y={-Math.PI / 2}
            scale={[20, 10, 1]}
          />
          <Lightformer
            form="rect"
            intensity={1}
            position={[-30, 5, 0]}
            rotation-y={Math.PI / 2}
            scale={[20, 10, 1]}
          />
        </Environment>
      </>
      <group
        ref={root}
        position={B_OFF}
        onClick={(e) => {
          if (!nav.picking || !root.current) return
          e.stopPropagation()
          const l = root.current.worldToLocal(e.point.clone())
          nav.onSet([l.x * S + 600, l.z * S + 322])
        }}
      >
        <Slab />
        <ExitRamp />
        <AisleMarkings />
        <CarParks onPick={pick} />
        {B_ROOMS.map((q) => (
          <group key={q.id}>
            <RoomFloor q={q} active={a(q.id)} onPick={pick} />
            <RoomWalls q={q} />
          </group>
        ))}
        <Furnishing />
        <PrayerRugs active={a(B_MOSQUE.id)} onPick={pick} />
        {/* wudhu: open ablution area belonging to the mosque, tiled floor only, no walls */}
        <RoomFloor q={B_WUDHU} active={a(B_WUDHU.id)} onPick={pick} />
        <StairShafts onPick={pick} />
        {/* lift out of service: shaft and doors only, closed off, not part of any route */}
        <Lift
          x={B_LIFT.r[0]}
          y={B_LIFT.r[1]}
          w={B_LIFT.r[2] - B_LIFT.r[0]}
          h={B_LIFT.r[3] - B_LIFT.r[1]}
          face={1}
          kind="lift"
          id={B_LIFT.id}
          ctx={ctx}
          noSign
          label={`Lift · ${B_LIFT_STATUS}`}
        />
        <LiftClosed />
        <group
          onClick={(e) => {
            e.stopPropagation()
            pick(B_RAMP.id)
          }}
        >
          <mesh
            position={[
              wx((B_RAMP.x1 + B_RAMP.x2) / 2),
              0.03,
              wz((B_RAMP.y1 + B_RAMP.y2) / 2),
            ]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry
              args={[sz(B_RAMP.x2 - B_RAMP.x1), sz(B_RAMP.y2 - B_RAMP.y1)]}
            />
            <meshBasicMaterial
              color="#f97316"
              transparent
              opacity={a(B_RAMP.id) ? 0.3 : 0}
              depthWrite={false}
            />
          </mesh>
        </group>

        {/* pictograms + names (texts as on the plan) */}
        {B_ROOMS.map((q) => (
          <Pictogram
            key={q.id}
            p={[cx(q.r), cy(q.r)]}
            kind={q.kind}
            label={q.label}
            active={a(q.id)}
            onClick={() => pick(q.id)}
          />
        ))}
        <Pictogram
          p={[cx(B_MOSQUE.r), cy(B_MOSQUE.r)]}
          kind="mosque"
          label={B_MOSQUE.label}
          active={a(B_MOSQUE.id)}
          onClick={() => pick(B_MOSQUE.id)}
          h={1.6}
        />
        {B_LOTS.map((l) => (
          <Pictogram
            key={l.id}
            p={[cx(l.r), cy(l.r)]}
            kind="parking"
            letter={l.letter}
            label={`${l.label} ${l.letter}`}
            active={a(l.id)}
            onClick={() => pick(l.id)}
            h={2.6}
          />
        ))}
        {B_STAIRS.map((q) => (
          <Pictogram
            key={q.id}
            p={[cx(q.r), cy(q.r)]}
            kind="stairs"
            label={q.label}
            active={a(q.id)}
            onClick={() => pick(q.id)}
          />
        ))}
        {B_EXITS.map((r, i) => (
          <Pictogram
            key={"x" + i}
            p={[cx(r), cy(r)]}
            kind="exit"
            label="EXIT"
            h={WALL_H - 0.6}
          />
        ))}
        <Pictogram
          p={[cx(B_WUDHU.r), cy(B_WUDHU.r)]}
          kind="wudhu"
          label={B_WUDHU.label}
          active={a(B_WUDHU.id)}
          onClick={() => pick(B_WUDHU.id)}
          h={1.6}
        />
        <LiftOffPin p={[cx(B_LIFT.r), B_LIFT.r[3] + 30]} h={2.4} />
        <Pictogram
          p={[110, (B_RAMP.y1 + B_RAMP.y2) / 2]}
          kind="ramp"
          label="Ramp Keluar · ke Area Luar"
          active={a(B_RAMP.id)}
          onClick={() => pick(B_RAMP.id)}
          h={WALL_H + 0.8}
        />

        {nav.yah && <YouAreHere p={nav.yah} conv={conv} size={0.8} y={0.06} />}
        {nav.leg && (
          <RouteLine leg={nav.leg} conv={conv} width={0.8} y={0.06} pin={2.8} />
        )}
      </group>
      {!LOW && (
        <ContactShadows
          position={[0, 0.02, 0]}
          opacity={0.35}
          scale={110}
          blur={2}
          far={6}
          resolution={Q.contactRes}
          frames={1}
        />
      )}
    </>
  )
}
