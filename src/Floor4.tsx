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
  Core,
  Lift,
  PinTag,
  S,
  WALL_H,
  WALL_T,
  Wall,
  WallMaterial,
  ZoneSign,
  steel,
  sz,
  useTex,
  wx,
  wz,
  type Ctx,
} from "./Building3D"
import {
  F4_CORE,
  F4_H,
  F4_LIFTS,
  F4_LIFT_CORE,
  F4_ROOMS,
  F4_VOID,
  F4_W,
  F4_WALLS,
  P4_COLOR,
  P4Icon,
  doorInfo,
  polyOf,
  type P4Kind,
  type Room,
} from "./Floor4Data"

/*
 * Lantai 4 in 3D, built from the same parts as the ground floor (marble walls with brass skirting,
 * marble cores, stainless lifts, procedural tile/carpet/wood textures). Design px → world via wx/wz
 * (S = 20); the whole floor is offset so the plan is centred on the origin.
 */
const OFF: [number, number, number] = [
  (600 - F4_W / 2) / S,
  0,
  (322 - F4_H / 2) / S,
]
const DOOR_PX = 36
const DOOR_H = 2.6
const ALL = [...F4_ROOMS, ...F4_CORE]

type Seg = [number, number, number, number]
const onFrame = ([x1, y1, x2, y2]: Seg) =>
  (x1 === x2 && (x1 === 0 || x1 === F4_W)) ||
  (y1 === y2 && (y1 === 0 || y1 === F4_H))

/** Every wall segment (deduplicated), with door openings cut out */
function buildWalls(): Seg[] {
  const seen = new Set<string>()
  const segs: Seg[] = []
  const add = (a: number, b: number, c: number, d: number) => {
    const s: Seg = a < c || (a === c && b < d) ? [a, b, c, d] : [c, d, a, b]
    const k = s.join(",")
    if (seen.has(k) || onFrame(s)) return
    seen.add(k)
    segs.push(s)
  }
  // cargo shaft is a solid core block, so it gets no separate walls
  for (const q of ALL.filter((r) => r.kind !== "cargo")) {
    const p = polyOf(q)
    p.forEach((a, i) => {
      const b = p[(i + 1) % p.length]
      add(a[0], a[1], b[0], b[1])
    })
  }
  F4_WALLS.forEach(([a, b, c, d]) => add(a, b, c, d))
  let out = segs
  for (const [dx, dy] of ALL.map((q) => q.door)) {
    out = out.flatMap(([x1, y1, x2, y2]): Seg[] => {
      if (y1 === y2 && Math.abs(y1 - dy) < 1 && dx > x1 && dx < x2)
        return ([
          [x1, y1, dx - DOOR_PX / 2, y1],
          [dx + DOOR_PX / 2, y1, x2, y1],
        ] as Seg[]).filter((s) => s[2] - s[0] > 1)
      if (x1 === x2 && Math.abs(x1 - dx) < 1 && dy > y1 && dy < y2)
        return ([
          [x1, y1, x1, dy - DOOR_PX / 2],
          [x1, dy + DOOR_PX / 2, x1, y2],
        ] as Seg[]).filter((s) => s[3] - s[1] > 1)
      return [[x1, y1, x2, y2]]
    })
  }
  return out
}

/* ---------- doors ---------- */
type DoorStyle = "wood" | "fire" | "glass"
const styleOf = (k: P4Kind): DoorStyle =>
  k === "stairs" ? "fire" : k === "office" ? "glass" : "wood"

