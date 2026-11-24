import { useEffect, useMemo, useRef } from "react"
import { Q } from "./quality"
import { Environment, Lightformer } from "@react-three/drei"
import { useThree } from "@react-three/fiber"
import * as THREE from "three"
import { PinTag } from "./Building3D"
import { OUT_RAMP, type FloorNav, type Pt } from "./Wayfinding"
import { RouteLine, YouAreHere } from "./RouteMarkers"
import {
  BASEMENT_DOORS,
  BOUNDARY,
  BUILDING,
  CEILINGS,
  DOOR_DEPTH,
  FACADE,
  GATES,
  INFILL,
  LANE_YS,
  LOTS,
  OUT_COLOR,
  OUT_H,
  OUT_W,
  OutIcon,
  PLANTERS,
  ROAD,
  SMOKING,
  WALLS,
  ln,
  outWorld,
  ox,
  oz,
  OUT_S as S,
  type OutKind,
  type Rect,
} from "./OutdoorData"
export { OUT_H, OUT_W, OUT_COLOR, OutIcon }

const steel = { color: "#c9ced6", metalness: 0.85, roughness: 0.25 }
const FONT = "'Inter:Regular', system-ui, sans-serif"

function canvasTex(
  draw: (g: CanvasRenderingContext2D, n: number) => void,
  n = 512,
) {
  const c = document.createElement("canvas")
  c.width = c.height = n
  draw(c.getContext("2d")!, n)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}
