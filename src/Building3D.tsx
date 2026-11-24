import { useMemo, useState, type CSSProperties, type ReactNode } from "react"
import * as THREE from "three"
import { Tag } from "./Tags"
import { COLOR, Icon, LABEL, type Kind } from "./Pictos"
import { usePlace, usePrefs } from "./prefs"

/* Shared 3D building blocks (ground floor + Lantai 4): materials, walls, lifts, stairs, doors, signage */

// Convert design px (1200x645) to world units
export const S = 20
export const wx = (x: number) => (x - 600) / S
export const wz = (y: number) => (y - 322) / S
export const sz = (v: number) => v / S

export { COLOR, Icon, LABEL, type Kind }

export type Ctx = {
  focus: Kind | null
  hover: string | null
  setHover: (s: string | null) => void
}

/**
 * Floating pictogram pin used on every floor: a square pictogram tile on a stem; the name appears only on hover,
 * when the place is hovered in 3D (show) or when it is the selected destination (active).
 */
export function PinTag({
  position,
  color,
  icon,
  text,
  sub,
  active,
  show,
  onClick,
  distanceFactor = 50,
  style,
}: {
  position: [number, number, number]
  color: string
  icon: ReactNode
  text: string
  sub?: string
  active?: boolean
  show?: boolean
  onClick?: () => void
  distanceFactor?: number
  style?: CSSProperties
}) {
  // own hover state rather than CSS group-hover: Tailwind v4 gates hover behind @media (hover: hover)
  const [over, setOver] = useState(false)
  // touch screens have no hover, so names can be shown permanently (user preference, on by default on touch devices)
  const { names } = usePrefs()
  const place = usePlace()
  const label = place(text),
    subLabel = sub && place(sub)
  const open = show || active || over || names
  return (
    <Tag
      position={position}
      distanceFactor={distanceFactor}
      style={{ ...(onClick ? null : { pointerEvents: "none" }), ...style }}
    >
      {/* p-1 around the 36 px tile gives a 44 px touch target without making the map busier */}
      <button
        type="button"
        aria-label={subLabel ? `${label} · ${subLabel}` : label}
        aria-pressed={onClick ? !!active : undefined}
        tabIndex={onClick ? 0 : -1}
        onClick={(e) => {
          e.stopPropagation()
          onClick?.()
        }}
        onPointerEnter={() => setOver(true)}
        onPointerLeave={() => setOver(false)}
        onFocus={() => setOver(true)}
        onBlur={() => setOver(false)}
        className={`flex flex-col items-center rounded-xl p-1 outline-none focus-visible:ring-4 focus-visible:ring-orange-500 ${
          onClick ? "cursor-pointer" : "cursor-default"
        }`}
      >
        <span
          className={`relative block h-9 w-9 rounded-lg p-1.5 shadow-lg ring-2 transition ${
            active ? "ring-orange-500" : "ring-white"
          }`}
          style={{ background: color }}
        >
          {icon}
        </span>
        <span
          className={`mt-1 whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-semibold text-white ${
            active ? "bg-orange-700" : "bg-neutral-900/90"
          } ${open ? "block" : "hidden"}`}
        >
          {label}
          {subLabel && (
            <span className="ml-1 font-bold text-red-200">· {subLabel}</span>
          )}
        </span>
        <span className="h-3 w-px bg-white/80" />
      </button>
    </Tag>
  )
}

export function Sign({
  kind,
  y,
  text,
  ctx,
  id,
}: {
  kind: Kind
  y: number
  text?: string
  ctx: Ctx
  id: string
}) {
  const dim = ctx.focus && ctx.focus !== kind
  const show = ctx.hover === id || ctx.focus === kind
  return (
    <PinTag
      position={[0, y, 0]}
      color={COLOR[kind]}
      icon={<Icon kind={kind} />}
      text={text ?? LABEL[kind]}
      show={show}
      style={{ opacity: dim ? 0.2 : 1, transition: "opacity .3s" }}
    />
  )
}