/** Real hinged door in the wall opening: frame, lintel up to the ceiling line, leaf swung open into the room, handle and sign */
function RoomDoor({ q, active }: { q: Room; active: boolean }) {
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
  const style = styleOf(q.kind)
  const open = style === "fire" ? 0.35 : 0.75
  const plate = active ? "#f97316" : P4_COLOR[q.kind]
  return (
    <group position={[wx(q.door[0]), 0, wz(q.door[1])]} rotation={[0, rot, 0]}>
      {/* lintel */}
      <mesh position={[0, DOOR_H + (WALL_H - DOOR_H) / 2, 0]} castShadow>
        <boxGeometry args={[W + 0.02, WALL_H - DOOR_H, WALL_T]} />
        <WallMaterial finish="creamMarble" w={W + 0.02} h={WALL_H - DOOR_H} />
      </mesh>
      {/* frame */}
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
      {/* hinged leaf, pivot on the left jamb, swung into the room (+z) */}
      <group position={[-lw / 2, 0, WALL_T / 2]} rotation={[0, -open, 0]}>
        <group position={[lw / 2, (DOOR_H - 0.08) / 2, 0.025]}>
          <mesh castShadow>
            <boxGeometry args={[lw, DOOR_H - 0.08, 0.05]} />
            {style === "glass" ? (
              <meshPhysicalMaterial
                color="#bfe3ff"
                transparent
                opacity={0.4}
                roughness={0.05}
              />
            ) : style === "fire" ? (
              <meshStandardMaterial
                color="#b91c1c"
                metalness={0.35}
                roughness={0.45}
              />
            ) : (
              <meshStandardMaterial map={tex.wood} roughness={0.55} />
            )}
          </mesh>
          {/* handle (both sides) */}
          {[-1, 1].map((s) => (
            <mesh
              key={s}
              position={[lw / 2 - 0.14, -0.15, s * 0.06]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.025, 0.025, 0.2]} />
              <meshStandardMaterial {...steel} />
            </mesh>
          ))}
          {style === "fire" && (
            <mesh position={[0, -0.2, -0.06]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.03, 0.03, lw * 0.8]} />
              <meshStandardMaterial {...steel} />
            </mesh>
          )}
          {style === "glass" && (
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[lw, 0.08, 0.06]} />
              <meshStandardMaterial color="#2b2e33" metalness={0.6} />
            </mesh>
          )}
        </group>
      </group>
      {/* corridor-side sign above the door */}
      {style === "fire" ? (
        <mesh position={[0, DOOR_H + 0.35, -WALL_T / 2 - 0.06]}>
          <boxGeometry args={[1.2, 0.34, 0.1]} />
          <meshStandardMaterial
            color="#16a34a"
            emissive="#22c55e"
            emissiveIntensity={1.6}
          />
        </mesh>
      ) : (
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
      )}
      {/* threshold */}
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[W, 0.02, WALL_T + 0.1]} />
        <meshStandardMaterial color="#aab0b8" metalness={0.9} roughness={0.4} />
      </mesh>
    </group>
  )
}

/* ---------- floors ---------- */
function Slab() {
  const tex = useTex()
  const t = useMemo(() => {
    const c = tex.floor.clone()
    c.repeat.set(F4_W / 80, F4_H / 80)
    c.needsUpdate = true
    return c
  }, [tex])
  return (
    <>
      <mesh position={[wx(F4_W / 2), -0.25, wz(F4_H / 2)]} receiveShadow>
        <boxGeometry args={[sz(F4_W), 0.5, sz(F4_H)]} />
        <meshStandardMaterial map={t} roughness={0.18} metalness={0.2} />
      </mesh>
      {/* full-height outer walls around the whole floor */}
      {([
        [0, 0, F4_W, 0],
        [F4_W, 0, F4_W, F4_H],
        [0, F4_H, F4_W, F4_H],
        [0, 0, 0, F4_H],
      ] as Seg[]).map(([a, b, c, d], i) => (
        <Wall key={i} x1={a} y1={b} x2={c} y2={d} finish="creamMarble" />
      ))}
    </>
  )
}

function RoomFloor({
  q,
  active,
  hover,
}: {
  q: Room
  active: boolean
  hover: boolean
}) {
  const tex = useTex()
  const geo = useMemo(() => {
    const s = new THREE.Shape()
    polyOf(q).forEach(([x, y], i) =>
      i ? s.lineTo(wx(x), -wz(y)) : s.moveTo(wx(x), -wz(y)),
    )
    const g = new THREE.ShapeGeometry(s)
    const pos = g.attributes.position,
      uv = g.attributes.uv
    const bx = wx(q.x1),
      by = -wz(q.y2),
      w = sz(q.x2 - q.x1),
      h = sz(q.y2 - q.y1)
    for (let i = 0; i < pos.count; i++)
      uv.setXY(i, (pos.getX(i) - bx) / w, (pos.getY(i) - by) / h)
    return g
  }, [q])
  const carpet = q.kind === "room" || q.kind === "office" || q.kind === "staff"
  const tint = active
    ? "#fdba74"
    : hover
      ? "#fde68a"
      : carpet
        ? q.kind === "office"
          ? "#e8dcc6"
          : q.kind === "staff"
            ? "#cfe3df"
            : "#ffffff"
        : q.kind === "women"
          ? "#fbe4ef"
          : q.kind === "men"
            ? "#dde8fb"
            : "#e7e5e4"
  return (
    <mesh
      geometry={geo}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.012, 0]}
      receiveShadow
    >
      <meshStandardMaterial
        map={carpet ? tex.carpet : tex.plaster}
        color={tint}
        roughness={carpet ? 0.95 : 0.3}
        emissive={active ? "#f97316" : "#000"}
        emissiveIntensity={active ? 0.25 : 0}
      />
    </mesh>
  )
}

