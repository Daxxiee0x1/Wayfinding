import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import * as THREE from "three"
import { useThree } from "@react-three/fiber"
import { ContactShadows, Environment, Lightformer } from "@react-three/drei"
import type { FloorNav, Pt } from "./Wayfinding"
import { RouteLine, YouAreHere } from "./RouteMarkers"
import { LOW, Q } from "./quality"
import {
  Core,
  Escalator,
  GlassDoor,
  Lift,
  PinTag,
  S,
  Stairs,
  WALL_H,
  WALL_T,
  Wall,
  WallMaterial,
  ZoneSign,
  makeTex,
  steel,
  sz,
  useTex,
  wx,
  wz,
  type Ctx,
} from "./Building3D"
import { Inst, type I } from "./Basement"
import {
  LB_BANK_A,
  LB_BANK_B,
  LB_BOUNDS,
  LB_BRASS_POSTS,
  LB_CARPARK,
  LB_CLADDING,
  LB_COLOR,
  LB_CORE,
  LB_CREAM_FLOORS,
  LB_CREAM_WALLS,
  LB_DESK,
  LB_DIVIDER,
  LB_DOOR_HALF,
  LB_EAST_GLASS,
  LB_LIFT_W,
  LB_LIFT_X,
  LB_LOBBY_GLASS,
  LB_ROOMS,
  LB_WALLS,
  LBIcon,
  lbCream,
  type LBKind,
  type LBRoom,
} from "./LobbyData"

/*
 * Lobby in 3D. The plan is stored in Ground Floor px, so it uses the Ground Floor's wx/wz directly (no offset) and
 * stacks exactly on top of it. Building part: marble floor and walls like the Ground Floor, lift banks, Lift Barang and
 * emergency stairs on the same spots, the escalator arriving through an opening in the slab, and the open Cakrawala
 * Lobby with its reception desk. West of the full-height glass wall (double door in the middle): an open car-park deck
 * (concrete, parapets, painted stalls) above the outdoor side of the entrance.
 */
const DOOR_PX = 36
const DOOR_H = 2.6
const B = LB_BOUNDS
const ESC = LB_CORE.find((q) => q.kind === "escalator")!
type Seg = [number, number, number, number]

/* ---------- slabs ---------- */
let concrete: THREE.Texture | null = null
const useConcrete = () =>
  (concrete ??= makeTex(
    (g, n) => {
      g.fillStyle = "#a7abb0"
      g.fillRect(0, 0, n, n)
      for (let i = 0; i < n * 5; i++) {
        g.fillStyle = `rgba(${
          Math.random() < 0.5 ? "0,0,0" : "255,255,255"
        },${Math.random() * 0.07})`
        g.fillRect(Math.random() * n, Math.random() * n, 3, 3)
      }
      g.strokeStyle = "rgba(60,64,70,0.3)"
      g.lineWidth = 2
      g.strokeRect(0, 0, n, n)
    },
    [sz(LB_DIVIDER.x1 - B.x1) / 8, sz(B.y2 - B.y1) / 8],
    256,
  ))