export function useHoverProps(id: string, ctx: Ctx) {
  return {
    onPointerOver: (e: { stopPropagation: () => void }) => {
      e.stopPropagation()
      ctx.setHover(id)
      document.body.style.cursor = "pointer"
    },
    onPointerOut: () => {
      ctx.setHover(null)
      document.body.style.cursor = ""
    },
  }
}

export const steel = { color: "#c9ced6", metalness: 0.85, roughness: 0.25 }

/** Elevator: granite cladding, stainless architrave, brushed leaves, hall lantern and call station. face = 1 doors toward +z */
export function Lift({
  x,
  y,
  w,
  h,
  face,
  kind,
  id,
  ctx,
  label,
  bare,
  rot,
  noSign,
}: {
  x: number
  y: number
  w: number
  h: number
  face: 1 | -1
  kind: Kind
  id: string
  ctx: Ctx
  label: string
  bare?: boolean
  rot?: number
  noSign?: boolean
}) {
  const W = sz(w),
    D = sz(h),
    H = WALL_H
  const hl = ctx.hover === id || ctx.focus === kind
  const dw = Math.min(W * 0.62, 1.6),
    dh = 2.6
  return (
    <group
      position={[wx(x + w / 2), 0, wz(y + h / 2)]}
      rotation={[0, rot ?? (face === 1 ? 0 : Math.PI), 0]}
      {...useHoverProps(id, ctx)}
    >
      {!bare && (
        <mesh position={[0, H / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[W, H, D]} />
          <meshStandardMaterial
            map={useTex().wallMarble}
            roughness={0.2}
            metalness={0.2}
          />
        </mesh>
      )}
      {/* hover glow panel behind doors */}
      {hl && (
        <mesh position={[0, dh / 2 + 0.2, D / 2 + 0.035]}>
          <planeGeometry args={[dw + 0.6, dh + 0.9]} />
          <meshStandardMaterial
            color={COLOR[kind]}
            emissive={COLOR[kind]}
            emissiveIntensity={0.6}
          />
        </mesh>
      )}
      {/* architrave */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * (dw / 2 + 0.06), dh / 2, D / 2 + 0.08]}
          castShadow
        >
          <boxGeometry args={[0.12, dh, 0.06]} />
          <meshStandardMaterial {...steel} />
        </mesh>
      ))}
      <mesh position={[0, dh + 0.06, D / 2 + 0.08]} castShadow>
        <boxGeometry args={[dw + 0.24, 0.12, 0.06]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      {/* door leaves with center gap */}
      <mesh position={[0, dh / 2, D / 2 + 0.065]}>
        <boxGeometry args={[dw, dh, 0.02]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * (dw / 4 + 0.006), dh / 2, D / 2 + 0.08]}
          castShadow
        >
          <boxGeometry args={[dw / 2 - 0.012, dh - 0.02, 0.03]} />
          <meshStandardMaterial
            color="#d7dbe0"
            metalness={0.95}
            roughness={0.32}
          />
        </mesh>
      ))}
      {/* sill */}
      <mesh position={[0, 0.01, D / 2 + 0.2]}>
        <boxGeometry args={[dw + 0.2, 0.02, 0.3]} />
        <meshStandardMaterial color="#aab0b8" metalness={0.9} roughness={0.4} />
      </mesh>
      {/* hall lantern / floor display */}
      <mesh position={[0, dh + 0.45, D / 2 + 0.07]}>
        <boxGeometry args={[0.9, 0.36, 0.03]} />
        <meshStandardMaterial color="#050608" roughness={0.1} metalness={0.5} />
      </mesh>
      <mesh position={[-0.22, dh + 0.45, D / 2 + 0.09]}>
        <circleGeometry args={[0.1, 3]} />
        <meshStandardMaterial
          color="#22c55e"
          emissive="#22c55e"
          emissiveIntensity={2}
        />
      </mesh>
      <mesh position={[0.15, dh + 0.45, D / 2 + 0.09]}>
        <planeGeometry args={[0.32, 0.18]} />
        <meshStandardMaterial
          color={COLOR[kind]}
          emissive={COLOR[kind]}
          emissiveIntensity={1.6}
        />
      </mesh>
      {/* call station */}
      <group position={[dw / 2 + 0.4, 1.15, D / 2 + 0.07]}>
        <mesh>
          <boxGeometry args={[0.2, 0.5, 0.02]} />
          <meshStandardMaterial {...steel} />
        </mesh>
        {[0.1, -0.1].map((dy, i) => (
          <mesh
            key={dy}
            position={[0, dy, 0.015]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.045, 0.045, 0.02, 20]} />
            <meshStandardMaterial
              color="#e5e7eb"
              emissive={i === 0 ? "#60a5fa" : "#000"}
              emissiveIntensity={i === 0 ? 1.5 : 0}
              metalness={0.8}
            />
          </mesh>
        ))}
      </group>
      {!noSign && (hl || kind === "cargo") && (
        <Sign kind={kind} y={H + 0.9} id={id} ctx={ctx} text={label} />
      )}
    </group>
  )
}