/* ---------- furniture ---------- */
const box = (
  key: string | number,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  mat: ReactElement,
  cast = true,
) => (
  <mesh key={key} position={[x, y, z]} castShadow={cast} receiveShadow>
    <boxGeometry args={[w, h, d]} />
    {mat}
  </mesh>
)

function MeetingSet({ q }: { q: Room }) {
  const tex = useTex()
  const cx = wx((q.x1 + q.x2) / 2),
    cz = wz((q.y1 + q.y2) / 2)
  const W = sz(q.x2 - q.x1),
    D = sz(q.y2 - q.y1)
  const alongZ = D > W
  const len = Math.min((alongZ ? D : W) * 0.55, 6),
    wid = Math.min((alongZ ? W : D) * 0.32, 1.6)
  const n = LOW ? 0 : Math.max(2, Math.floor(len / 1.1))
  const office = q.kind === "office"
  return (
    <group position={[cx, 0, cz]} rotation={[0, alongZ ? Math.PI / 2 : 0, 0]}>
      {box(
        "top",
        0,
        0.76,
        0,
        len,
        0.06,
        wid,
        <meshStandardMaterial map={tex.wood} roughness={0.4} />,
      )}
      {box(
        "leg",
        0,
        0.37,
        0,
        len * 0.7,
        0.72,
        0.12,
        <meshStandardMaterial color="#2b2e33" metalness={0.6} />,
        false,
      )}
      {Array.from({ length: n }).flatMap((_, i) => {
        const x = -len / 2 + (len / n) * (i + 0.5)
        return [-1, 1].map((s) => (
          <group
            key={i + "_" + s}
            position={[x, 0, s * (wid / 2 + 0.45)]}
            rotation={[0, s === 1 ? Math.PI : 0, 0]}
          >
            {box(
              "s",
              0,
              0.46,
              0,
              0.5,
              0.08,
              0.5,
              <meshStandardMaterial
                color={office ? "#334155" : "#1f2937"}
                roughness={0.7}
              />,
            )}
            {box(
              "b",
              0,
              0.8,
              0.24,
              0.5,
              0.6,
              0.06,
              <meshStandardMaterial
                color={office ? "#334155" : "#1f2937"}
                roughness={0.7}
              />,
            )}
            {box(
              "p",
              0,
              0.22,
              0,
              0.05,
              0.44,
              0.05,
              <meshStandardMaterial {...steel} />,
              false,
            )}
          </group>
        ))
      })}
      {/* wall display at the head of the table */}
      {!office &&
        box(
          "tv",
          len / 2 + 0.75,
          1.6,
          0,
          0.06,
          0.9,
          1.5,
          <meshStandardMaterial
            color="#0b0b0d"
            emissive="#1e3a8a"
            emissiveIntensity={0.35}
            roughness={0.1}
          />,
        )}
    </group>
  )
}

/* ---------- classrooms (instanced: one draw call per furniture part for all rooms) ---------- */
type Part = "top" | "panel" | "seat" | "back" | "post" | "tdesk" | "board" | "frame"
type Inst = {
  p: Part
  x: number
  y: number
  z: number
  sx: number
  sy: number
  sz: number
}