/** Marble floor of the building part, with the escalator well cut out */
function BuildingSlab() {
  const tex = useTex()
  const geo = useMemo(() => {
    const P = (x: number, y: number) => new THREE.Vector2(wx(x), -wz(y))
    const s = new THREE.Shape([
      P(LB_DIVIDER.x2, B.y1),
      P(B.x2, B.y1),
      P(B.x2, B.y2),
      P(LB_DIVIDER.x2, B.y2),
    ])
    s.holes.push(
      new THREE.Path([
        P(ESC.x1, ESC.y1),
        P(ESC.x1, ESC.y2),
        P(ESC.x2, ESC.y2),
        P(ESC.x2, ESC.y1),
      ]),
    )
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

/** Glass balustrade around the escalator well (open on the north side, where the escalator arrives) */
function WellRail() {
  const X1 = wx(ESC.x1),
    X2 = wx(ESC.x2),
    Z1 = wz(ESC.y1),
    Z2 = wz(ESC.y2)
  const sides: Seg[] = [
    [X1, Z1, X1, Z2],
    [X2, Z1, X2, Z2],
    [X1, Z2, X2, Z2],
  ]
  return (
    <group>
      {sides.map(([a, b, c, d], i) => {
        const len = Math.hypot(c - a, d - b),
          ry = Math.atan2(c - a, d - b)
        return (
          <group
            key={i}
            position={[(a + c) / 2, 0, (b + d) / 2]}
            rotation={[0, ry, 0]}
          >
            <mesh position={[0, 0.55, 0]}>
              <boxGeometry args={[0.03, 1, len]} />
              <meshPhysicalMaterial
                color="#bfe3ff"
                transparent
                opacity={0.35}
                roughness={0.05}
              />
            </mesh>
            <mesh position={[0, 1.07, 0]}>
              <boxGeometry args={[0.07, 0.05, len]} />
              <meshStandardMaterial {...steel} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/* ---------- car-park deck ---------- */
const CAR_COLORS = [
  "#e5e7eb",
  "#111827",
  "#9ca3af",
  "#b91c1c",
  "#1d4ed8",
  "#f5f5f4",
  "#374151",
]
type HoverProps = {
  onPointerOver: (e: { stopPropagation: () => void }) => void
  onPointerOut: () => void
}
function CarDeck({
  active,
  hover,
  onPick,
  hoverProps,
}: {
  active: boolean
  hover: boolean
  onPick: () => void
  hoverProps: HoverProps
}) {
  const t = useConcrete()
  const q = LB_CARPARK
  const X1 = wx(q.x1),
    X2 = wx(q.x2),
    Z1 = wz(q.y1),
    Z2 = wz(q.y2)
  const parts = useMemo(() => {
    const line: I[] = [],
      body: I[] = [],
      cabin: I[] = [],
      wheel: I[] = []
    // two rows of stalls along the long sides, cars nose-in, a drive lane in between
    const n = Math.floor((Z2 - Z1 - 0.4) / 2.6),
      pitch = (Z2 - Z1) / n
    const rows: [number, number][] = [
      [X1 + 2.5, 1],
      [X2 - 2.5, -1],
    ]
    rows.forEach(([x, dir], side) => {
      for (let i = 0; i <= n; i++)
        line.push({ p: [x, 0.016, Z1 + i * pitch], s: [5, 0.01, 0.12] })
      for (let i = 0; i < n; i++) {
        if ((i * 7 + side * 3) % 4 === 0) continue
        const z = Z1 + (i + 0.5) * pitch
        body.push({
          p: [x, 0.55, z],
          s: [4.2, 0.62, 1.8],
          c: CAR_COLORS[(i * 3 + side) % CAR_COLORS.length],
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
    // zebra crossing from the stalls to the door in the dividing wall
    const gap = wx(LB_DIVIDER.x1) - X2
    const zebra: I[] = Array.from({ length: 6 }, (_, i) => ({
      p: [X2 + 0.5 + i * ((gap - 1) / 5), 0.016, wz(LB_DIVIDER.door)],
      s: [0.35, 0.01, 2.2],
    }))
    return { line, body, cabin, wheel, zebra }
  }, [X1, X2, Z1, Z2])
  const dx1 = wx(B.x1),
    dx2 = wx(LB_DIVIDER.x1)
  return (
    <group>
      <mesh
        position={[(dx1 + dx2) / 2, -0.25, wz((B.y1 + B.y2) / 2)]}
        receiveShadow
      >
        <boxGeometry args={[dx2 - dx1, 0.5, sz(B.y2 - B.y1)]} />
        <meshStandardMaterial map={t} roughness={0.6} metalness={0.05} />
      </mesh>
      {/* open deck: concrete parapets instead of walls */}
      {([
        [B.x1, B.y1, LB_DIVIDER.x1, B.y1],
        [B.x1, B.y1, B.x1, B.y2],
        [B.x1, B.y2, LB_DIVIDER.x1, B.y2],
      ] as Seg[]).map(([a, b, c, d], i) => (
        <Wall
          key={i}
          x1={a}
          y1={b}
          x2={c}
          y2={d}
          h={1.1}
          finish="creamConcrete"
        />
      ))}
      <mesh
        position={[(X1 + X2) / 2, 0.008, (Z1 + Z2) / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation()
          onPick()
        }}
        {...hoverProps}
      >
        <planeGeometry args={[X2 - X1, Z2 - Z1]} />
        <meshStandardMaterial
          color={active ? "#fdba74" : hover ? "#6b7280" : "#4b5563"}
          roughness={0.7}
          emissive={active ? "#f97316" : "#000"}
          emissiveIntensity={active ? 0.25 : 0}
        />
      </mesh>
      <Inst items={parts.line} cast={false}>
        <meshStandardMaterial color="#f8fafc" />
      </Inst>
      <Inst items={parts.zebra} cast={false}>
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

/* ---------- walls + doors ---------- */
// outer walls and the glass facade (the Management Office runs up to it) are drawn separately
const onPerimeter = ([x1, y1, x2, y2]: Seg) =>
  (y1 === y2 && (y1 === B.y1 || y1 === B.y2)) ||
  (x1 === x2 && (x1 === B.x2 || x1 === LB_DIVIDER.x2))
const ENCLOSED = LB_ROOMS.filter((q) => !q.open)
/** Black marble stays in the hall; past the glass walls (see lbCream) walls are cream marble */
const segCream = ([x1, y1, x2, y2]: Seg) => lbCream(x1, y1) && lbCream(x2, y2)
const finishOf = (s: Seg) => (segCream(s) ? "creamMarble" : "marble")
/** A collinear wall segment lying inside another one (e.g. the Library's west wall within the office's east wall) */
const within = ([a, b, c, d]: Seg, [e, f, g, h]: Seg) =>
  (a === c &&
    e === g &&
    a === e &&
    Math.min(b, d) >= Math.min(f, h) &&
    Math.max(b, d) <= Math.max(f, h)) ||
  (b === d &&
    f === h &&
    b === f &&
    Math.min(a, c) >= Math.min(e, g) &&
    Math.max(a, c) <= Math.max(e, g))

/** Room walls (deduplicated, perimeter sides left to the outer walls) with the door openings cut out */
function buildWalls(): Seg[] {
  const seen = new Set<string>(),
    segs: Seg[] = []
  const add = (s: Seg) => {
    const k = s.join(",")
    if (!seen.has(k) && !onPerimeter(s)) {
      seen.add(k)
      segs.push(s)
    }
  }
  // a curved corner (south-west) shortens the west and south walls; the arc itself is the CurvedEntrance
  for (const q of ENCLOSED) {
    const R = q.curve ?? 0
    ;([
      [q.x1, q.y1, q.x2, q.y1],
      [q.x2, q.y1, q.x2, q.y2],
      [q.x1 + R, q.y2, q.x2, q.y2],
      [q.x1, q.y1, q.x1, q.y2 - R],
    ] as Seg[]).forEach(add)
  }
  return segs
    .filter((s) => !segs.some((o) => o !== s && within(s, o)))
    .flatMap((s) => {
      let out: Seg[] = [s]
      for (const [dx, dy] of ENCLOSED.map((q) => q.door)) {
        out = out.flatMap(([x1, y1, x2, y2]): Seg[] => {
          if (y1 === y2 && Math.abs(y1 - dy) < 1 && dx > x1 && dx < x2)
            return ([
              [x1, y1, dx - DOOR_PX / 2, y1],
              [dx + DOOR_PX / 2, y1, x2, y1],
            ] as Seg[]).filter((t) => t[2] - t[0] > 1)
          if (x1 === x2 && Math.abs(x1 - dx) < 1 && dy > y1 && dy < y2)
            return ([
              [x1, y1, x1, dy - DOOR_PX / 2],
              [x1, dy + DOOR_PX / 2, x1, y2],
            ] as Seg[]).filter((t) => t[3] - t[1] > 1)
          return [[x1, y1, x2, y2]]
        })
      }
      return out
    })
}

/** Full-height glass curtain wall along a plan segment (px): one glass pane with mullions about every 1.8 m and head/sill rails */
function GlassWall({
  x1,
  y1,
  x2,
  y2,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
}) {
  const ax = wx(x1),
    az = wz(y1),
    bx = wx(x2),
    bz = wz(y2)
  const L = Math.hypot(bx - ax, bz - az),
    n = Math.max(1, Math.round(L / 1.8))
  const frame = (
    <meshStandardMaterial color="#3a3d42" metalness={0.6} roughness={0.35} />
  )
  return (
    <group
      position={[(ax + bx) / 2, 0, (az + bz) / 2]}
      rotation={[0, -Math.atan2(bz - az, bx - ax), 0]}
    >
      <mesh position={[0, WALL_H / 2, 0]}>
        <boxGeometry args={[L, WALL_H, 0.05]} />
        <meshPhysicalMaterial
          color="#a8d8ff"
          transparent
          opacity={0.3}
          roughness={0.05}
        />
      </mesh>
      {Array.from({ length: n + 1 }, (_, i) => (
        <mesh
          key={i}
          position={[-L / 2 + (L * i) / n, WALL_H / 2, 0]}
          castShadow
        >
          <boxGeometry args={[0.07, WALL_H, 0.1]} />
          {frame}
        </mesh>
      ))}
      <mesh position={[0, WALL_H - 0.05, 0]}>
        <boxGeometry args={[L, 0.1, 0.12]} />
        {frame}
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[L, 0.08, 0.12]} />
        {frame}
      </mesh>
    </group>
  )
}

/** Front panel of the reception desk: the university name in brushed gold on charcoal */
function useDeskFront(text: string) {
  return useMemo(() => {
    const c = document.createElement("canvas")
    c.width = 2048
    c.height = 272
    const g = c.getContext("2d")!
    g.fillStyle = "#fbfaf7"
    g.fillRect(0, 0, c.width, c.height)
    g.fillStyle = "#1d4ed8"
    g.fillRect(0, c.height - 14, c.width, 14)
    g.fillStyle = "#1e3a8a"
    g.font = "700 128px system-ui, sans-serif"
    g.textAlign = "center"
    g.textBaseline = "middle"
    g.letterSpacing = "24px"
    g.fillText(text, c.width / 2, c.height / 2)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [text])
}

/** The one long reception desk in the open lobby (white, cream marble, blue name): front panel facing the hall, counter ledge, staff worktop */
function ReceptionDesk() {
  const tex = useTex()
  const front = useDeskFront(LB_DESK.text)
  const d = LB_DESK
  const X = wx((d.x1 + d.x2) / 2),
    L = sz(d.x2 - d.x1),
    D = sz(d.y2 - d.y1)
  const zf = wz(d.y2) // front face (south)
  const body = (
    <meshStandardMaterial color="#f7f6f2" roughness={0.4} metalness={0} />
  )
  const top = useMemo(() => {
    const t = tex.creamMarble.clone()
    t.repeat.set(L / 2.4, 0.2)
    t.needsUpdate = true
    return t
  }, [tex, L])
  return (
    <group position={[X, 0, 0]}>
      {/* front panel, counter ledge and the warm strip light under it */}
      <mesh position={[0, 0.55, zf - 0.15]} castShadow receiveShadow>
        <boxGeometry args={[L, 1.1, 0.3]} />
        {body}
      </mesh>
      <mesh position={[0, 0.56, zf + 0.002]}>
        <planeGeometry args={[L - 0.12, 0.93]} />
        <meshStandardMaterial
          map={front}
          emissive="#ffffff"
          emissiveMap={front}
          emissiveIntensity={0.25}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[0, 1.125, zf - 0.13]} castShadow>
        <boxGeometry args={[L + 0.08, 0.05, 0.44]} />
        <meshStandardMaterial map={top} color="#fff3dc" roughness={0.25} />
      </mesh>
      <mesh position={[0, 1.09, zf + 0.06]}>
        <boxGeometry args={[L - 0.2, 0.015, 0.02]} />
        <meshStandardMaterial
          color="#dbeafe"
          emissive="#93c5fd"
          emissiveIntensity={1.2}
        />
      </mesh>
      {/* staff side: worktop with end panels and two monitors */}
      <mesh
        position={[0, 0.74, zf - 0.3 - (D - 0.3) / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[L, 0.05, D - 0.3]} />
        <meshStandardMaterial map={top} color="#fff3dc" roughness={0.3} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[(s * (L - 0.06)) / 2, 0.55, zf - D / 2]}
          castShadow
        >
          <boxGeometry args={[0.06, 1.1, D]} />
          {body}
        </mesh>
      ))}
      {[-1.6, 1.6].map((u) => (
        <group key={u} position={[u, 0, zf - 0.42]}>
          <mesh position={[0, 1.02, 0]} rotation={[0, Math.PI, 0]}>
            <boxGeometry args={[0.56, 0.34, 0.03]} />
            <meshStandardMaterial
              color="#0b0b0d"
              emissive="#1e3a8a"
              emissiveIntensity={0.35}
              roughness={0.1}
            />
          </mesh>
          <mesh position={[0, 0.84, -0.03]}>
            <boxGeometry args={[0.05, 0.2, 0.05]} />
            <meshStandardMaterial {...steel} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function doorInfo(q: LBRoom) {
  if (q.curve) return { horizontal: true, inward: -1 } // curved entrance on the south-west corner: the room faces south
  const [dx, dy] = q.door
  const horizontal = Math.abs(dy - q.y1) < 1 || Math.abs(dy - q.y2) < 1
  const inward = horizontal
    ? Math.abs(dy - q.y1) < 1
      ? 1
      : -1
    : Math.abs(dx - q.x1) < 1
      ? 1
      : -1
  return { horizontal, inward }
}

/** Plan-px points along a room's rounded south-west corner, from angle a0 to a1 (deg; 90 = south end, 180 = west end) */
function arcPts(q: LBRoom, a0: number, a1: number, n: number): Pt[] {
  const R = q.curve ?? 0,
    cx = q.x1 + R,
    cy = q.y2 - R
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180
    return [cx + R * Math.cos(t), cy + R * Math.sin(t)]
  })
}
/** Straight pieces between consecutive arc points, laid out like Wall (box along local x) */
function ArcPieces({
  pts,
  y,
  h,
  t,
  children,
}: {
  pts: Pt[]
  y: number
  h: number
  t: number
  children: ReactNode
}) {
  return (
    <>
      {pts.slice(1).map((p, i) => {
        const ax = wx(pts[i][0]),
          az = wz(pts[i][1]),
          bx = wx(p[0]),
          bz = wz(p[1])
        return (
          <mesh
            key={i}
            position={[(ax + bx) / 2, y, (az + bz) / 2]}
            rotation={[0, -Math.atan2(bz - az, bx - ax), 0]}
            castShadow
          >
            <boxGeometry args={[Math.hypot(bx - ax, bz - az) + 0.02, h, t]} />
            {children}
          </mesh>
        )
      })}
    </>
  )
}

const BRASS = { color: "#b08d57", metalness: 0.9, roughness: 0.28 }
/** Cream-marble cladding over a black core face (along z at plan x, facing side), framed by brass edge trims and skirting */
function Cladding({
  x,
  y1,
  y2,
  side,
}: {
  x: number
  y1: number
  y2: number
  side: 1 | -1
}) {
  const L = sz(y2 - y1),
    H = WALL_H - 0.02
  return (
    <group
      position={[wx(x) + side * 0.015, 0, wz((y1 + y2) / 2)]}
      rotation={[0, side === 1 ? Math.PI / 2 : -Math.PI / 2, 0]}
    >
      <mesh position={[0, H / 2, 0]} receiveShadow>
        <boxGeometry args={[L, H, 0.02]} />
        <WallMaterial finish="creamMarble" w={L} h={H} />
      </mesh>
      <mesh position={[0, 0.06, 0.02]}>
        <boxGeometry args={[L, 0.12, 0.02]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      {[-1, 1].map((e) => (
        <mesh key={e} position={[(e * L) / 2, H / 2, 0.02]}>
          <boxGeometry args={[0.06, H, 0.04]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
      ))}
    </group>
  )
}

/** Curved Library entrance in the rounded corner: cream header, fixed curved glass at both ends, open middle, brass threshold */
function CurvedEntrance({ q, active }: { q: LBRoom; active: boolean }) {
  const H = 2.7,
    side = 16
  const glass = (
    <meshPhysicalMaterial
      color={active ? "#fdba74" : "#a8d8ff"}
      transparent
      opacity={0.35}
      roughness={0.05}
    />
  )
  const frame = (
    <meshStandardMaterial color="#b08d57" metalness={0.85} roughness={0.3} />
  )
  return (
    <group>
      <ArcPieces
        pts={arcPts(q, 90, 180, 10)}
        y={H + (WALL_H - H) / 2}
        h={WALL_H - H}
        t={WALL_T}
      >
        <WallMaterial finish="creamMarble" w={0.4} h={WALL_H - H} />
      </ArcPieces>
      <ArcPieces
        pts={arcPts(q, 90, 180, 10)}
        y={H - 0.03}
        h={0.07}
        t={WALL_T + 0.04}
      >
        {frame}
      </ArcPieces>
      <ArcPieces
        pts={arcPts(q, 90, 180, 10)}
        y={0.01}
        h={0.02}
        t={WALL_T + 0.1}
      >
        {frame}
      </ArcPieces>
      {[
        [90, 90 + side],
        [180 - side, 180],
      ].map(([a0, a1]) => (
        <ArcPieces
          key={a0}
          pts={arcPts(q, a0, a1, 3)}
          y={H / 2}
          h={H - 0.06}
          t={0.05}
        >
          {glass}
        </ArcPieces>
      ))}
      {[90 + side, 180 - side].map((a) => {
        const [p] = arcPts(q, a, a, 1)
        return (
          <mesh key={a} position={[wx(p[0]), H / 2, wz(p[1])]}>
            <boxGeometry args={[0.07, H, 0.07]} />
            {frame}
          </mesh>
        )
      })}
    </group>
  )
}

/** Hinged door in the wall opening: lintel, frame, leaf swung into the room (glass for the lounge, library and offices) */
function RoomDoor({ q, active }: { q: LBRoom; active: boolean }) {
  const tex = useTex()
  const { horizontal, inward } = doorInfo(q)
  const rot = horizontal
    ? inward === 1
      ? 0
      : Math.PI
    : inward === 1
      ? Math.PI / 2
      : -Math.PI / 2
  const W = sz(DOOR_PX),
    lw = W - 0.12
  const glass =
    q.kind === "lounge" || q.kind === "library" || q.kind === "office"
  const plate = active ? "#f97316" : LB_COLOR[q.kind]
  const cream = lbCream(q.door[0], q.door[1])
  return (
    <group position={[wx(q.door[0]), 0, wz(q.door[1])]} rotation={[0, rot, 0]}>
      <mesh position={[0, DOOR_H + (WALL_H - DOOR_H) / 2, 0]} castShadow>
        <boxGeometry args={[W + 0.02, WALL_H - DOOR_H, WALL_T]} />
        <WallMaterial
          finish={cream ? "creamMarble" : "marble"}
          w={W}
          h={WALL_H - DOOR_H}
        />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * (W - 0.05)) / 2, DOOR_H / 2, 0]}>
          <boxGeometry args={[0.07, DOOR_H, WALL_T + 0.06]} />
          <meshStandardMaterial
            color="#2b2e33"
            metalness={0.6}
            roughness={0.35}
          />
        </mesh>
      ))}
      <mesh position={[0, DOOR_H - 0.03, 0]}>
        <boxGeometry args={[W, 0.07, WALL_T + 0.06]} />
        <meshStandardMaterial
          color="#2b2e33"
          metalness={0.6}
          roughness={0.35}
        />
      </mesh>
      <group position={[-lw / 2, 0, WALL_T / 2]} rotation={[0, -0.75, 0]}>
        <mesh position={[lw / 2, (DOOR_H - 0.08) / 2, 0.025]} castShadow>
          <boxGeometry args={[lw, DOOR_H - 0.08, 0.05]} />
          {glass ? (
            <meshPhysicalMaterial
              color="#bfe3ff"
              transparent
              opacity={0.4}
              roughness={0.05}
            />
          ) : (
            <meshStandardMaterial map={tex.wood} roughness={0.55} />
          )}
        </mesh>
        <mesh position={[lw - 0.14, 1.05, 0.09]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, 0.2]} />
          <meshStandardMaterial {...steel} />
        </mesh>
      </group>
      {/* name plate above the door, corridor side */}
      <mesh
        position={[0, DOOR_H + 0.35, -WALL_T / 2 - 0.02]}
        rotation={[0, Math.PI, 0]}
      >
        <planeGeometry args={[1.1, 0.3]} />
        <meshStandardMaterial
          color={plate}
          emissive={plate}
          emissiveIntensity={0.5}
        />
      </mesh>
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[W, 0.02, WALL_T + 0.1]} />
        <meshStandardMaterial color="#aab0b8" metalness={0.9} roughness={0.4} />
      </mesh>
    </group>
  )
}

/* ---------- room floors ---------- */
/** Polished cream marble for the open lobby floor, tiled in world units like the cream walls */
function OpenFloorMaterial({
  w,
  h,
  active,
  hover,
}: {
  w: number
  h: number
  active: boolean
  hover: boolean
}) {
  const tex = useTex()
  const map = useMemo(() => {
    const t = tex.creamMarble.clone()
    t.repeat.set(w / 2.4, h / 2.4)
    t.needsUpdate = true
    return t
  }, [tex, w, h])
  return (
    <meshStandardMaterial
      map={map}
      color={active ? "#fdba74" : hover ? "#fde68a" : "#fff6e6"}
      roughness={0.22}
      metalness={0}
      envMapIntensity={0.6}
      emissive={active ? "#f97316" : "#000"}
      emissiveIntensity={active ? 0.25 : 0}
    />
  )
}
const TINT: Partial<Record<LBKind, string>> = {
  lounge: "#efe2cf",
  office: "#e8dcc6",
  library: "#e9d9bd",
  lab: "#eef2f5",
  computer: "#e6e8f5",
  men: "#dde8fb",
  women: "#fbe4ef",
}
function RoomFloor({
  q,
  active,
  hover,
}: {
  q: LBRoom
  active: boolean
  hover: boolean
}) {
  const tex = useTex()
  const curved = useMemo(() => (q.curve ? curvedFloor(q) : null), [q])
  if (q.open) {
    // open lobby: cream marble laid over the black slab with a blue inlay border, tinted when hovered / selected
    return (
      <group
        position={[wx((q.x1 + q.x2) / 2), 0, wz((q.y1 + q.y2) / 2)]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <mesh position={[0, 0, 0.008]} receiveShadow>
          <planeGeometry args={[sz(q.x2 - q.x1), sz(q.y2 - q.y1)]} />
          <meshStandardMaterial color="#2f5fb3" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.012]} receiveShadow>
          <planeGeometry
            args={[sz(q.x2 - q.x1) - 0.5, sz(q.y2 - q.y1) - 0.5]}
          />
          <OpenFloorMaterial
            w={sz(q.x2 - q.x1) - 0.5}
            h={sz(q.y2 - q.y1) - 0.5}
            active={active}
            hover={hover}
          />
        </mesh>
      </group>
    )
  }
  const carpet =
    q.kind === "office" || q.kind === "library" || q.kind === "lounge"
  const mat = (
    <meshStandardMaterial
      map={carpet ? tex.carpet : tex.plaster}
      color={
        active ? "#fdba74" : hover ? "#fde68a" : (TINT[q.kind] ?? "#ffffff")
      }
      roughness={carpet ? 0.95 : 0.3}
      emissive={active ? "#f97316" : "#000"}
      emissiveIntensity={active ? 0.25 : 0}
    />
  )
  if (curved)
    return (
      <mesh
        geometry={curved}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.012, 0]}
        receiveShadow
      >
        {mat}
      </mesh>
    )
  return (
    <mesh
      position={[wx((q.x1 + q.x2) / 2), 0.012, wz((q.y1 + q.y2) / 2)]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[sz(q.x2 - q.x1), sz(q.y2 - q.y1)]} />
      {mat}
    </mesh>
  )
}

/** Floor of a room with a rounded south-west corner, UVs spanning the room's box (like the plane floors) */
function curvedFloor(q: LBRoom) {
  const P = ([x, y]: Pt) => new THREE.Vector2(wx(x), -wz(y))
  const s = new THREE.Shape([
    P([q.x1, q.y1]),
    P([q.x2, q.y1]),
    P([q.x2, q.y2]),
    ...arcPts(q, 90, 180, 12).map(P),
  ])
  const g = new THREE.ShapeGeometry(s)
  const pos = g.attributes.position,
    uv = g.attributes.uv
  for (let i = 0; i < pos.count; i++)
    uv.setXY(
      i,
      (pos.getX(i) - wx(q.x1)) / sz(q.x2 - q.x1),
      (pos.getY(i) + wz(q.y2)) / sz(q.y2 - q.y1),
    )
  return g
}

/** Cream-marble corridor floors past the glass walls (over the black slab, under the room floors) */
function CreamFloors() {
  const tex = useTex()
  return (
    <>
      {LB_CREAM_FLOORS.map(([x1, y1, x2, y2], i) => {
        const w = sz(x2 - x1),
          h = sz(y2 - y1)
        return (
          <CreamPlane
            key={i}
            x={wx((x1 + x2) / 2)}
            z={wz((y1 + y2) / 2)}
            w={w}
            h={h}
            map={tex.creamMarble}
          />
        )
      })}
    </>
  )
}
function CreamPlane({
  x,
  z,
  w,
  h,
  map,
}: {
  x: number
  z: number
  w: number
  h: number
  map: THREE.Texture
}) {
  const t = useMemo(() => {
    const c = map.clone()
    c.repeat.set(w / 2.4, h / 2.4)
    c.needsUpdate = true
    return c
  }, [map, w, h])
  return (
    <mesh
      position={[x, 0.006, z]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial
        map={t}
        color="#fff6e6"
        roughness={0.22}
        metalness={0}
        envMapIntensity={0.6}
      />
    </mesh>
  )
}

/* ---------- furniture (instanced: one draw call per part for the whole floor) ---------- */
type Part = "wood" | "tint" | "steel" | "screen" | "leaf"
type Bag = Record<Part, I[]>
const BOOKS = [
  "#7f1d1d",
  "#1e3a8a",
  "#14532d",
  "#a16207",
  "#334155",
  "#9a3412",
  "#f5f5f4",
  "#4c1d95",
]
const CHAIR = "#1f2937"

function furnish(q: LBRoom, b: Bag) {
  // u runs along the door wall, v is the distance from it into the room
  const X1 = wx(q.x1),
    X2 = wx(q.x2),
    Z1 = wz(q.y1),
    Z2 = wz(q.y2)
  const { horizontal, inward } = doorInfo(q)
  const front = horizontal ? (inward === 1 ? Z1 : Z2) : inward === 1 ? X1 : X2
  const [U1, U2] = horizontal ? [X1, X2] : [Z1, Z2]
  const depth = horizontal ? Z2 - Z1 : X2 - X1,
    len = U2 - U1,
    mid = (U1 + U2) / 2
  const put = (
    part: Part,
    u: number,
    y: number,
    v: number,
    su: number,
    sy: number,
    sv: number,
    c?: string,
  ) => {
    const w = front + inward * v
    b[part].push(
      horizontal
        ? { p: [u, y, w], s: [su, sy, sv], c }
        : { p: [w, y, u], s: [sv, sy, su], c },
    )
  }
  const along = (step: number, margin = 0.6) => {
    const n = Math.max(1, Math.floor((len - margin * 2) / step))
    return Array.from(
      { length: n },
      (_, i) => U1 + margin + ((len - margin * 2) / n) * (i + 0.5),
    )
  }
  // seated person faces +v (towards the desk)
  const chair = (u: number, v: number, c = CHAIR) => {
    put("tint", u, 0.46, v, 0.46, 0.08, 0.46, c)
    put("tint", u, 0.78, v - 0.22, 0.46, 0.56, 0.06, c)
    put("steel", u, 0.22, v, 0.05, 0.44, 0.05)
  }
  const desk = (u: number, v: number, w: number, screen: boolean) => {
    put("wood", u, 0.74, v, w, 0.05, 0.7)
    for (const s of [-1, 1])
      put("steel", u + s * (w / 2 - 0.05), 0.37, v, 0.05, 0.72, 0.6)
    if (screen) {
      put("screen", u, 1.04, v + 0.22, 0.55, 0.34, 0.03)
      put("steel", u, 0.86, v + 0.25, 0.05, 0.2, 0.05)
    }
  }
  const cabinets = (v: number, c = "#cbd5e1") => {
    put("tint", mid, 0.45, v, len - 0.6, 0.9, 0.6, c)
    put("tint", mid, 0.92, v, len - 0.6, 0.04, 0.62, "#1f2937")
  }
  switch (q.kind) {
    case "office":
      for (let v = 1.5; v + 0.5 < depth - 0.6; v += 1.9)
        for (const u of along(1.7)) {
          desk(u, v, 1.4, true)
          chair(u, v - 0.6)
        }
      cabinets(depth - 0.3, "#d6d3d1")
      break
    case "computer":
      for (const v of [1.3, depth - 0.4])
        for (const u of along(1.1)) {
          desk(u, v, 1, true)
          chair(u, v - 0.6, "#312e81")
        }
      break
    case "lab": {
      const rows: number[] = []
      for (let v = 1.5; v + 0.35 <= depth - 1; v += 2) rows.push(v)
      if (!rows.length && depth > 2.5) rows.push(Math.max(1.1, depth - 1.5))
      for (const v of rows) {
        put("tint", mid, 0.43, v, len - 1.4, 0.86, 0.7, "#e2e8f0")
        put("tint", mid, 0.89, v, len - 1.3, 0.05, 0.78, "#f8fafc")
        for (const u of along(0.9, 1)) {
          put("tint", u, 0.65, v - 0.7, 0.36, 0.06, 0.36, "#0e7490")
          put("steel", u, 0.32, v - 0.7, 0.05, 0.62, 0.05)
        }
      }
      cabinets(depth - 0.32)
      // chemistry lab: fume hood at the end of the wall bench
      if (q.id === "lb-chem") {
        put("tint", U2 - 0.9, 1.1, depth - 0.45, 1.2, 2.2, 0.8, "#e5e7eb")
        put("screen", U2 - 0.9, 1.35, depth - 0.86, 1.05, 0.7, 0.02)
      }
      break
    }
    case "library":
      for (const u of along(2, 0.3)) {
        put("tint", u, 1.05, depth - 0.23, 1.9, 2.1, 0.42, "#6b4f3a")
        if (!LOW)
          for (let k = 0; k < 4; k++)
            for (let j = 0; j < 6; j++)
              put(
                "tint",
                u - 0.78 + j * 0.31,
                0.34 + k * 0.47,
                depth - 0.45,
                0.28,
                0.32,
                0.05,
                BOOKS[(j * 3 + k * 5 + Math.round(u * 7)) % BOOKS.length],
              )
      }
      for (const u of along(3, 0.8)) {
        put("wood", u, 0.74, 1.25, 2.2, 0.05, 0.9)
        for (const s of [-1, 1])
          put("steel", u + s * 1, 0.37, 1.25, 0.05, 0.72, 0.8)
        for (const s of [-0.6, 0.6]) chair(u + s, 0.55, "#7c2d12")
      }
      break
    case "lounge":
      for (const v of [2.2, 5.1, 8]) {
        if (v + 1.2 > depth) continue
        put("tint", mid, 0.01, v, 3, 0.02, 2.4, "#d8c8a8")
        put("wood", mid, 0.2, v, 0.6, 0.38, 1.1)
        for (const s of [-1, 1]) {
          put("tint", mid + s * 1.15, 0.22, v, 0.85, 0.42, 2, "#334155")
          put("tint", mid + s * 1.5, 0.64, v, 0.2, 0.46, 2, "#334155")
        }
      }
      for (const [u, v] of [
        [U1 + 0.5, depth - 0.5],
        [U2 - 0.5, depth - 0.5],
        [U1 + 0.5, 3.65],
        [U2 - 0.5, 6.55],
      ]) {
        put("tint", u, 0.25, v, 0.45, 0.5, 0.45, "#d6d3d1")
        put("leaf", u, 0.95, v, 0.9, 1.1, 0.9)
      }
      break
    case "men":
    case "women": {
      const n = Math.max(1, Math.floor((len - 0.2) / 1.05)),
        cw = (len - 0.2) / n
      for (let i = 0; i < n; i++) {
        const u = U1 + 0.1 + cw * (i + 0.5)
        put(
          "tint",
          u - cw / 2,
          1.05,
          depth - 0.7,
          0.05,
          1.9,
          1.4,
          q.kind === "men" ? "#93c5fd" : "#f9a8d4",
        )
        put(
          "tint",
          u - 0.08,
          1.05,
          depth - 1.4,
          cw - 0.35,
          1.9,
          0.05,
          q.kind === "men" ? "#bfdbfe" : "#fbcfe8",
        )
        put("tint", u, 0.21, depth - 0.4, 0.4, 0.42, 0.6, "#ffffff")
      }
      put(
        "tint",
        mid,
        0.85,
        depth - 2.3,
        Math.min(len - 0.4, 1.6),
        0.1,
        0.55,
        "#f5f5f4",
      )
      break
    }
  }
}

function Furniture() {
  const tex = useTex()
  const b = useMemo(() => {
    const bag: Bag = { wood: [], tint: [], steel: [], screen: [], leaf: [] }
    ENCLOSED.forEach((q) => furnish(q, bag))
    return bag
  }, [])
  const sphere = useMemo(() => new THREE.SphereGeometry(0.5, 14, 10), [])
  return (
    <group>
      <Inst items={b.wood}>
        <meshStandardMaterial map={tex.wood} roughness={0.5} />
      </Inst>
      <Inst items={b.tint}>
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </Inst>
      <Inst items={b.steel} cast={false}>
        <meshStandardMaterial {...steel} />
      </Inst>
      <Inst items={b.screen}>
        <meshStandardMaterial
          color="#0b0b0d"
          emissive="#1e3a8a"
          emissiveIntensity={0.35}
          roughness={0.1}
        />
      </Inst>
      <Inst items={b.leaf} geo={sphere}>
        <meshStandardMaterial color="#2f7d4a" roughness={0.8} />
      </Inst>
    </group>
  )
}

/* ---------- camera ---------- */
/** Wide screens aim a little to the right so the labs stay visible beside the side panel */
export const lbTarget = (width: number): [number, number, number] =>
  width >= 640 ? [6, 0, 0] : [0, 0, 0]
export function LobbyCamera() {
  const { camera, size } = useThree()
  useEffect(() => {
    const [tx, , tz] = lbTarget(size.width)
    // the lobby is wider than the other floors: allow a little more distance on portrait phones
    const k = Math.min(3.2, Math.max(1, 1.8 / (size.width / size.height)))
    camera.position.set(tx + 28 * k, 34 * k, tz + 38 * k)
    camera.lookAt(tx, 0, tz)
    camera.updateProjectionMatrix()
  }, [camera, size.width, size.height])
  return null
}

export default function LobbyScene({
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
  const walls = useMemo(buildWalls, [])
  const conv = (x: number, y: number): Pt => [wx(x), wz(y)]
  const click = (id: string) => (e: { stopPropagation: () => void }) => {
    if (nav.picking || !onPick) return
    e.stopPropagation()
    onPick(id)
  }
  const pick = (id: string) => () => {
    if (!nav.picking && onPick) onPick(id)
  }
  const hoverProps = (id: string): HoverProps => ({
    onPointerOver: (e) => {
      e.stopPropagation()
      setHover(id)
      document.body.style.cursor = "pointer"
    },
    onPointerOut: () => {
      setHover(null)
      document.body.style.cursor = ""
    },
  })
  const a = (id: string) => activeId === id
  const liftActive = a("lb-lift")
  const pin = (q: LBRoom, h = WALL_H + 0.35) => (
    <PinTag
      key={q.id}
      position={[wx((q.x1 + q.x2) / 2), h, wz((q.y1 + q.y2) / 2)]}
      distanceFactor={52}
      color={LB_COLOR[q.kind]}
      icon={<LBIcon kind={q.kind} />}
      text={q.label}
      active={a(q.id)}
      show={hover === q.id}
      onClick={pick(q.id)}
    />
  )
  const dz = wz(LB_DIVIDER.door),
    dxw = wx((LB_DIVIDER.x1 + LB_DIVIDER.x2) / 2),
    dh = sz(LB_DOOR_HALF)
  const gx = (LB_DIVIDER.x1 + LB_DIVIDER.x2) / 2,
    G = LB_LOBBY_GLASS
  return (
    <>
      <>
        <hemisphereLight args={["#fff6e8", "#9aa3b2", 0.6]} />
        <directionalLight
          position={[22, 40, 18]}
          intensity={1.8}
          color="#fff4e0"
          castShadow
          shadow-bias={-0.0004}
          shadow-mapSize={[Q.shadowMap, Q.shadowMap]}
          shadow-camera-left={-40}
          shadow-camera-right={40}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
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
      </>
      <group
        ref={root}
        onClick={(e) => {
          if (!nav.picking || !root.current) return
          e.stopPropagation()
          const l = root.current.worldToLocal(e.point.clone())
          nav.onSet([l.x * S + 600, l.z * S + 322])
        }}
      >
        <BuildingSlab />
        <CreamFloors />
        <CarDeck
          active={a(LB_CARPARK.id)}
          hover={hover === LB_CARPARK.id}
          onPick={pick(LB_CARPARK.id)}
          hoverProps={hoverProps(LB_CARPARK.id)}
        />

        {/* outer walls of the building part, and the full-height glass wall with the double door to the car park in the middle */}
        {/* (south wall split behind the corner of Tangga Darurat 2: black marble along the hall, cream in the lab corridor) */}
        {([
          [LB_DIVIDER.x2, B.y1, B.x2, B.y1],
          [B.x2, B.y1, B.x2, B.y2],
          [LB_DIVIDER.x2, B.y2, 1057, B.y2],
          [1057, B.y2, B.x2, B.y2],
        ] as Seg[]).map((s, i) => (
          <Wall
            key={i}
            x1={s[0]}
            y1={s[1]}
            x2={s[2]}
            y2={s[3]}
            finish={finishOf(s)}
          />
        ))}
        <GlassWall
          x1={gx}
          y1={B.y1}
          x2={gx}
          y2={LB_DIVIDER.door - LB_DOOR_HALF}
        />
        <GlassWall
          x1={gx}
          y1={LB_DIVIDER.door + LB_DOOR_HALF}
          x2={gx}
          y2={B.y2}
        />
        <GlassDoor
          x={dxw}
          z0={dz - dh}
          z1={dz + dh}
          id="lb-deckdoor"
          ctx={ctx}
          glassTop
        />
        {/* glass wall in front of the lobby, facade to Lift Barang, with the double door in the middle (door turned to run along x) */}
        <GlassWall x1={G.x1} y1={G.y} x2={G.door - LB_DOOR_HALF} y2={G.y} />
        <GlassWall x1={G.door + LB_DOOR_HALF} y1={G.y} x2={G.x2} y2={G.y} />
        <group
          position={[wx(G.door), 0, wz(G.y)]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <GlassDoor
            x={0}
            z0={-dh}
            z1={dh}
            id="lb-lobbydoor"
            ctx={ctx}
            glassTop
          />
        </group>
        {/* east glass wall, end to end from Toilet Wanita to Tangga Darurat 2, with the double door to the lab corridor */}
        <GlassWall
          x1={LB_EAST_GLASS.x}
          y1={LB_EAST_GLASS.y1}
          x2={LB_EAST_GLASS.x}
          y2={LB_EAST_GLASS.door - LB_DOOR_HALF}
        />
        <GlassWall
          x1={LB_EAST_GLASS.x}
          y1={LB_EAST_GLASS.door + LB_DOOR_HALF}
          x2={LB_EAST_GLASS.x}
          y2={LB_EAST_GLASS.y2}
        />
        <GlassDoor
          x={wx(LB_EAST_GLASS.x)}
          z0={wz(LB_EAST_GLASS.door) - dh}
          z1={wz(LB_EAST_GLASS.door) + dh}
          id="lb-eastdoor"
          ctx={ctx}
          glassTop
        />
        {LB_WALLS.map(([x1, y1, x2, y2], i) => (
          <Core key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
        {LB_CREAM_WALLS.map(([x1, y1, x2, y2], i) => (
          <Core
            key={"c" + i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            finish="creamMarble"
          />
        ))}
        {/* black -> cream transition: cream cladding on core faces inside the cream zone, brass posts at the glass junctions */}
        {LB_CLADDING.map((c, i) => (
          <Cladding key={"cl" + i} {...c} />
        ))}
        {LB_BRASS_POSTS.map(([x, y], i) => (
          <mesh key={"bp" + i} position={[wx(x), WALL_H / 2, wz(y)]} castShadow>
            <boxGeometry args={[0.16, WALL_H, 0.16]} />
            <meshStandardMaterial {...BRASS} />
          </mesh>
        ))}

        {/* rooms */}
        {LB_ROOMS.map((q) => (
          <group key={q.id} onClick={click(q.id)} {...hoverProps(q.id)}>
            <RoomFloor q={q} active={a(q.id)} hover={hover === q.id} />
          </group>
        ))}
        {walls.map((s, i) => (
          <Wall
            key={i}
            x1={s[0]}
            y1={s[1]}
            x2={s[2]}
            y2={s[3]}
            finish={segCream(s) ? "creamMarble" : "marble"}
          />
        ))}
        {ENCLOSED.filter((q) => !q.curve).map((q) => (
          <RoomDoor key={q.id} q={q} active={a(q.id)} />
        ))}
        {ENCLOSED.filter((q) => q.curve).map((q) => (
          <CurvedEntrance key={q.id} q={q} active={a(q.id)} />
        ))}
        <Furniture />
        <group onClick={click("lb-lobby")} {...hoverProps("lb-lobby")}>
          <ReceptionDesk />
        </group>

        {/* lift banks on the same shafts as the Ground Floor */}
        <Core {...LB_BANK_A} />
        <Core {...LB_BANK_B} />
        <ZoneSign
          x={820}
          y={LB_BANK_A.y2}
          face={1}
          text="LIFT  G – 19"
          sub="Lantai G sampai 19"
          color="#2f6fed"
        />
        <ZoneSign
          x={820}
          y={LB_BANK_B.y1}
          face={-1}
          text="LIFT  19 – 33"
          sub="Lantai 19 sampai 33"
          color="#7c3aed"
        />
        {LB_LIFT_X.map((x, i) => (
          <group key={"a" + i} onClick={click("lb-lift")}>
            <Lift
              x={x}
              y={LB_BANK_A.y1}
              w={LB_LIFT_W}
              h={LB_BANK_A.y2 - LB_BANK_A.y1}
              face={1}
              kind="lift"
              id={liftActive ? "lb-lift" : "lb-lift" + i}
              ctx={liftActive ? { ...ctx, hover: "lb-lift" } : ctx}
              bare
              noSign
              label={`Lift A${i + 1} · G–19`}
            />
          </group>
        ))}
        {LB_LIFT_X.map((x, i) => (
          <Lift
            key={"b" + i}
            x={x}
            y={LB_BANK_B.y1}
            w={LB_LIFT_W}
            h={LB_BANK_B.y2 - LB_BANK_B.y1}
            face={-1}
            kind="lift"
            id={"lb-liftb" + i}
            ctx={ctx}
            bare
            noSign
            label={`Lift B${i + 1} · 19–33`}
          />
        ))}
        <PinTag
          position={[wx(820), WALL_H + 0.35, wz(164)]}
          distanceFactor={52}
          color={LB_COLOR.lift}
          icon={<LBIcon kind="lift" />}
          text="Lift G–19"
          active={liftActive}
          show={!!hover?.startsWith("lb-lift") && !hover.startsWith("lb-liftb")}
          onClick={pick("lb-lift")}
        />

        {/* Lift Barang, emergency stairs and the escalator (arriving from the Ground Floor through the slab) */}
        {LB_CORE.map((q) => (
          <group key={q.id} onClick={click(q.id)}>
            {q.kind === "cargo" && (
              <Lift
                x={q.x1}
                y={q.y1}
                w={q.x2 - q.x1}
                h={q.y2 - q.y1}
                face={1}
                kind="cargo"
                id={q.id}
                ctx={ctx}
                label={q.label}
              />
            )}
            {q.kind === "stairs" && (
              <Stairs
                x={q.x1}
                y={q.y1}
                w={q.x2 - q.x1}
                h={q.y2 - q.y1}
                doorFace={-1}
                id={q.id}
                ctx={ctx}
                label={q.label}
              />
            )}
            {q.kind === "escalator" && (
              <group position={[0, -3.2, 0]}>
                <Escalator
                  x={q.x1}
                  y={q.y1}
                  w={q.x2 - q.x1}
                  h={q.y2 - q.y1}
                  id={q.id}
                  ctx={ctx}
                />
              </group>
            )}
          </group>
        ))}
        <WellRail />

        {/* pictograms: name on hover / when selected */}
        {LB_ROOMS.map((q) => pin(q))}
        {pin(LB_CARPARK, 2.6)}

        {nav.yah && <YouAreHere p={nav.yah} conv={conv} size={0.7} y={0.05} />}
        {nav.leg && (
          <RouteLine leg={nav.leg} conv={conv} width={0.7} y={0.05} pin={2.6} />
        )}
      </group>
      {!LOW && (
        <ContactShadows
          position={[0, 0.02, 0]}
          opacity={0.4}
          scale={80}
          blur={2}
          far={6}
          resolution={Q.contactRes}
          frames={1}
        />
      )}
    </>
  )
}