/** Emergency stair core (stairs lead down behind it) shown as an enclosed shaft with a fire door */
export function Stairs({
  x,
  y,
  w,
  h,
  doorFace,
  id,
  ctx,
  label = "Tangga Darurat",
}: {
  x: number
  y: number
  w: number
  h: number
  doorFace: 1 | -1
  id: string
  ctx: Ctx
  label?: string
}) {
  const W = sz(w),
    D = sz(h),
    H = WALL_H
  const hl = ctx.hover === id || ctx.focus === "stairs"
  const dw = 1.5,
    dh = 2.7,
    fz = D / 2
  return (
    <group
      position={[wx(x + w / 2), 0, wz(y + h / 2)]}
      rotation={[0, doorFace === 1 ? 0 : Math.PI, 0]}
      {...useHoverProps(id, ctx)}
    >
      <mesh position={[0, H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial
          map={useTex().wallMarble}
          color={hl ? "#ffb4ae" : "#ffffff"}
          roughness={0.2}
          metalness={0.2}
        />
      </mesh>
      {/* frame */}
      <mesh position={[0, dh / 2 + 0.04, fz + 0.02]}>
        <boxGeometry args={[dw + 0.2, dh + 0.1, 0.05]} />
        <meshStandardMaterial color="#4b5059" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* fire door leaf */}
      <mesh position={[0, dh / 2, fz + 0.05]} castShadow>
        <boxGeometry args={[dw, dh - 0.04, 0.04]} />
        <meshStandardMaterial
          color="#b91c1c"
          metalness={0.35}
          roughness={0.45}
        />
      </mesh>
      {/* vision panel */}
      <mesh position={[0.35, 1.95, fz + 0.075]}>
        <boxGeometry args={[0.18, 0.6, 0.01]} />
        <meshPhysicalMaterial
          color="#cfe8ff"
          transparent
          opacity={0.6}
          roughness={0.05}
        />
      </mesh>
      {/* panic bar */}
      <mesh position={[0, 1.05, fz + 0.11]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, dw * 0.8]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * dw * 0.38, 1.05, fz + 0.085]}>
          <boxGeometry args={[0.08, 0.12, 0.06]} />
          <meshStandardMaterial {...steel} />
        </mesh>
      ))}
      {/* door closer */}
      <mesh position={[-0.3, dh - 0.15, fz + 0.09]}>
        <boxGeometry args={[0.45, 0.1, 0.08]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.6} />
      </mesh>
      {/* fire door label */}
      <mesh position={[0, 1.55, fz + 0.075]}>
        <circleGeometry args={[0.13, 24]} />
        <meshStandardMaterial color="#fff" />
      </mesh>
      {/* exit lightbox */}
      <mesh position={[0, dh + 0.45, fz + 0.06]}>
        <boxGeometry args={[1.3, 0.38, 0.1]} />
        <meshStandardMaterial
          color="#16a34a"
          emissive="#22c55e"
          emissiveIntensity={1.6}
        />
      </mesh>
      <Sign kind="stairs" y={H + 0.9} id={id} ctx={ctx} text={label} />
    </group>
  )
}