function classroomParts(q: Room): Inst[] {
  const { horizontal, inward } = doorInfo(q)
  const X1 = wx(q.x1),
    X2 = wx(q.x2),
    Z1 = wz(q.y1),
    Z2 = wz(q.y2)
  // u runs along the front (whiteboard) wall, v is the distance from that wall towards the door
  const [U1, U2] = horizontal ? [X1, X2] : [Z1, Z2]
  const front = horizontal ? (inward === 1 ? Z2 : Z1) : inward === 1 ? X2 : X1
  const dir = inward === 1 ? -1 : 1
  const depth = horizontal ? Z2 - Z1 : X2 - X1
  const out: Inst[] = []
  const put = (
    p: Part,
    u: number,
    v: number,
    y: number,
    su: number,
    sy: number,
    sv: number,
  ) => {
    const w = front + dir * v
    out.push(
      horizontal
        ? { p, x: u, y, z: w, sx: su, sy, sz: sv }
        : { p, x: w, y, z: u, sx: sv, sy, sz: su },
    )
  }
  const width = U2 - U1,
    mid = (U1 + U2) / 2
  put("frame", mid, 0.1, 1.65, Math.min(width * 0.6, 5) + 0.14, 1.34, 0.04)
  put("board", mid, 0.13, 1.65, Math.min(width * 0.6, 5), 1.2, 0.03)
  put("tdesk", mid, 1.5, 0.38, 1.5, 0.76, 0.7)
  const cols = Math.max(2, Math.floor((width - 1.2) / 1.35))
  const rows = LOW
    ? Math.max(1, Math.floor((depth - 4.6) / 2))
    : Math.max(1, Math.floor((depth - 4.4) / 1.35))
  const step = LOW ? 2 : 1.35
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const u = U1 + 0.6 + ((width - 1.2) / cols) * (c + 0.5)
      const v = 3 + r * step
      put("top", u, v, 0.74, 0.95, 0.05, 0.5)
      if (LOW) continue
      put("panel", u, v - 0.22, 0.38, 0.9, 0.7, 0.04)
      put("seat", u, v + 0.55, 0.45, 0.42, 0.05, 0.42)
      put("back", u, v + 0.76, 0.72, 0.42, 0.45, 0.05)
      put("post", u, v + 0.55, 0.22, 0.05, 0.44, 0.05)
    }
  return out
}

function InstancedPart({
  items,
  children,
}: {
  items: Inst[]
  children: ReactElement
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    // nothing is rendered for an empty list (e.g. details skipped on low-spec devices)
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4(),
      q = new THREE.Quaternion()
    items.forEach((it, i) =>
      mesh.setMatrixAt(
        i,
        m.compose(
          new THREE.Vector3(it.x, it.y, it.z),
          q,
          new THREE.Vector3(it.sx, it.sy, it.sz),
        ),
      ),
    )
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items])
  if (!items.length) return null
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, items.length]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      {children}
    </instancedMesh>
  )
}