let TEX: {
  pavers: THREE.Texture
  asphalt: THREE.Texture
  grass: THREE.Texture
  marble: THREE.Texture
} | null = null
function useOutTex() {
  if (!TEX) {
    TEX = {
      marble: canvasTex((g, n) => {
        const k = 2,
          s = n / k
        for (let i = 0; i < k; i++)
          for (let j = 0; j < k; j++) {
            const v = 14 + Math.floor(Math.random() * 8)
            g.fillStyle = `rgb(${v},${v},${v + 2})`
            g.fillRect(i * s, j * s, s, s)
            for (let m = 0; m < 5; m++) {
              g.strokeStyle = `rgba(230,230,235,${0.08 + Math.random() * 0.22})`
              g.lineWidth = 0.6 + Math.random() * 1.5
              g.beginPath()
              g.moveTo(i * s + Math.random() * s, j * s)
              g.bezierCurveTo(
                i * s + Math.random() * s,
                j * s + s * 0.3,
                i * s + Math.random() * s,
                j * s + s * 0.7,
                i * s + Math.random() * s,
                j * s + s,
              )
              g.stroke()
            }
          }
        g.strokeStyle = "rgba(120,120,125,0.35)"
        g.lineWidth = 1.5
        for (let i = 0; i <= k; i++) {
          g.beginPath()
          g.moveTo(i * s, 0)
          g.lineTo(i * s, n)
          g.stroke()
          g.beginPath()
          g.moveTo(0, i * s)
          g.lineTo(n, i * s)
          g.stroke()
        }
      }, 1024),
      pavers: canvasTex((g, n) => {
        g.fillStyle = "#9b9a95"
        g.fillRect(0, 0, n, n)
        const bw = n / 4,
          bh = n / 8
        for (let r = 0; r < 8; r++)
          for (let c = -1; c < 5; c++) {
            const v = 160 + Math.floor(Math.random() * 30)
            g.fillStyle = `rgb(${v},${v - 4},${v - 12})`
            g.fillRect(
              c * bw + (r % 2) * (bw / 2) + 2,
              r * bh + 2,
              bw - 4,
              bh - 4,
            )
          }
      }),
      asphalt: canvasTex((g, n) => {
        g.fillStyle = "#6b6e74"
        g.fillRect(0, 0, n, n)
        for (let i = 0; i < n * 8; i++) {
          g.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`
          g.fillRect(Math.random() * n, Math.random() * n, 2, 2)
        }
      }),
      grass: canvasTex((g, n) => {
        g.fillStyle = "#4c7a3a"
        g.fillRect(0, 0, n, n)
        for (let i = 0; i < n * 10; i++) {
          g.fillStyle = `rgba(${30 + Math.random() * 60},${90 + Math.random() * 70},${30 + Math.random() * 30},0.5)`
          g.fillRect(Math.random() * n, Math.random() * n, 1.5, 3)
        }
      }),
    }
  }
  return TEX
}

function Pad({
  x1,
  y1,
  x2,
  y2,
  tex,
  rep = 6,
  y = 0,
  color = "#ffffff",
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  tex: THREE.Texture
  rep?: number
  y?: number
  color?: string
}) {
  const W = ln(x2 - x1),
    D = ln(y2 - y1)
  const t = useMemo(() => {
    const c = tex.clone()
    c.repeat.set(W / rep, D / rep)
    c.needsUpdate = true
    return c
  }, [tex, W, D, rep])
  return (
    <mesh
      position={[ox((x1 + x2) / 2), y, oz((y1 + y2) / 2)]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[W, D]} />
      <meshStandardMaterial map={t} color={color} roughness={0.9} />
    </mesh>
  )
}

/** Floating pictogram pin shared with every floor (PinTag): pictogram first, caption on hover */
function Label({
  x,
  y,
  h,
  text,
  kind,
  letter,
  onClick,
}: {
  x: number
  y: number
  h: number
  text: string
  kind: OutKind
  letter?: string
  onClick?: () => void
}) {
  return (
    <PinTag
      position={[ox(x), h, oz(y)]}
      distanceFactor={90}
      color={OUT_COLOR[kind]}
      icon={<OutIcon kind={kind} letter={letter} />}
      text={text}
      onClick={onClick}
      style={{ fontFamily: FONT }}
    />
  )
}

/** Outdoor planter wall: low concrete wall topped with a hedge */
function Planter({
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
  const ax = ox(x1),
    az = oz(y1),
    bx = ox(x2),
    bz = oz(y2)
  const len = Math.hypot(bx - ax, bz - az)
  const n = Math.max(1, Math.round(len / 1.1))
  const bushes = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => ({
        t: (i + 0.5) / n,
        r: 0.55 + ((i * 37) % 10) / 40,
        flower: i % 4 === 2,
      })),
    [n],
  )
  return (
    <group
      position={[(ax + bx) / 2, 0, (az + bz) / 2]}
      rotation={[0, -Math.atan2(bz - az, bx - ax), 0]}
    >
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[len + 0.9, 1, 0.9]} />
        <meshStandardMaterial color="#3a3a3c" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.02, 0]}>
        <boxGeometry args={[len + 0.7, 0.05, 0.7]} />
        <meshStandardMaterial color="#4a3423" roughness={1} />
      </mesh>
      {bushes.map((b, i) => (
        <group key={i} position={[(b.t - 0.5) * len, 1.25, 0]}>
          <mesh castShadow>
            <icosahedronGeometry args={[b.r, 1]} />
            <meshStandardMaterial
              color={i % 2 ? "#2f6b34" : "#3b7d3f"}
              roughness={0.9}
              flatShading
            />
          </mesh>
          {b.flower && (
            <mesh position={[0, b.r * 0.8, 0]}>
              <icosahedronGeometry args={[0.18, 0]} />
              <meshStandardMaterial color="#f9a8d4" />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
}

/** Main building glass facade with 4 doors (grey line in the design) */
function Facade({ onEnter }: { onEnter: () => void }) {
  const x = ox(FACADE.x),
    z0 = oz(FACADE.y1),
    z1 = oz(FACADE.y2),
    L = z1 - z0,
    H = 4.5
  const doorW = 2.2
  const centers = [0.17, 0.39, 0.61, 0.83].map((f) => z0 + L * f)
  return (
    <group>
      {/* mullions + glass */}
      <mesh position={[x, H / 2, (z0 + z1) / 2]}>
        <boxGeometry args={[0.08, H, L]} />
        <meshPhysicalMaterial
          color="#9fc9e8"
          transparent
          opacity={0.35}
          roughness={0.05}
        />
      </mesh>
      {Array.from({ length: 13 }).map((_, i) => (
        <mesh key={i} position={[x, H / 2, z0 + (L * i) / 12]}>
          <boxGeometry args={[0.14, H, 0.1]} />
          <meshStandardMaterial color="#1f2937" metalness={0.6} />
        </mesh>
      ))}
      <mesh position={[x, H - 0.05, (z0 + z1) / 2]}>
        <boxGeometry args={[0.16, 0.12, L]} />
        <meshStandardMaterial color="#1f2937" metalness={0.6} />
      </mesh>
      {centers.map((c, i) => (
        <group
          key={i}
          position={[x + 0.06, 0, c]}
          onClick={onEnter}
          onPointerOver={() => (document.body.style.cursor = "pointer")}
          onPointerOut={() => (document.body.style.cursor = "")}
        >
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[0.06, 3, doorW]} />
            <meshPhysicalMaterial
              color="#86c5f0"
              transparent
              opacity={0.45}
              roughness={0.05}
            />
          </mesh>
          <mesh position={[0.01, 3.05, 0]}>
            <boxGeometry args={[0.12, 0.1, doorW + 0.1]} />
            <meshStandardMaterial
              color="#b08d57"
              metalness={0.9}
              roughness={0.3}
            />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0.08, 1.3, s * 0.2]}>
              <boxGeometry args={[0.05, 1, 0.05]} />
              <meshStandardMaterial {...steel} />
            </mesh>
          ))}
          <mesh position={[0.02, 1.5, 0]}>
            <boxGeometry args={[0.07, 3, 0.04]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
        </group>
      ))}
      {/* entrance mat */}
      {centers.map((c, i) => (
        <mesh
          key={"m" + i}
          position={[x + 1.2, 0.03, c]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[1.6, doorW]} />
          <meshStandardMaterial color="#1c1c1e" />
        </mesh>
      ))}
    </group>
  )
}

/** Solid building mass with the gold cap: used for the ground floor, the black walls and the infill beside Parkir F/G */
const BLD_H = 9
const DOOR_H = 3.4
type Piece = [number, number, number, number, number, number]
function Mass({
  r: [x1, y1, x2, y2],
  onClick,
}: {
  r: Rect
  onClick?: () => void
}) {
  const hover = onClick
    ? {
        onClick,
        onPointerOver: () => (document.body.style.cursor = "pointer"),
        onPointerOut: () => (document.body.style.cursor = ""),
      }
    : {}
  // basement doors on this block's east face are cut out of the mass
  const doors = BASEMENT_DOORS.filter(
    (d) => d.x === x2 && d.y1 >= y1 && d.y2 <= y2,
  ).sort((a, b) => a.y1 - b.y1)
  const pieces: Piece[] = []
  if (!doors.length) pieces.push([x1, y1, x2, y2, 0, BLD_H])
  else {
    const xf = x2 - DOOR_DEPTH
    if (xf > x1) pieces.push([x1, y1, xf, y2, 0, BLD_H])
    let y = y1
    for (const d of doors) {
      if (d.y1 > y) pieces.push([xf, y, x2, d.y1, 0, BLD_H])
      pieces.push([xf, d.y1, x2, d.y2, DOOR_H, BLD_H])
      y = d.y2
    }
    if (y2 > y) pieces.push([xf, y, x2, y2, 0, BLD_H])
  }
  return (
    <group>
      {pieces.map(([a1, b1, a2, b2, lo, hi], i) => (
        <mesh
          key={i}
          position={[ox((a1 + a2) / 2), (lo + hi) / 2, oz((b1 + b2) / 2)]}
          castShadow
          receiveShadow
          {...hover}
        >
          <boxGeometry args={[ln(a2 - a1), hi - lo, ln(b2 - b1)]} />
          <meshStandardMaterial
            color="#17171a"
            roughness={0.25}
            metalness={0.3}
          />
        </mesh>
      ))}
      <mesh position={[ox((x1 + x2) / 2), BLD_H + 0.1, oz((y1 + y2) / 2)]}>
        <boxGeometry args={[ln(x2 - x1), 0.2, ln(y2 - y1)]} />
        <meshStandardMaterial color="#b08d57" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  )
}

/** Basement door set into the building wall: opened double doors and stairs going down inside the building */
function BasementDoor({ d }: { d: typeof BASEMENT_DOORS[number] }) {
  const xf = ox(d.x),
    xb = ox(d.x - DOOR_DEPTH),
    z0 = oz(d.y1),
    z1 = oz(d.y2)
  const Wd = z1 - z0,
    Dp = xf - xb,
    cz = (z0 + z1) / 2
  const n = 8,
    open = 1.25,
    leafH = DOOR_H - 0.12
  return (
    <group>
      {/* stairs down: treads get darker as they descend into the building */}
      {Array.from({ length: n }).map((_, i) => (
        <group key={i}>
          <mesh
            position={[xf - (i + 0.5) * (Dp / n), 0.02 + 0.001 * i, cz]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[Dp / n - 0.03, Wd - 0.1]} />
            <meshStandardMaterial color={`hsl(0,0%,${62 - i * 7}%)`} />
          </mesh>
          <mesh
            position={[xf - i * (Dp / n) - 0.04, 0.03 + 0.001 * i, cz]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.05, Wd - 0.2]} />
            <meshStandardMaterial
              color="#facc15"
              emissive="#facc15"
              emissiveIntensity={0.3 - i * 0.03}
            />
          </mesh>
        </group>
      ))}
      {/* handrails and a light inside the stairwell */}
      {[z0 + 0.12, z1 - 0.12].map((z) => (
        <mesh
          key={z}
          position={[(xf + xb) / 2, 0.95, z]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.04, 0.04, Dp]} />
          <meshStandardMaterial {...steel} />
        </mesh>
      ))}
      <mesh position={[(xf + xb) / 2, DOOR_H - 0.06, cz]}>
        <boxGeometry args={[Dp * 0.7, 0.05, 0.25]} />
        <meshStandardMaterial
          color="#fff"
          emissive="#fff7e6"
          emissiveIntensity={1.4}
        />
      </mesh>
      {/* door frame */}
      {[z0, z1].map((z) => (
        <mesh key={"j" + z} position={[xf + 0.04, DOOR_H / 2, z]}>
          <boxGeometry args={[0.12, DOOR_H, 0.16]} />
          <meshStandardMaterial
            color="#b08d57"
            metalness={0.85}
            roughness={0.3}
          />
        </mesh>
      ))}
      <mesh position={[xf + 0.04, DOOR_H + 0.06, cz]}>
        <boxGeometry args={[0.12, 0.14, Wd + 0.16]} />
        <meshStandardMaterial
          color="#b08d57"
          metalness={0.85}
          roughness={0.3}
        />
      </mesh>
      {/* double doors, swung open outwards */}
      {([
        [z0, open, 1],
        [z1, -open, -1],
      ] as const).map(([z, rot, s]) => (
        <group
          key={"d" + z}
          position={[xf + 0.04, 0, z]}
          rotation={[0, rot, 0]}
        >
          <mesh position={[0, leafH / 2 + 0.04, (s * Wd) / 4]} castShadow>
            <boxGeometry args={[0.06, leafH, Wd / 2 - 0.04]} />
            <meshPhysicalMaterial
              color="#9fc9e8"
              transparent
              opacity={0.5}
              roughness={0.05}
            />
          </mesh>
          <mesh position={[0, leafH / 2 + 0.04, (s * Wd) / 2 - s * 0.05]}>
            <boxGeometry args={[0.08, leafH, 0.06]} />
            <meshStandardMaterial color="#1f2937" metalness={0.6} />
          </mesh>
          <mesh position={[0.06, 1.1, (s * Wd) / 2 - s * 0.22]}>
            <boxGeometry args={[0.05, 0.7, 0.05]} />
            <meshStandardMaterial {...steel} />
          </mesh>
        </group>
      ))}
      {/* illuminated basement sign above the door + mat outside */}
      <mesh position={[xf + 0.06, DOOR_H + 0.55, cz]}>
        <boxGeometry args={[0.08, 0.5, Wd * 0.8]} />
        <meshStandardMaterial
          color="#16a34a"
          emissive="#22c55e"
          emissiveIntensity={1.6}
        />
      </mesh>
      <mesh position={[xf + 0.9, 0.025, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.4, Wd]} />
        <meshStandardMaterial color="#1c1c1e" />
      </mesh>
      <Label
        x={d.x + 22}
        y={(d.y1 + d.y2) / 2}
        h={5.4}
        text={d.label}
        kind="basement"
      />
    </group>
  )
}

function Building({ onEnter }: { onEnter: () => void }) {
  return (
    <group>
      {BUILDING.map((r, i) => (
        <Mass key={i} r={r} onClick={onEnter} />
      ))}
      <Label
        x={109}
        y={1305}
        h={BLD_H + 1.5}
        text="Lobby Gedung"
        kind="building"
        onClick={onEnter}
      />
    </group>
  )
}

/** Thin perimeter wall on the site edge */
function Boundary({ r: [x1, y1, x2, y2] }: { r: Rect }) {
  return (
    <mesh
      position={[ox((x1 + x2) / 2), 1.2, oz((y1 + y2) / 2)]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[ln(x2 - x1), 2.4, ln(y2 - y1)]} />
      <meshStandardMaterial color="#17171a" roughness={0.4} metalness={0.2} />
    </mesh>
  )
}

/** Ceiling over the covered drop-off area and Parkir E (shown semi-transparent so the plan stays readable) */
const CEIL_H = 5.5
function Ceiling() {
  const areas = CEILINGS
  const cols: [number, number][] = []
  for (const x of [320, 430, 780])
    for (let y = 700; y <= 1420; y += 180) cols.push([x, y])
  for (const x of [870, 980, 1090])
    for (const y of [1097, 1480]) cols.push([x, y])
  return (
    <group>
      {areas.map(([x1, y1, x2, y2], i) => (
        <group key={i}>
          <mesh position={[ox((x1 + x2) / 2), CEIL_H, oz((y1 + y2) / 2)]}>
            <boxGeometry args={[ln(x2 - x1), 0.35, ln(y2 - y1)]} />
            <meshStandardMaterial
              color="#e7e5e4"
              transparent
              opacity={0.22}
              depthWrite={false}
            />
          </mesh>
          {/* edge beam */}
          <mesh
            position={[ox((x1 + x2) / 2), CEIL_H - 0.35, oz((y1 + y2) / 2)]}
          >
            <boxGeometry args={[ln(x2 - x1), 0.08, ln(y2 - y1)]} />
            <meshStandardMaterial
              color="#fde68a"
              emissive="#fbbf24"
              emissiveIntensity={0.25}
              transparent
              opacity={0.08}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
      {cols.map(([x, y], i) => (
        <mesh key={i} position={[ox(x), CEIL_H / 2, oz(y)]} castShadow>
          <boxGeometry args={[0.6, CEIL_H, 0.6]} />
          <meshStandardMaterial color="#d6d3d1" roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

/** Gate with guard booth and boom barriers */
function Gate({
  x1,
  x2,
  y,
  face,
}: {
  x1: number
  x2: number
  y: number
  face: 1 | -1
}) {
  const W = ln(x2 - x1)
  return (
    <group
      position={[ox((x1 + x2) / 2), 0, oz(y)]}
      rotation={[0, face === 1 ? 0 : Math.PI, 0]}
    >
      {/* booth in the middle */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <boxGeometry args={[2, 2.8, 1.8]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.7, 0.91]}>
        <planeGeometry args={[1.6, 1]} />
        <meshPhysicalMaterial color="#7fb8e0" metalness={0.5} roughness={0.1} />
      </mesh>
      <mesh position={[0, 2.95, 0]} castShadow>
        <boxGeometry args={[2.6, 0.2, 2.4]} />
        <meshStandardMaterial color="#1a1a1c" />
      </mesh>
      {/* canopy over lanes */}
      <mesh position={[0, 4.6, 0]} castShadow>
        <boxGeometry args={[W, 0.3, 3]} />
        <meshStandardMaterial color="#1a1a1c" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 4.42, 1.45]}>
        <boxGeometry args={[W, 0.1, 0.08]} />
        <meshStandardMaterial
          color="#fff"
          emissive="#ffe4b5"
          emissiveIntensity={1.2}
        />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh
          key={"c" + s}
          position={[(s * W) / 2 - s * 0.2, 2.3, 0]}
          castShadow
        >
          <boxGeometry args={[0.3, 4.6, 0.3]} />
          <meshStandardMaterial color="#3a3a3c" />
        </mesh>
      ))}
      {/* barriers: in & out lanes */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 1.4, 0, s * 0.6]}>
          <mesh position={[0, 0.55, 0]} castShadow>
            <boxGeometry args={[0.4, 1.1, 0.4]} />
            <meshStandardMaterial color="#facc15" />
          </mesh>
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh key={i} position={[s * (0.4 + i * 0.85), 1, 0]}>
              <boxGeometry args={[0.85, 0.1, 0.1]} />
              <meshStandardMaterial color={i % 2 ? "#dc2626" : "#ffffff"} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

const CAR_COLORS = [
  "#e5e7eb",
  "#111827",
  "#9ca3af",
  "#b91c1c",
  "#1d4ed8",
  "#f5f5f4",
  "#374151",
]
function Car({
  position,
  rot,
  color,
}: {
  position: [number, number, number]
  rot: number
  color: string
}) {
  return (
    <group position={position} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[1.8, 0.6, 4.2]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.1, -0.2]} castShadow>
        <boxGeometry args={[1.6, 0.55, 2.2]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.1} />
      </mesh>
      {[
        [-0.85, 1.3],
        [0.85, 1.3],
        [-0.85, -1.3],
        [0.85, -1.3],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.32, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.32, 0.32, 0.2, 16]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}
    </group>
  )
}

/** Parking lot with stall lines and parked cars. Stalls run along the long axis */
function Parking({
  x1,
  y1,
  x2,
  y2,
  label,
  vertical,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  label: string
  vertical?: boolean
}) {
  const tex = useOutTex()
  const W = ln(x2 - x1),
    D = ln(y2 - y1)
  const cx = ox((x1 + x2) / 2),
    cz = oz((y1 + y2) / 2)
  const along = vertical ? D : W
  const depth = vertical ? W : D
  const stall = 2.6
  const n = Math.floor(along / stall)
  const rows = depth > 11 ? 2 : 1
  const cars = useMemo(() => {
    const out: { p: [number, number, number]; c: string }[] = []
    for (let r = 0; r < rows; r++)
      for (let i = 0; i < n; i++) {
        if ((i * 7 + r * 3 + label.length) % 5 === 0) continue
        const a = -along / 2 + (i + 0.5) * (along / n)
        const d = rows === 1 ? 0 : (r === 0 ? -1 : 1) * depth * 0.28
        out.push({
          p: vertical ? [d, 0, a] : [a, 0, d],
          c: CAR_COLORS[(i * 3 + r + label.length) % CAR_COLORS.length],
        })
      }
    return out
  }, [n, rows, along, depth, vertical, label])
  const lines = useMemo(() => {
    const out: { k: string; p: [number, number, number]; s: [number, number] }[] =
      []
    for (let i = 0; i <= n; i++)
      for (let r = 0; r < rows; r++) {
        const a = -along / 2 + i * (along / n)
        const d = rows === 1 ? 0 : (r === 0 ? -1 : 1) * depth * 0.28
        const len = rows === 1 ? depth * 0.8 : depth * 0.4
        out.push({
          k: i + "-" + r,
          p: vertical ? [d, 0, a] : [a, 0, d],
          s: vertical ? [len, 0.12] : [0.12, len],
        })
      }
    return out
  }, [n, rows, along, depth, vertical])
  return (
    <group>
      <Pad
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        tex={tex.asphalt}
        y={0.03}
        rep={8}
        color="#5a5c62"
      />
      <group position={[cx, 0.04, cz]}>
        {lines.map((l) => (
          <mesh key={l.k} position={l.p} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={l.s} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
        ))}
        {cars.map((c, i) => (
          <Car
            key={i}
            position={c.p}
            rot={vertical ? Math.PI / 2 : 0}
            color={c.c}
          />
        ))}
      </group>
      <Label
        x={(x1 + x2) / 2}
        y={(y1 + y2) / 2}
        h={3.5}
        text={label}
        kind="parking"
        letter={label.slice(-1)}
      />
    </group>
  )
}

function Tree({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <group position={[x, 0.25, z]} scale={s}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 2.2, 8]} />
        <meshStandardMaterial color="#5b3a1e" />
      </mesh>
      <mesh position={[0, 2.8, 0]} castShadow>
        <icosahedronGeometry args={[1.3, 1]} />
        <meshStandardMaterial color="#3f7d3a" flatShading />
      </mesh>
    </group>
  )
}

/** Smoking area (east side, between the walls): planted bed with the pavilion inside and a stone path from the driveway */
function SmokingArea() {
  const tex = useOutTex()
  const [gx1, gy1, gx2, gy2] = SMOKING
  const g = { x1: gx1, y1: gy1, x2: gx2, y2: gy2 }
  const GW = ln(g.x2 - g.x1),
    GD = ln(g.y2 - g.y1)
  const gx = ox((g.x1 + g.x2) / 2),
    gz = oz((g.y1 + g.y2) / 2)
  const grass = useMemo(() => {
    const c = tex.grass.clone()
    c.repeat.set(GW / 6, GD / 6)
    c.needsUpdate = true
    return c
  }, [tex, GW, GD])
  const s = { x1: g.x1 + 20, y1: g.y1 + 38, x2: g.x2 - 20, y2: g.y2 - 38 }
  const SW = ln(s.x2 - s.x1),
    SD = ln(s.y2 - s.y1)
  const sx = ox((s.x1 + s.x2) / 2),
    sz = oz((s.y1 + s.y2) / 2)
  const pathZ = gz
  return (
    <group>
      {/* garden bed with black marble kerb */}
      <mesh position={[gx, -0.05, gz]} receiveShadow>
        <boxGeometry args={[GW, 0.6, GD]} />
        <meshStandardMaterial map={tex.marble} roughness={0.2} />
      </mesh>
      <mesh
        position={[gx, 0.26, gz]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[GW - 0.6, GD - 0.6]} />
        <meshStandardMaterial map={grass} />
      </mesh>
      {/* stone path from covered area into the pavilion */}
      <mesh
        position={[(ox(ROAD.x2) + ox(s.x1)) / 2, 0.16, pathZ]}
        receiveShadow
      >
        <boxGeometry args={[ox(s.x1) - ox(ROAD.x2), 0.32, 2.2]} />
        <meshStandardMaterial color="#d6d3d1" roughness={0.7} />
      </mesh>
      {/* smoking pavilion: deck, pergola, benches, ashtrays */}
      <group position={[sx, 0, sz]}>
        <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
          <boxGeometry args={[SW, 0.2, SD]} />
          <meshStandardMaterial color="#8a6a4a" roughness={0.8} />
        </mesh>
        {Array.from({ length: Math.floor(SD / 0.6) }).map((_, i) => (
          <mesh key={i} position={[0, 0.46, -SD / 2 + 0.3 + i * 0.6]}>
            <boxGeometry args={[SW, 0.01, 0.04]} />
            <meshStandardMaterial color="#5c4430" />
          </mesh>
        ))}
        {[
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ].map(([a, b], i) => (
          <mesh
            key={"p" + i}
            position={[a * (SW / 2 - 0.4), 2, b * (SD / 2 - 0.4)]}
            castShadow
          >
            <boxGeometry args={[0.3, 3.4, 0.3]} />
            <meshStandardMaterial color="#1a1a1c" />
          </mesh>
        ))}
        <mesh position={[0, 3.7, 0]} castShadow>
          <boxGeometry args={[SW, 0.2, SD]} />
          <meshStandardMaterial
            color="#1a1a1c"
            metalness={0.4}
            roughness={0.4}
          />
        </mesh>
        <mesh position={[0, 3.6, SD / 2]}>
          <boxGeometry args={[SW, 0.08, 0.06]} />
          <meshStandardMaterial
            color="#b08d57"
            metalness={0.9}
            roughness={0.3}
          />
        </mesh>
        {[-SD / 2 + 1.5, SD / 2 - 1.5].map((z) => (
          <mesh key={z} position={[0, 0.85, z]} castShadow>
            <boxGeometry args={[SW - 5, 0.12, 0.8]} />
            <meshStandardMaterial color="#7a5236" />
          </mesh>
        ))}
        {[-3.5, 0, 3.5].map((x) => (
          <mesh key={x} position={[x, 0.9, 0]} castShadow>
            <cylinderGeometry args={[0.25, 0.2, 0.9, 16]} />
            <meshStandardMaterial {...steel} />
          </mesh>
        ))}
      </group>
      {/* trees around the pavilion, inside the garden */}
      {([
        [g.x1 + 22, g.y1 + 18],
        [g.x2 - 22, g.y1 + 18],
        [g.x1 + 22, g.y2 - 18],
        [g.x2 - 22, g.y2 - 18],
      ] as [number, number][]).map(([x, y], i) => (
        <Tree key={i} x={ox(x)} z={oz(y)} s={0.7} />
      ))}
      <Label
        x={(g.x1 + g.x2) / 2}
        y={(g.y1 + g.y2) / 2}
        h={5.5}
        text="Area Merokok"
        kind="smoking"
      />
    </group>
  )
}

function Slab({
  x1,
  y1,
  x2,
  y2,
  color = "#ffffff",
  y = 0,
  marble,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  color?: string
  y?: number
  marble?: boolean
}) {
  const tex = useOutTex()
  const W = ln(x2 - x1),
    D = ln(y2 - y1)
  const map = useMemo(() => {
    if (!marble) return null
    const c = tex.marble.clone()
    c.repeat.set(W / 4, D / 4)
    c.needsUpdate = true
    return c
  }, [marble, tex, W, D])
  return (
    <mesh
      position={[ox((x1 + x2) / 2), y - 0.25, oz((y1 + y2) / 2)]}
      receiveShadow
    >
      <boxGeometry args={[W, 0.5, D]} />
      <meshStandardMaterial
        map={map}
        color={marble ? "#ffffff" : color}
        roughness={marble ? 0.18 : 0.85}
        metalness={marble ? 0.2 : 0}
      />
    </mesh>
  )
}

/** Painted road arrow, flat on the asphalt. rot 0 = pointing south (+z) */
const ARROW = (() => {
  const s = new THREE.Shape()
  s.moveTo(-0.3, -1.8)
  s.lineTo(0.3, -1.8)
  s.lineTo(0.3, 0.4)
  s.lineTo(0.85, 0.4)
  s.lineTo(0, 1.8)
  s.lineTo(-0.85, 0.4)
  s.lineTo(-0.3, 0.4)
  s.closePath()
  return new THREE.ShapeGeometry(s)
})()
const N = Math.PI,
  S0 = 0
function RoadArrow({
  x,
  y,
  dir,
  scale = 1,
}: {
  x: number
  y: number
  dir: number
  scale?: number
}) {
  return (
    <group position={[ox(x), 0.02, oz(y)]} rotation={[0, dir, 0]} scale={scale}>
      <mesh geometry={ARROW} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial
          color="#f5f5f4"
          roughness={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

/** Left lane (north) -> basement; right lane (south) -> Parkir A–D & exit */
function LaneArrows() {
  const L = ROAD.c - 58,
    R = ROAD.c + 58
  const ys = LANE_YS
  return (
    <group>
      {ys.map((y) => (
        <RoadArrow key={"l" + y} x={L} y={y} dir={N} />
      ))}
      {ys.map((y) => (
        <RoadArrow key={"r" + y} x={R} y={y} dir={S0} />
      ))}
    </group>
  )
}

function DriveMarkings() {
  const z0 = oz(60),
    z1 = oz(1920)
  const n = Math.floor((z1 - z0) / 3)
  return (
    <group position={[ox(ROAD.c), 0.03, 0]}>
      {Array.from({ length: n }).map((_, i) => (
        <mesh
          key={i}
          position={[0, 0, z0 + i * 3]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.2, 1.6]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
      ))}
    </group>
  )
}

export const OUT_TARGET: [number, number, number] = [0, 0, -16]

export function OutdoorCamera() {
  const { camera, size } = useThree()
  useEffect(() => {
    const aspect = size.width / size.height
    if (aspect >= 1) {
      const k = Math.min(2, Math.max(1, 1.6 / aspect))
      camera.position.set(104 * k, 96 * k, OUT_TARGET[2] + 10 + 16 * k)
    } else {
      const k = Math.min(2.2, Math.max(1, 0.8 / aspect))
      camera.position.set(44 * k, 100 * k, OUT_TARGET[2] + 84 * k)
    }
    camera.lookAt(...OUT_TARGET)
    camera.updateProjectionMatrix()
  }, [camera, size.width, size.height])
  return null
}

export default function OutdoorScene({
  onEnter,
  nav,
}: {
  onEnter: () => void
  nav: FloorNav
}) {
  const conv = (x: number, y: number): Pt => [ox(x), oz(y)]
  const root = useRef<THREE.Group>(null)
  return (
    <group
      ref={root}
      onClick={(e) => {
        if (!nav.picking || !root.current) return
        e.stopPropagation()
        const l = root.current.worldToLocal(e.point.clone())
        nav.onSet([l.x * S + OUT_W / 2, l.z * S + OUT_H / 2])
      }}
    >
      {nav.yah && <YouAreHere p={nav.yah} conv={conv} size={1.1} y={0.4} />}
      {nav.leg && (
        <RouteLine leg={nav.leg} conv={conv} width={1.3} y={0.4} pin={4} />
      )}
      <hemisphereLight args={["#e0f2fe", "#6b8f4e", 0.7]} />
      <directionalLight
        position={[40, 70, 30]}
        intensity={2.2}
        color="#fff7e6"
        castShadow
        shadow-bias={-0.0004}
        shadow-mapSize={[Q.outdoorShadowMap, Q.outdoorShadowMap]}
        shadow-camera-left={-90}
        shadow-camera-right={90}
        shadow-camera-top={90}
        shadow-camera-bottom={-90}
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

      {/* site floor: black marble, like the ground floor */}
      <Slab x1={0} y1={0} x2={OUT_W} y2={OUT_H} marble />
      {/* one straight driveway spanning both gates */}
      <Slab
        x1={ROAD.x1}
        y1={0}
        x2={ROAD.x2}
        y2={OUT_H}
        color="#3a3b3f"
        y={0.012}
      />
      <DriveMarkings />
      <LaneArrows />

      {/* ground floor + basement doors (as grouped on the site plan) */}
      <Building onEnter={onEnter} />
      <Facade onEnter={onEnter} />
      {BASEMENT_DOORS.map((d) => (
        <BasementDoor key={d.id} d={d} />
      ))}

      {/* black building walls and the closed-in areas beside Parkir F / G */}
      {WALLS.map((r, i) => (
        <Mass key={"w" + i} r={r} />
      ))}
      {INFILL.map((r, i) => (
        <Mass key={"f" + i} r={r} />
      ))}
      {BOUNDARY.map((r, i) => (
        <Boundary key={"b" + i} r={r} />
      ))}

      {/* planter strips (white lines on the plan) */}
      {PLANTERS.map(([x1, y1, x2, y2], i) => (
        <Planter key={"p" + i} x1={x1} y1={y1} x2={x2} y2={y2} />
      ))}

      {LOTS.map((l) => (
        <Parking
          key={l.id}
          x1={l.r[0]}
          y1={l.r[1]}
          x2={l.r[2]}
          y2={l.r[3]}
          label={l.label.toUpperCase()}
          vertical={l.vertical}
        />
      ))}

      <Ceiling />

      {GATES.map((g, i) => (
        <group key={g.id}>
          <Gate x1={g.x1} x2={g.x2} y={g.y} face={i ? -1 : 1} />
          <Label
            x={(g.x1 + g.x2) / 2}
            y={g.y}
            h={6.5}
            text={
              g.id === "gate-n"
                ? "Gate Utara · Masuk & Keluar"
                : "Gate Selatan · Masuk & Keluar"
            }
            kind="gate"
          />
        </group>
      ))}

      <SmokingArea />

      {/* basement vehicle exit: cars come up the ramp here and leave through the south gate */}
      <Label
        x={OUT_RAMP[0] + 30}
        y={OUT_RAMP[1]}
        h={5}
        text="Ramp Keluar Basement"
        kind="ramp"
      />
    </group>
  )
}