/** Escalator running along the z axis */
export function Escalator({
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
    L = sz(h),
    rise = 3.2
  const flat = 0.9
  const slopeLen = L - flat * 2
  const ang = Math.atan2(rise, slopeLen)
  const hyp = Math.hypot(rise, slopeLen)
  const hl = ctx.hover === id || ctx.focus === "escalator"
  const n = 22
  return (
    <group
      position={[wx(x + w / 2), 0, wz(y + h / 2)]}
      {...useHoverProps(id, ctx)}
    >
      {/* landings */}
      <mesh position={[0, 0.1, L / 2 - flat / 2]} receiveShadow>
        <boxGeometry args={[W, 0.2, flat]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <mesh position={[0, rise - 0.1, -L / 2 + flat / 2]} castShadow>
        <boxGeometry args={[W, 0.3, flat]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <mesh position={[0, rise / 2 - 0.2, -L / 2 + flat / 2]} castShadow>
        <boxGeometry args={[W, rise - 0.4, flat * 0.9]} />
        <meshStandardMaterial color="#6b7079" />
      </mesh>
      {/* truss */}
      <mesh
        position={[0, rise / 2 - 0.35, 0]}
        rotation={[ang, 0, 0]}
        castShadow
      >
        <boxGeometry args={[W, 0.5, hyp]} />
        <meshStandardMaterial
          color={hl ? "#a78bfa" : "#4b5059"}
          metalness={0.4}
          roughness={0.5}
        />
      </mesh>
      {/* steps */}
      {Array.from({ length: n }).map((_, i) => {
        const f = (i + 0.5) / n
        return (
          <mesh
            key={i}
            position={[0, f * rise - 0.02, L / 2 - flat - f * slopeLen]}
            castShadow
          >
            <boxGeometry args={[W * 0.7, rise / n, slopeLen / n]} />
            <meshStandardMaterial
              color="#2a2d33"
              metalness={0.6}
              roughness={0.4}
            />
          </mesh>
        )
      })}
      {/* balustrades (glass) + handrails */}
      {[-1, 1].map((s) => (
        <group key={s} position={[(s * W) / 2.3, 0, 0]}>
          <mesh position={[0, rise / 2 + 0.55, 0]} rotation={[ang, 0, 0]}>
            <boxGeometry args={[0.05, 1, hyp]} />
            <meshPhysicalMaterial
              color="#bfe3ff"
              transmission={0.8}
              transparent
              opacity={0.35}
              roughness={0.05}
            />
          </mesh>
          <mesh position={[0, rise / 2 + 1.08, 0]} rotation={[ang, 0, 0]}>
            <boxGeometry args={[0.12, 0.08, hyp + 0.4]} />
            <meshStandardMaterial color="#111" roughness={0.4} />
          </mesh>
        </group>
      ))}
      <Sign kind="escalator" y={rise + 2.3} id={id} ctx={ctx} />
    </group>
  )
}

export const WALL_H = 4
export const WALL_T = 0.15
/**
 * Wall finishes: black marble (ground floor), polished cream marble (Lantai 4), cream-painted concrete (basement).
 * The cream finishes are tiled per wall in world units so veins / formwork joints keep their size on any wall length.
 */
export type Finish = "marble" | "creamMarble" | "creamConcrete"
/** Size of one texture tile in world units */
const FINISH_TILE = 2.4
const SKIRT: Record<Finish, {
  color: string
  metalness: number
  roughness: number
}> = {
  marble: { color: "#b08d57", metalness: 0.9, roughness: 0.3 },
  creamMarble: { color: "#b08d57", metalness: 0.85, roughness: 0.3 },
  creamConcrete: { color: "#9c937f", metalness: 0, roughness: 0.85 },
}

/** Material for a wall face of width w and height h (world units) */
/** Solid colour for the thin top / end faces of cream walls (a tiled texture would be squashed there) */
const CAP: Partial<Record<Finish, string>> = {
  creamMarble: "#f6ead2",
  creamConcrete: "#e6dbc2",
}

export function WallMaterial({
  finish = "marble",
  w,
  h,
  color = "#ffffff",
  attach,
}: {
  finish?: Finish
  w: number
  h: number
  color?: string
  attach?: string
}) {
  const tex = useTex()
  const map = useMemo(() => {
    if (finish === "marble") return tex.wallMarble
    const t = (
      finish === "creamMarble" ? tex.creamMarble : tex.creamConcrete
    ).clone()
    t.repeat.set(Math.max(w, 0.3) / FINISH_TILE, h / FINISH_TILE)
    t.needsUpdate = true
    return t
  }, [finish, w, h, tex])
  // honed satin marble: a little sheen, low env reflection so the cream is not washed grey by the studio environment
  if (finish === "creamMarble")
    return (
      <meshStandardMaterial
        attach={attach}
        map={map}
        color={color === "#ffffff" ? "#fff3dc" : color}
        roughness={0.32}
        metalness={0}
        envMapIntensity={0.55}
      />
    )
  if (finish === "creamConcrete")
    return (
      <meshStandardMaterial
        attach={attach}
        map={map}
        color={color}
        roughness={0.9}
        metalness={0}
        envMapIntensity={0.4}
      />
    )
  return (
    <meshStandardMaterial
      attach={attach}
      map={map}
      color={color}
      roughness={0.2}
      metalness={0.2}
    />
  )
}

export function Wall({
  x1,
  y1,
  x2,
  y2,
  h = WALL_H,
  finish = "marble",
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  h?: number
  finish?: Finish
}) {
  const ax = wx(x1),
    az = wz(y1),
    bx = wx(x2),
    bz = wz(y2)
  const len = Math.hypot(bx - ax, bz - az)
  return (
    <group
      position={[(ax + bx) / 2, 0, (az + bz) / 2]}
      rotation={[0, -Math.atan2(bz - az, bx - ax), 0]}
    >
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[len + WALL_T, h, WALL_T]} />
        {CAP[finish] ? (
          // box faces: 0/1 = ends, 2/3 = top/bottom, 4/5 = the two long faces
          [0, 1, 2, 3, 4, 5].map((i) =>
            i >= 4 ? (
              <WallMaterial
                key={i}
                attach={`material-${i}`}
                finish={finish}
                w={len}
                h={h}
              />
            ) : (
              <meshStandardMaterial
                key={i}
                attach={`material-${i}`}
                color={CAP[finish]}
                roughness={finish === "creamMarble" ? 0.32 : 0.9}
                envMapIntensity={0.5}
              />
            ),
          )
        ) : (
          <WallMaterial finish={finish} w={len} h={h} />
        )}
      </mesh>
      {h > 1 && (
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[len + WALL_T, 0.12, WALL_T + 0.02]} />
          <meshStandardMaterial {...SKIRT[finish]} />
        </mesh>
      )}
    </group>
  )
}

/** Glass double door with lintel (or a glass transom inside a glass wall), placed along z at world x; spans z0..z1 (world) */
export function GlassDoor({
  x,
  z0,
  z1,
  id,
  ctx,
  exit,
  glassTop,
}: {
  x: number
  z0: number
  z1: number
  id: string
  ctx: Ctx
  exit?: boolean
  glassTop?: boolean
}) {
  const L = z1 - z0,
    H = 3,
    T = WALL_T
  const hl = ctx.hover === id || ctx.focus === "door"
  const tex = useTex()
  return (
    <group position={[x, 0, (z0 + z1) / 2]} {...useHoverProps(id, ctx)}>
      {glassTop ? (
        <mesh position={[0, H + (WALL_H - H) / 2, 0]}>
          <boxGeometry args={[0.05, WALL_H - H, L]} />
          <meshPhysicalMaterial
            color="#a8d8ff"
            transparent
            opacity={0.3}
            roughness={0.05}
          />
        </mesh>
      ) : (
        <mesh position={[0, H + (WALL_H - H) / 2, 0]} castShadow>
          <boxGeometry args={[T, WALL_H - H, L]} />
          <meshStandardMaterial map={tex.wallMarble} roughness={0.2} />
        </mesh>
      )}
      <mesh position={[0, H - 0.05, 0]}>
        <boxGeometry args={[T + 0.04, 0.1, L]} />
        <meshStandardMaterial
          color={hl ? "#1fae4b" : "#3a3d42"}
          metalness={0.6}
        />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={"j" + s} position={[0, H / 2, (s * (L - 0.08)) / 2]}>
          <boxGeometry args={[T + 0.04, H, 0.08]} />
          <meshStandardMaterial color="#3a3d42" metalness={0.6} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <group key={s} position={[0, (H - 0.1) / 2, (s * L) / 4]}>
          <mesh>
            <boxGeometry args={[0.05, H - 0.12, L / 2 - 0.1]} />
            <meshPhysicalMaterial
              color={hl ? "#86efac" : "#a8d8ff"}
              transparent
              opacity={0.4}
              roughness={0.05}
            />
          </mesh>
          {[-1, 1].map((f) => (
            <mesh key={f} position={[f * 0.07, 0, -s * (L / 4 - 0.2)]}>
              <boxGeometry args={[0.04, 0.9, 0.04]} />
              <meshStandardMaterial {...steel} />
            </mesh>
          ))}
        </group>
      ))}
      {exit && (
        <mesh position={[-0.16, H + 0.45, 0]}>
          <boxGeometry args={[0.06, 0.35, 1.2]} />
          <meshStandardMaterial
            color="#1fae4b"
            emissive="#1fae4b"
            emissiveIntensity={1.4}
          />
        </mesh>
      )}
      <Sign
        kind="door"
        y={WALL_H + 1}
        id={id}
        ctx={ctx}
        text={exit ? "Pintu Keluar" : "Pintu"}
      />
    </group>
  )
}