function Classrooms({ rooms }: { rooms: Room[] }) {
  const tex = useTex()
  const all = useMemo(() => rooms.flatMap(classroomParts), [rooms])
  const of = (p: Part) => all.filter((i) => i.p === p)
  const parts = useMemo(
    () => ({
      top: of("top"),
      panel: of("panel"),
      seat: of("seat"),
      back: of("back"),
      post: of("post"),
      tdesk: of("tdesk"),
      board: of("board"),
      frame: of("frame"),
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    [all],
  )
  return (
    <group>
      <InstancedPart items={parts.top}>
        <meshStandardMaterial map={tex.wood} color="#f3dfc1" roughness={0.5} />
      </InstancedPart>
      <InstancedPart items={parts.panel}>
        <meshStandardMaterial color="#cbd5e1" roughness={0.6} />
      </InstancedPart>
      <InstancedPart items={parts.seat}>
        <meshStandardMaterial color="#1e3a8a" roughness={0.7} />
      </InstancedPart>
      <InstancedPart items={parts.back}>
        <meshStandardMaterial color="#1e3a8a" roughness={0.7} />
      </InstancedPart>
      <InstancedPart items={parts.post}>
        <meshStandardMaterial {...steel} />
      </InstancedPart>
      <InstancedPart items={parts.tdesk}>
        <meshStandardMaterial map={tex.wood} roughness={0.5} />
      </InstancedPart>
      <InstancedPart items={parts.frame}>
        <meshStandardMaterial color="#9ca3af" metalness={0.6} roughness={0.4} />
      </InstancedPart>
      <InstancedPart items={parts.board}>
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.15}
          roughness={0.15}
        />
      </InstancedPart>
    </group>
  )
}

function WcFixtures({ q }: { q: Room }) {
  // cubicles along the wall opposite the door, vanity with sinks along the other side
  const men = q.kind === "men"
  const x1 = men ? 545 : q.x1 + 4,
    x2 = men ? 630 : q.x2 - 4
  const y = men ? 273 : q.y2
  const dir = men ? 1 : -1
  const n = LOW ? 0 : men ? 3 : 2
  const cw = (x2 - x1) / Math.max(n, 1)
  const depth = sz(32)
  return (
    <group>
      {Array.from({ length: n }).map((_, i) => {
        const cx = wx(x1 + cw * (i + 0.5))
        const z = wz(y) + (dir * depth) / 2
        return (
          <group key={i} position={[cx, 0, z]}>
            {box(
              "side",
              sz(cw) / 2 - 0.03,
              1.05,
              0,
              0.05,
              1.9,
              depth,
              <meshStandardMaterial
                color={men ? "#93c5fd" : "#f9a8d4"}
                roughness={0.4}
              />,
            )}
            {box(
              "front",
              -0.15,
              1.05,
              (dir * depth) / 2,
              sz(cw) - 0.5,
              1.9,
              0.05,
              <meshStandardMaterial
                color={men ? "#bfdbfe" : "#fbcfe8"}
                roughness={0.4}
              />,
            )}
            <mesh position={[0, 0.25, (-dir * depth) / 4]} castShadow>
              <cylinderGeometry args={[0.2, 0.17, 0.45, 18]} />
              <meshStandardMaterial color="#ffffff" roughness={0.2} />
            </mesh>
          </group>
        )
      })}
      {/* vanity counter + mirror */}
      {men ? (
        <group position={[wx(678), 0, wz(395)]}>
          {box(
            "c",
            0,
            0.85,
            0,
            0.6,
            0.1,
            sz(70),
            <meshStandardMaterial color="#f5f5f4" roughness={0.15} />,
          )}
          {box(
            "m",
            0.28,
            1.6,
            0,
            0.03,
            0.9,
            sz(66),
            <meshStandardMaterial
              color="#dbeafe"
              metalness={0.9}
              roughness={0.05}
            />,
          )}
        </group>
      ) : (
        <group position={[wx(q.x1 + 10), 0, wz((q.y1 + q.y2) / 2 - 18)]}>
          {box(
            "c",
            0,
            0.85,
            0,
            0.6,
            0.1,
            sz(46),
            <meshStandardMaterial color="#f5f5f4" roughness={0.15} />,
          )}
          {box(
            "m",
            -0.28,
            1.6,
            0,
            0.03,
            0.9,
            sz(44),
            <meshStandardMaterial
              color="#fce7f3"
              metalness={0.9}
              roughness={0.05}
            />,
          )}
        </group>
      )}
    </group>
  )
}

function StaffFixtures({ q }: { q: Room }) {
  const tex = useTex()
  const left = q.id === "f4-kar1"
  const lx = wx(left ? q.x1 + 8 : q.x2 - 8)
  const n = LOW ? 3 : 6
  return (
    <group>
      {/* lockers along the outer wall */}
      {Array.from({ length: n }).map((_, i) => (
        <group key={i} position={[lx, 0, wz(q.y1 + 12) + i * 0.62 + 0.31]}>
          {box(
            "l",
            0,
            1,
            0,
            0.5,
            2,
            0.58,
            <meshStandardMaterial
              color="#94a3b8"
              metalness={0.5}
              roughness={0.4}
            />,
          )}
          {box(
            "h",
            left ? 0.26 : -0.26,
            1.1,
            0.15,
            0.02,
            0.15,
            0.03,
            <meshStandardMaterial {...steel} />,
            false,
          )}
        </group>
      ))}
      {/* pantry table */}
      <group position={[wx((q.x1 + q.x2) / 2), 0, wz(q.y2 - 45)]}>
        <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.6, 0.6, 0.05, 28]} />
          <meshStandardMaterial map={tex.wood} />
        </mesh>
        <mesh position={[0, 0.37, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.72]} />
          <meshStandardMaterial {...steel} />
        </mesh>
      </group>
    </group>
  )
}

function StairFlight({ q }: { q: Room }) {
  // two flights in the half of the shaft away from the door, rising in opposite directions
  const { inward } = doorInfo(q)
  const far = inward === 1 ? q.y2 : q.y1
  const half = (q.y2 - q.y1) / 2
  const n = LOW ? 6 : 10
  const len = sz(q.x2 - q.x1) - 1.2
  const fw = sz(half) / 2 - 0.05
  return (
    <group
      position={[wx((q.x1 + q.x2) / 2), 0, wz(far) - (inward * sz(half)) / 2]}
    >
      {[-1, 1].map((s) =>
        Array.from({ length: n }).map((_, i) => {
          const f = (i + 0.5) / n
          const x = s * (-len / 2 + f * len)
          const h = s === 1 ? f * 1.8 : 1.8 + f * 1.8
          return box(
            `${s}${i}`,
            x,
            h / 2,
            (s * fw) / 2 + s * 0.03,
            len / n,
            h,
            fw,
            <meshStandardMaterial
              color={s === 1 ? "#d6d3d1" : "#a8a29e"}
              roughness={0.7}
            />,
          )
        }),
      )}
      {box(
        "rail",
        0,
        1.3,
        0,
        len,
        0.06,
        0.06,
        <meshStandardMaterial color="#b91c1c" />,
        false,
      )}
    </group>
  )
}

/* ---------- labels ---------- */
/** Same pin as the other floors: pictogram first, the name on hover / when selected */
function Pictogram({
  p,
  kind,
  label,
  active,
  show,
  onClick,
}: {
  p: Pt
  kind: P4Kind
  label: string
  active: boolean
  show?: boolean
  onClick?: () => void
}) {
  return (
    <PinTag
      position={[wx(p[0]), WALL_H + 0.35, wz(p[1])]}
      distanceFactor={52}
      color={P4_COLOR[kind]}
      icon={<P4Icon kind={kind} />}
      text={label}
      active={active}
      show={show}
      onClick={onClick}
    />
  )
}

export function Floor4Camera() {
  const { camera, size } = useThree()
  useEffect(() => {
    const k = Math.min(2.4, Math.max(1, 1.5 / (size.width / size.height)))
    camera.position.set(5 + 24 * k, 52 * k, 3 + 50 * k)
    camera.lookAt(5, 0, 3)
    camera.updateProjectionMatrix()
  }, [camera, size.width, size.height])
  return null
}