/** Procedural canvas textures (tile floor, plaster, wood, carpet) */
export function makeTex(
  draw: (g: CanvasRenderingContext2D, n: number) => void,
  repeat: [number, number],
  n = 512,
) {
  const c = document.createElement("canvas")
  c.width = c.height = n
  draw(c.getContext("2d")!, n)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(...repeat)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}
const noise = (
  g: CanvasRenderingContext2D,
  n: number,
  a: number,
  c = "0,0,0",
) => {
  for (let i = 0; i < n * 6; i++) {
    g.fillStyle = `rgba(${c},${Math.random() * a})`
    g.fillRect(Math.random() * n, Math.random() * n, 2, 2)
  }
}
let TEX: ReturnType<typeof buildTex> | null = null
function buildTex() {
  return {
    floor: makeTex(
      (g, n) => {
        const k = 2,
          s = n / k
        for (let i = 0; i < k; i++)
          for (let j = 0; j < k; j++) {
            const v = 14 + Math.floor(Math.random() * 8)
            g.fillStyle = `rgb(${v},${v},${v + 2})`
            g.fillRect(i * s, j * s, s, s)
            for (let m = 0; m < 5; m++) {
              g.strokeStyle = `rgba(230,230,235,${0.08 + Math.random() * 0.25})`
              g.lineWidth = 0.6 + Math.random() * 1.6
              g.beginPath()
              const x0 = i * s + Math.random() * s
              g.moveTo(x0, j * s)
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
        noise(g, n, 0.08, "255,255,255")
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
      },
      [1, 1],
      1024,
    ),
    plaster: makeTex(
      (g, n) => {
        g.fillStyle = "#fff"
        g.fillRect(0, 0, n, n)
        noise(g, n, 0.06)
      },
      [2, 2],
      256,
    ),
    // polished cream marble (Lantai 4): 2 x 2 slabs with soft clouding, honey/grey veins and fine grout joints
    creamMarble: makeTex(
      (g, n) => {
        const k = 2,
          s = n / k
        for (let i = 0; i < k; i++)
          for (let j = 0; j < k; j++) {
            const v = Math.floor(Math.random() * 8)
            g.fillStyle = `rgb(${238 + v / 2},${227 + v / 2},${203 + v})`
            g.fillRect(i * s, j * s, s, s)
            g.save()
            g.beginPath()
            g.rect(i * s, j * s, s, s)
            g.clip()
            // soft clouding (concentric gradients, no hard edges)
            for (let m = 0; m < 6; m++) {
              const x = i * s + Math.random() * s,
                y = j * s + Math.random() * s,
                r = s * (0.2 + Math.random() * 0.45)
              const gr = g.createRadialGradient(x, y, 0, x, y, r)
              gr.addColorStop(
                0,
                Math.random() < 0.7
                  ? "rgba(255,251,240,0.2)"
                  : "rgba(214,192,152,0.07)",
              )
              gr.addColorStop(1, "rgba(0,0,0,0)")
              g.fillStyle = gr
              g.fillRect(x - r, y - r, 2 * r, 2 * r)
            }
            // veins: wide blurred band, then a crisp main vein with branches and hairlines, running diagonally
            const vein = (w: number, col: string, blur: number) => {
              g.filter = blur ? `blur(${blur}px)` : "none"
              g.strokeStyle = col
              g.lineWidth = w
              let x = i * s + Math.random() * s * 0.6,
                y = j * s - 10
              g.beginPath()
              g.moveTo(x, y)
              while (y < j * s + s + 10) {
                const nx = x + (Math.random() - 0.35) * 40,
                  ny = y + 18 + Math.random() * 30
                g.quadraticCurveTo(
                  x + (Math.random() - 0.5) * 30,
                  (y + ny) / 2,
                  nx,
                  ny,
                )
                x = nx
                y = ny
              }
              g.stroke()
              g.filter = "none"
            }
            vein(10, "rgba(190,160,115,0.18)", 6)
            vein(1.8, "rgba(160,122,72,0.55)", 0.6)
            vein(1.2, "rgba(140,125,110,0.4)", 0.4)
            for (let m = 0; m < 4; m++) vein(0.6, "rgba(150,120,85,0.3)", 0)
            g.restore()
          }
        noise(g, n, 0.03, "120,90,50")
        g.strokeStyle = "rgba(170,145,105,0.6)"
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
      },
      [1, 1],
      1024,
    ),
    // cast concrete painted cream (basement): even matt paint with faint roller mottling, a few pores,
    // formwork panel joints and tie holes showing through the paint
    creamConcrete: makeTex(
      (g, n) => {
        g.fillStyle = "#eadfc4"
        g.fillRect(0, 0, n, n)
        for (let m = 0; m < 30; m++) {
          const x = Math.random() * n,
            y = Math.random() * n,
            r = n * (0.1 + Math.random() * 0.2)
          const gr = g.createRadialGradient(x, y, 0, x, y, r)
          gr.addColorStop(
            0,
            Math.random() < 0.5
              ? "rgba(255,250,235,0.18)"
              : "rgba(185,165,125,0.08)",
          )
          gr.addColorStop(1, "rgba(0,0,0,0)")
          g.fillStyle = gr
          g.fillRect(x - r, y - r, r * 2, r * 2)
        }
        noise(g, n, 0.05, "110,95,65")
        for (let i = 0; i < n * 0.25; i++) {
          g.fillStyle = `rgba(120,104,76,${0.12 + Math.random() * 0.18})`
          g.beginPath()
          g.arc(
            Math.random() * n,
            Math.random() * n,
            0.5 + Math.random() * 0.8,
            0,
            Math.PI * 2,
          )
          g.fill()
        }
        // formwork panels: 1 x 2 per tile (horizontal joint at mid-height), tie holes in a grid
        g.strokeStyle = "rgba(150,132,98,0.55)"
        g.lineWidth = 2
        for (const y of [0, n / 2, n]) {
          g.beginPath()
          g.moveTo(0, y)
          g.lineTo(n, y)
          g.stroke()
        }
        for (const x of [0, n]) {
          g.beginPath()
          g.moveTo(x, 0)
          g.lineTo(x, n)
          g.stroke()
        }
        for (const y of [n / 4, (3 * n) / 4])
          for (const x of [n / 6, n / 2, (5 * n) / 6]) {
            g.fillStyle = "rgba(150,130,96,0.32)"
            g.beginPath()
            g.arc(x, y, 3, 0, Math.PI * 2)
            g.fill()
            g.fillStyle = "rgba(255,250,235,0.35)"
            g.beginPath()
            g.arc(x - 1, y - 1, 1.1, 0, Math.PI * 2)
            g.fill()
          }
      },
      [1, 1],
      512,
    ),
    wallMarble: null as unknown as THREE.Texture,
    wood: makeTex(
      (g, n) => {
        g.fillStyle = "#8a5a36"
        g.fillRect(0, 0, n, n)
        for (let i = 0; i < 90; i++) {
          g.strokeStyle = `rgba(${40 + Math.random() * 40},${20 + Math.random() * 20},10,${0.15 + Math.random() * 0.2})`
          g.lineWidth = 1 + Math.random() * 2
          const y = Math.random() * n
          g.beginPath()
          g.moveTo(0, y)
          g.bezierCurveTo(n / 3, y + 6, (2 * n) / 3, y - 6, n, y)
          g.stroke()
        }
      },
      [1, 1],
    ),
    carpet: makeTex(
      (g, n) => {
        g.fillStyle = "#2f3b52"
        g.fillRect(0, 0, n, n)
        noise(g, n, 0.25, "255,255,255")
        g.strokeStyle = "#c9a96e"
        g.lineWidth = 10
        g.strokeRect(24, 24, n - 48, n - 48)
      },
      [1, 1],
    ),
  }
}
export function useTex() {
  if (!TEX) {
    TEX = buildTex()
    TEX.wallMarble = TEX.floor.clone()
    TEX.wallMarble.repeat.set(0.5, 0.5)
    TEX.wallMarble.needsUpdate = true
  }
  return TEX
}

/** Solid core that fills dead space (e.g. behind lift banks), in the floor's wall finish */
export function Core({
  x1,
  y1,
  x2,
  y2,
  finish = "marble",
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  finish?: Finish
}) {
  const W = sz(x2 - x1),
    D = sz(y2 - y1)
  return (
    <mesh
      position={[wx((x1 + x2) / 2), WALL_H / 2, wz((y1 + y2) / 2)]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[W, WALL_H, D]} />
      <WallMaterial finish={finish} w={Math.max(W, D)} h={WALL_H} />
    </mesh>
  )
}

/** Lift-bank fascia sign, painted onto a canvas texture and mounted flat on the wall */
export function ZoneSign({
  x,
  y,
  face,
  text,
  sub,
  color,
  rot,
}: {
  x: number
  y: number
  face: 1 | -1
  text: string
  sub: string
  color: string
  rot?: number
}) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas")
    c.width = 1024
    c.height = 128
    const g = c.getContext("2d")!
    g.fillStyle = "#0b0b0d"
    g.fillRect(0, 0, 1024, 128)
    g.fillStyle = color
    g.fillRect(0, 0, 16, 128)
    g.fillStyle = "#d4b47a"
    g.fillRect(0, 122, 1024, 6)
    g.fillStyle = "#ffffff"
    g.font = "700 58px system-ui, sans-serif"
    g.textBaseline = "middle"
    g.fillText(text, 48, 64)
    g.fillStyle = "#c7c7cc"
    g.font = "500 34px system-ui, sans-serif"
    g.textAlign = "right"
    g.fillText(sub, 990, 66)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [text, sub, color])
  return (
    <mesh
      position={
        rot === undefined
          ? [wx(x), 3.62, wz(y) + face * 0.02]
          : [wx(x), 3.62, wz(y)]
      }
      rotation={[0, rot ?? (face === 1 ? 0 : Math.PI), 0]}
    >
      <planeGeometry args={[6.4, 0.8]} />
      <meshStandardMaterial
        map={tex}
        emissive="#ffffff"
        emissiveMap={tex}
        emissiveIntensity={0.35}
        roughness={0.3}
      />
    </mesh>
  )
}