export default function Floor4Scene({
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
  const hoverProps = (id: string) => ({
    onPointerOver: (e: { stopPropagation: () => void }) => {
      e.stopPropagation()
      setHover(id)
      document.body.style.cursor = "pointer"
    },
    onPointerOut: () => {
      setHover(null)
      document.body.style.cursor = ""
    },
  })
  const L = F4_LIFT_CORE
  const liftActive = activeId === "f4-lift"
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
          shadow-camera-left={-32}
          shadow-camera-right={32}
          shadow-camera-top={32}
          shadow-camera-bottom={-32}
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
        position={OFF}
        onClick={(e) => {
          if (!nav.picking || !root.current) return
          e.stopPropagation()
          const l = root.current.worldToLocal(e.point.clone())
          nav.onSet([l.x * S + 600, l.z * S + 322])
        }}
      >
        <Slab />
        {ALL.map((q) => (
          <group key={q.id} onClick={click(q.id)} {...hoverProps(q.id)}>
            <RoomFloor
              q={q}
              active={activeId === q.id}
              hover={hover === q.id}
            />
          </group>
        ))}
        {walls.map(([x1, y1, x2, y2], i) => (
          <Wall key={i} x1={x1} y1={y1} x2={x2} y2={y2} finish="creamMarble" />
        ))}
        {ALL.filter((q) => q.kind !== "cargo").map((q) => (
          <RoomDoor key={q.id} q={q} active={activeId === q.id} />
        ))}

        {/* furniture */}
        {F4_ROOMS.filter((q) => q.kind === "office").map((q) => (
          <MeetingSet key={q.id} q={q} />
        ))}
        <Classrooms rooms={F4_ROOMS.filter((q) => q.kind === "room")} />
        {F4_CORE.filter((q) => q.kind === "women" || q.kind === "men").map(
          (q) => (
            <WcFixtures key={q.id} q={q} />
          ),
        )}
        {F4_CORE.filter((q) => q.kind === "staff").map((q) => (
          <StaffFixtures key={q.id} q={q} />
        ))}
        {F4_CORE.filter((q) => q.kind === "stairs").map((q) => (
          <StairFlight key={q.id} q={q} />
        ))}

        {/* lift bank: marble core with five stainless lifts facing the lobby, the X block is a solid wall opposite */}
        <Core x1={L.x1} y1={L.y1} x2={L.x2} y2={L.y2} finish="creamMarble" />
        {F4_LIFTS.map((cy, i) => (
          <group key={cy} onClick={click("f4-lift")}>
            <Lift
              x={(L.x1 + L.x2) / 2 - 27}
              y={cy - (L.x2 - L.x1) / 2}
              w={54}
              h={L.x2 - L.x1}
              face={1}
              rot={Math.PI / 2}
              kind="lift"
              id={liftActive ? "f4-lift" : "f4-lift" + i}
              ctx={liftActive ? { ...ctx, hover: "f4-lift" } : ctx}
              bare
              noSign
              label={`Lift A${i + 1} · G–19`}
            />
          </group>
        ))}
        <ZoneSign
          x={L.x2 + 0.6}
          y={(L.y1 + L.y2) / 2}
          face={1}
          rot={Math.PI / 2}
          text="LIFT  G – 19"
          sub="Lantai G sampai 19"
          color="#2f6fed"
        />
        <Core
          x1={F4_VOID.x1}
          y1={F4_VOID.y1}
          x2={F4_VOID.x2}
          y2={F4_VOID.y2}
          finish="creamMarble"
        />
        <ZoneSign
          x={F4_VOID.x1 - 0.6}
          y={(F4_VOID.y1 + F4_VOID.y2) / 2}
          face={1}
          rot={-Math.PI / 2}
          text="LANTAI 4"
          sub="Lift G – 19 · Tangga Darurat"
          color="#b08d57"
        />

        {/* cargo lift: marble shaft, lift doors on the top wall (the marked entrance) */}
        {F4_CORE.filter((q) => q.kind === "cargo").map((q) => (
          <group key={q.id} onClick={click(q.id)}>
            <Core
              x1={q.x1}
              y1={q.y1}
              x2={q.x2}
              y2={q.y2}
              finish="creamMarble"
            />
            <Lift
              x={q.door[0] - 30}
              y={q.y1}
              w={60}
              h={q.y2 - q.y1}
              face={-1}
              kind="cargo"
              id={q.id}
              ctx={ctx}
              bare
              noSign
              label="Lift Barang"
            />
          </group>
        ))}

        {/* pictograms + names */}
        {F4_CORE.map((q) => (
          <Pictogram
            key={q.id}
            p={q.pin ?? [(q.x1 + q.x2) / 2, (q.y1 + q.y2) / 2]}
            kind={q.kind}
            label={q.label}
            active={activeId === q.id}
            show={hover === q.id}
            onClick={pick(q.id)}
          />
        ))}
        <Pictogram
          p={[486, 450]}
          kind="lift"
          label="Lift G–19"
          active={liftActive}
          show={!!hover?.startsWith("f4-lift")}
          onClick={pick("f4-lift")}
        />
        {F4_ROOMS.map((q) => (
          <Pictogram
            key={q.id}
            p={[(q.x1 + q.x2) / 2, (q.y1 + q.y2) / 2]}
            kind={q.kind}
            label={q.label}
            active={activeId === q.id}
            show={hover === q.id}
            onClick={pick(q.id)}
          />
        ))}

        {nav.yah && <YouAreHere p={nav.yah} conv={conv} size={0.7} y={0.05} />}
        {nav.leg && (
          <RouteLine leg={nav.leg} conv={conv} width={0.7} y={0.05} pin={2.6} />
        )}
      </group>
      {!LOW && (
        <ContactShadows
          position={[0, 0.02, 0]}
          opacity={0.4}
          scale={60}
          blur={2}
          far={6}
          resolution={Q.contactRes}
          frames={1}
        />
      )}
    </>
  )
}
