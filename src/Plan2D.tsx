import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent as RKE,
  type PointerEvent as RPE,
  type MouseEvent as RME,
  type ReactNode,
} from "react"
import { usePlace, useT } from "./prefs"
import { SIGN } from "./palette"
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
  OutIcon,
  OUT_COLOR,
  OUT_H,
  OUT_W,
  PLANTERS,
  ROAD,
  SMOKING,
  WALLS,
  type OutKind,
} from "./OutdoorData"
import {
  F4_CORE,
  F4_H,
  F4_LIFT_CORE,
  F4_LIFTS,
  F4_ROOMS,
  F4_VOID,
  F4_W,
  F4_WALLS,
  P4_COLOR,
  P4Icon,
  doorInfo,
  polyOf,
  type P4Kind,
} from "./Floor4Data"
import {
  ALL_DESTS,
  DESTS,
  OUT_RAMP,
  type Dest,
  type Floor,
  type FloorNav,
  type Leg,
  type Pt,
} from "./Wayfinding"
import {
  LB_BANK_A,
  LB_BANK_B,
  LB_BOUNDS,
  LB_CARPARK,
  LB_COLOR,
  LB_CORE,
  LB_CREAM_FLOORS,
  LB_CREAM_WALLS,
  LB_DESK,
  LB_DIVIDER,
  LB_DOOR_HALF,
  LB_EAST_GLASS,
  LB_ICON_SLOTS,
  LB_LIFT_W,
  LB_LIFT_X,
  LB_LOBBY_GLASS,
  LB_ROOMS,
  LB_WALLS,
} from "./LobbyData"
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
  B_STAIR_ICON,
  B_STAIRS,
  B_TOILET_ICON,
  B_W,
  B_WALL,
  B_WUDHU,
  BIcon,
  PICTO,
  type BKind,
  type BRect,
} from "./BasementData"

type IconKind = "lift" | "cargo" | "stairs" | "escalator" | "door" | "cafe" | "bank" | "info"
type IconC = ComponentType<{ kind: IconKind }>

const C = {
  floor: "#f4f4f5",
  wall: "#18181b",
  core: "#3f3f46",
  liftA: SIGN.lift,
  liftB: SIGN.liftB,
  cargo: SIGN.cargo,
  stairs: SIGN.escape,
  esc: SIGN.escalator,
  exit: SIGN.escape,
  bank: SIGN.bank,
  cafe: SIGN.cafe,
  route: SIGN.route,
  info: SIGN.info,
}

/**
 * Props that make an SVG shape a real button for keyboard and screen-reader users. A place is often drawn twice (its
 * room and its pictogram): only the first drawing becomes a tab stop, the others stay mouse/touch targets hidden from
 * assistive tech, so Tab visits every place exactly once.
 */
type HitProps = {
  onClick: (e: RME) => void
  onKeyDown?: (e: RKE) => void
  className: string
  role?: "button"
  tabIndex: number
  "aria-label"?: string
  "aria-pressed"?: boolean
  "aria-hidden"?: boolean
}
function useHit(pick: (id: string) => void, dest: Dest | null) {
  const place = usePlace()
  const seen = new Set<string>()
  return (id: string): HitProps => {
    const first = !seen.has(id)
    seen.add(id)
    // stop here so a pictogram inside its room does not toggle the selection twice
    const onClick = (e: RME) => {
      e.stopPropagation()
      pick(id)
    }
    if (!first)
      return {
        onClick,
        className: "cursor-pointer",
        tabIndex: -1,
        "aria-hidden": true,
      }
    const label = ALL_DESTS.find((d) => d.id === id)?.label ?? id
    return {
      onClick,
      className: "plan-hit cursor-pointer",
      role: "button",
      tabIndex: 0,
      "aria-label": place(label),
      "aria-pressed": dest?.id === id,
      onKeyDown: (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          pick(id)
        }
      },
    }
  }
}

function Pin({
  x,
  y,
  kind,
  Icon,
  size = 26,
  hit,
  active,
}: {
  x: number
  y: number
  kind: IconKind
  Icon: IconC
  size?: number
  hit?: HitProps
  active?: boolean
}) {
  const bg = {
    lift: C.liftA,
    cargo: C.cargo,
    stairs: C.stairs,
    escalator: C.esc,
    door: C.exit,
    cafe: C.cafe,
    bank: C.bank,
    info: C.info,
  }[kind]
  return (
    <g {...hit}>
      <rect
        x={x - size / 2 - 2}
        y={y - size / 2 - 2}
        width={size + 4}
        height={size + 4}
        rx={7}
        fill="#fff"
        stroke={active ? C.route : "none"}
        strokeWidth={3}
      />
      <rect
        x={x - size / 2}
        y={y - size / 2}
        width={size}
        height={size}
        rx={5}
        fill={bg}
      />
      <svg
        x={x - size / 2 + 3}
        y={y - size / 2 + 3}
        width={size - 6}
        height={size - 6}
      >
        <Icon kind={kind} />
      </svg>
    </g>
  )
}

function OutPin({
  x,
  y,
  kind,
  letter,
  size = 26,
  hit,
  active,
}: {
  x: number
  y: number
  kind: OutKind
  letter?: string
  size?: number
  hit?: HitProps
  active?: boolean
}) {
  return (
    <g {...hit}>
      <rect
        x={x - size / 2 - 2}
        y={y - size / 2 - 2}
        width={size + 4}
        height={size + 4}
        rx={7}
        fill="#fff"
        stroke={active ? C.route : "none"}
        strokeWidth={3}
      />
      <rect
        x={x - size / 2}
        y={y - size / 2}
        width={size}
        height={size}
        rx={5}
        fill={OUT_COLOR[kind]}
      />
      <svg
        x={x - size / 2 + 3}
        y={y - size / 2 + 3}
        width={size - 6}
        height={size - 6}
      >
        <OutIcon kind={kind} letter={letter} />
      </svg>
    </g>
  )
}

function Txt({
  x,
  y,
  children,
  size = 12,
  color = "#18181b",
  weight = 600,
  anchor = "middle",
}: {
  x: number
  y: number
  children: string
  size?: number
  color?: string
  weight?: number
  anchor?: "middle" | "start" | "end"
}) {
  const place = usePlace()
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fontWeight={weight}
      fill={color}
      textAnchor={anchor}
      dominantBaseline="middle"
      style={{
        paintOrder: "stroke",
        stroke: "#fff",
        strokeWidth: 3,
        strokeLinejoin: "round",
      }}
      fontFamily="system-ui, sans-serif"
    >
      {place(children)}
    </text>
  )
}

/** Pin + caption stacked (caption always below the pictogram, never on top of it) */
function Cap({
  x,
  y,
  size = 26,
  children,
  anchor = "middle",
}: {
  x: number
  y: number
  size?: number
  children: string
  anchor?: "middle" | "start" | "end"
}) {
  const dx = anchor === "end" ? size / 2 : anchor === "start" ? -size / 2 : 0
  return (
    <Txt
      x={x + dx}
      y={y + size / 2 + 11}
      size={11}
      weight={700}
      anchor={anchor}
    >
      {children}
    </Txt>
  )
}

function Route({ leg, map }: { leg: Leg; map: (p: Pt) => Pt }) {
  const pts = leg.pts.map(map)
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ")
  const e = pts[pts.length - 1]
  return (
    <g pointerEvents="none">
      <path
        d={d}
        fill="none"
        stroke="#fff"
        strokeWidth={12}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={d}
        fill="none"
        stroke={C.route}
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={d}
        fill="none"
        stroke="#fff"
        strokeWidth={2}
        strokeDasharray="2 10"
        strokeLinecap="round"
      />
      <circle
        cx={e[0]}
        cy={e[1]}
        r={11}
        fill={C.route}
        stroke="#fff"
        strokeWidth={3}
      />
      <circle cx={e[0]} cy={e[1]} r={4} fill="#fff" />
    </g>
  )
}

function You({ p }: { p: Pt }) {
  const t = useT()
  return (
    <g pointerEvents="none">
      <circle cx={p[0]} cy={p[1]} r={18} fill="#dc2626" opacity={0.2} />
      <circle
        cx={p[0]}
        cy={p[1]}
        r={8}
        fill="#dc2626"
        stroke="#fff"
        strokeWidth={3}
      />
      <Txt x={p[0]} y={p[1] - 26} size={13} color="#b91c1c" weight={800}>
        {t("Anda di sini", "You are here")}
      </Txt>
    </g>
  )
}

/**
 * Pan & zoom container for the 2D plans: mouse wheel, drag, pinch (touch) and +/− buttons.
 * Taps (not drags) still reach the pins; in pick mode a tap sets "you are here".
 */
function ZoomSvg({
  viewBox,
  children,
  onPoint,
  focus,
}: {
  viewBox: string
  children: ReactNode
  onPoint?: (x: number, y: number) => void
  focus?: Pt | null
}) {
  const ref = useRef<SVGSVGElement>(null)
  const [t, setT] = useState({ k: 1, x: 0, y: 0 })
  const tr = useRef(t)
  tr.current = t
  const ptrs = useRef(new Map<number, { x: number; y: number }>())
  const moved = useRef(0)
  const pinch = useRef<number | null>(null)
  const [vx, vy, vw, vh] = viewBox.split(" ").map(Number)

  const toSvg = (cx: number, cy: number): Pt => {
    const svg = ref.current!
    const m = svg.getScreenCTM()
    if (!m) return [0, 0]
    const p = svg.createSVGPoint()
    p.x = cx
    p.y = cy
    const l = p.matrixTransform(m.inverse())
    return [l.x, l.y]
  }
  const zoomAt = (px: number, py: number, f: number) => {
    const { k, x, y } = tr.current
    const k2 = Math.min(10, Math.max(1, k * f))
    const r = k2 / k
    setT({ k: k2, x: px - (px - x) * r, y: py - (py - y) * r })
  }
  useEffect(() => {
    const svg = ref.current!
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const [px, py] = toSvg(e.clientX, e.clientY)
      zoomAt(px, py, Math.exp(-e.deltaY * 0.0015))
    }
    svg.addEventListener("wheel", wheel, { passive: false })
    return () => svg.removeEventListener("wheel", wheel)
  }, [])
  // phones: start zoomed in around "you are here" so the plan is readable
  useEffect(() => {
    if (window.innerWidth >= 640 || !focus) return
    const k = 2.2
    setT({ k, x: vx + vw / 2 - focus[0] * k, y: vy + vh / 2 - focus[1] * k })
    // only on mount / floor change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewBox])

  const down = (e: RPE) => {
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (ptrs.current.size === 1) moved.current = 0
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()]
      pinch.current = Math.hypot(a.x - b.x, a.y - b.y)
    }
  }
  const move = (e: RPE) => {
    const prev = ptrs.current.get(e.pointerId)
    if (!prev) return
    const cur = { x: e.clientX, y: e.clientY }
    ptrs.current.set(e.pointerId, cur)
    if (ptrs.current.size === 1) {
      const [ax, ay] = toSvg(prev.x, prev.y),
        [bx, by] = toSvg(cur.x, cur.y)
      moved.current += Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y)
      if (moved.current > 4)
        setT((s) => ({ ...s, x: s.x + bx - ax, y: s.y + by - ay }))
    } else if (ptrs.current.size === 2 && pinch.current) {
      const [a, b] = [...ptrs.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      const [cx, cy] = toSvg((a.x + b.x) / 2, (a.y + b.y) / 2)
      zoomAt(cx, cy, d / pinch.current)
      pinch.current = d
      moved.current = 99
    }
  }
  const up = (e: RPE) => {
    ptrs.current.delete(e.pointerId)
    if (ptrs.current.size < 2) pinch.current = null
  }
  const click = (e: RME) => {
    if (moved.current > 6) {
      e.stopPropagation()
      e.preventDefault()
      return
    }
    if (onPoint) {
      e.stopPropagation()
      const [px, py] = toSvg(e.clientX, e.clientY)
      const { k, x, y } = tr.current
      onPoint((px - x) / k, (py - y) / k)
    }
  }
  const tr2 = useT()
  const btn =
    "flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg font-bold text-slate-700 shadow-md ring-1 ring-slate-200 hover:bg-slate-50 active:bg-slate-100"
  return (
    <div className="relative h-full w-full">
      <svg
        ref={ref}
        viewBox={viewBox}
        className="h-full w-full touch-none select-none"
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={up}
        onClickCapture={click}
        role="group"
        aria-label={tr2(
          "Denah 2D. Tab untuk memilih lokasi, Enter untuk menetapkan tujuan.",
          "2D plan. Tab to move between places, Enter to set the destination.",
        )}
      >
        <g transform={`translate(${t.x} ${t.y}) scale(${t.k})`}>{children}</g>
      </svg>
      <div
        role="group"
        aria-label={tr2("Kontrol zoom", "Zoom controls")}
        className="absolute bottom-2 right-2 flex flex-col gap-2"
      >
        <button
          type="button"
          aria-label={tr2("Perbesar", "Zoom in")}
          title={tr2("Perbesar", "Zoom in")}
          className={btn}
          onClick={() => zoomAt(vx + vw / 2, vy + vh / 2, 1.5)}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            aria-hidden
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button
          type="button"
          aria-label={tr2("Perkecil", "Zoom out")}
          title={tr2("Perkecil", "Zoom out")}
          className={btn}
          onClick={() => zoomAt(vx + vw / 2, vy + vh / 2, 1 / 1.5)}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            aria-hidden
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          >
            <path d="M5 12h14" />
          </svg>
        </button>
        <button
          type="button"
          aria-label={tr2("Tampilkan seluruh denah", "Show whole plan")}
          title={tr2("Tampilkan seluruh denah", "Show whole plan")}
          className={btn}
          onClick={() => setT({ k: 1, x: 0, y: 0 })}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            aria-hidden
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
          </svg>
        </button>
      </div>
    </div>
  )
}

const LIFT_X = [653, 725, 798, 871, 944]

function GroundPlan({
  Icon,
  dest,
  pick,
  nav,
}: {
  Icon: IconC
  dest: Dest | null
  pick: (id: string) => void
  nav: FloorNav
}) {
  const outline: Pt[] = [
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
  const doorCenters = [0.15, 0.38, 0.62, 0.85].map((f) => 40 + 547 * f)
  const a = (id: string) => dest?.id === id
  const hit = useHit(pick, dest)
  return (
    <ZoomSvg
      viewBox="-10 -10 1220 665"
      onPoint={nav.picking ? (x, y) => nav.onSet([x, y]) : undefined}
      focus={nav.yah}
    >
      <polygon
        points={outline.map((p) => p.join(",")).join(" ")}
        fill={C.floor}
        stroke={C.wall}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      {/* door wall with 4 doors */}
      {[40, ...doorCenters.flatMap((c) => [c - 24, c + 24]), 587]
        .reduce<Pt[]>(
          (acc, v, i, arr) => (i % 2 === 0 ? [...acc, [v, arr[i + 1]]] : acc),
          [],
        )
        .map(([y1, y2], i) => (
          <line
            key={i}
            x1={237}
            y1={y1}
            x2={237}
            y2={y2}
            stroke={C.wall}
            strokeWidth={6}
          />
        ))}
      {doorCenters.map((c, i) => (
        <g key={i}>
          <line
            x1={237}
            y1={c - 24}
            x2={237}
            y2={c + 24}
            stroke="#60a5fa"
            strokeWidth={3}
          />
          <Txt x={222} y={c} size={10} anchor="end" color="#2563eb">
            Pintu
          </Txt>
        </g>
      ))}
      {/* lift bank G–19 */}
      <rect x={628} y={136} width={383} height={56} fill={C.core} />
      {LIFT_X.map((x, i) => (
        <g key={"a" + i} {...hit("lift-a")}>
          <rect
            x={x}
            y={136}
            width={43}
            height={56}
            rx={4}
            fill={C.liftA}
            stroke={a("lift-a") ? C.route : "#fff"}
            strokeWidth={a("lift-a") ? 4 : 2}
          />
          <Txt
            x={x + 21.5}
            y={164}
            size={13}
            color="#fff"
            weight={800}
          >{`A${i + 1}`}</Txt>
        </g>
      ))}
      <rect x={668} y={200} width={303} height={24} rx={12} fill={C.liftA} />
      <text
        x={819.5}
        y={212}
        fontSize={13}
        fontWeight={800}
        fill="#fff"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="system-ui, sans-serif"
      >
        LIFT G – 19 · Lantai G sampai 19
      </text>
      {/* lift bank 19–33 */}
      <rect x={628} y={410} width={383} height={56} fill={C.core} />
      {LIFT_X.map((x, i) => (
        <g key={"b" + i} {...hit("lift-b")}>
          <rect
            x={x}
            y={410}
            width={43}
            height={56}
            rx={4}
            fill={C.liftB}
            stroke={a("lift-b") ? C.route : "#fff"}
            strokeWidth={a("lift-b") ? 4 : 2}
          />
          <Txt
            x={x + 21.5}
            y={438}
            size={13}
            color="#fff"
            weight={800}
          >{`B${i + 1}`}</Txt>
        </g>
      ))}
      <rect x={668} y={378} width={303} height={24} rx={12} fill={C.liftB} />
      <text
        x={819.5}
        y={390}
        fontSize={13}
        fontWeight={800}
        fill="#fff"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="system-ui, sans-serif"
      >
        LIFT 19 – 33 · Lantai 19 sampai 33
      </text>
      {/* cargo lift */}
      <rect
        x={582}
        y={110}
        width={46}
        height={82}
        rx={4}
        fill={C.cargo}
        stroke={a("cargo") ? C.route : "#fff"}
        strokeWidth={a("cargo") ? 4 : 2}
        {...hit("cargo")}
      />
      <Pin
        x={605}
        y={151}
        kind="cargo"
        Icon={Icon}
        size={24}
        hit={hit("cargo")}
      />
      <Txt x={605} y={96} size={11} weight={700}>
        Lift Barang
      </Txt>
      {/* emergency stairs */}
      {([
        [1011, 110, "st1"],
        [582, 410, "st2"],
        [1011, 410, "st3"],
      ] as [number, number, string][]).map(([x, y, id]) => (
        <g key={id}>
          <rect
            x={x}
            y={y}
            width={46}
            height={82}
            rx={4}
            fill={C.stairs}
            stroke={a(id) ? C.route : "#fff"}
            strokeWidth={a(id) ? 4 : 2}
            {...hit(id)}
          />
          <Pin
            x={x + 23}
            y={y + 41}
            kind="stairs"
            Icon={Icon}
            size={24}
            hit={hit(id)}
          />
          <Txt
            x={x + 23}
            y={y < 300 ? y - 12 : y + 96}
            size={11}
            weight={700}
          >{`Tangga Darurat ${id.slice(-1)}`}</Txt>
        </g>
      ))}
      {/* escalator */}
      <rect
        x={397}
        y={376}
        width={46}
        height={125}
        rx={4}
        fill={C.esc}
        stroke={a("esc") ? C.route : "#fff"}
        strokeWidth={a("esc") ? 4 : 2}
        {...hit("esc")}
      />
      {Array.from({ length: 10 }).map((_, i) => (
        <line
          key={i}
          x1={403}
          x2={437}
          y1={388 + i * 11}
          y2={388 + i * 11}
          stroke="#fff"
          strokeOpacity={0.45}
        />
      ))}
      <Pin
        x={420}
        y={438}
        kind="escalator"
        Icon={Icon}
        size={24}
        hit={hit("esc")}
      />
      <Txt x={452} y={438} size={11} weight={700} anchor="start">
        Eskalator
      </Txt>
      {/* exit door to corridor */}
      <line
        x1={1064}
        y1={305}
        x2={1064}
        y2={368}
        stroke={C.exit}
        strokeWidth={6}
      />
      <Pin
        x={1130}
        y={336}
        kind="door"
        Icon={Icon}
        size={24}
        hit={hit("exit")}
        active={a("exit")}
      />
      <Txt x={1130} y={290} size={11} weight={700}>
        Pintu Keluar
      </Txt>
      {/* reception */}
      <path
        d="M 548 108 A 52 52 0 0 0 548 212"
        fill="none"
        stroke={C.info}
        strokeWidth={14}
        strokeLinecap="round"
        {...hit("reception")}
      />
      <Pin
        x={470}
        y={160}
        kind={"info" as IconKind}
        Icon={Icon}
        size={24}
        hit={hit("reception")}
        active={a("reception")}
      />
      <Txt x={452} y={160} size={11} weight={700} anchor="end">
        Resepsionis
      </Txt>
      {/* bank & cafe */}
      <rect
        x={363}
        y={556}
        width={112}
        height={63}
        rx={4}
        fill={C.bank}
        stroke={a("bank") ? C.route : "#fff"}
        strokeWidth={a("bank") ? 4 : 2}
        {...hit("bank")}
      />
      <Pin
        x={419}
        y={588}
        kind="bank"
        Icon={Icon}
        size={24}
        hit={hit("bank")}
      />
      <Txt x={419} y={634} size={11} weight={700}>
        Bank Sentosa
      </Txt>
      <rect
        x={288}
        y={556}
        width={46}
        height={63}
        rx={4}
        fill={C.cafe}
        stroke={a("cafe") ? C.route : "#fff"}
        strokeWidth={a("cafe") ? 4 : 2}
        {...hit("cafe")}
      />
      <Pin
        x={311}
        y={588}
        kind="cafe"
        Icon={Icon}
        size={24}
        hit={hit("cafe")}
      />
      <Txt x={300} y={634} size={11} weight={700}>
        Kaw Kaw Coffee
      </Txt>
      {nav.leg && <Route leg={nav.leg} map={(p) => p} />}
      {nav.yah && <You p={nav.yah} />}
    </ZoomSvg>
  )
}

function OutdoorPlan({
  Icon,
  dest,
  pick,
  rotate,
  nav,
}: {
  Icon: IconC
  dest: Dest | null
  pick: (id: string) => void
  rotate: boolean
  nav: FloorNav
}) {
  // drawn in design px of the site plan (Figma 13:119), scaled by k so pins/labels keep their size.
  // landscape: rotate 90° so the long site axis runs horizontally
  const W = OUT_W,
    H = OUT_H,
    k = 613 / OUT_W
  const P = (x: number, y: number): Pt =>
    rotate ? [k * (H - y), k * x] : [k * x, k * y]
  const R = (x1: number, y1: number, x2: number, y2: number) => {
    const [ax, ay] = P(x1, y1),
      [bx, by] = P(x2, y2)
    return {
      x: Math.min(ax, bx),
      y: Math.min(ay, by),
      width: Math.abs(bx - ax),
      height: Math.abs(by - ay),
    }
  }
  const L = (x1: number, y1: number, x2: number, y2: number) => {
    const [a1, b1] = P(x1, y1),
      [a2, b2] = P(x2, y2)
    return { x1: a1, y1: b1, x2: a2, y2: b2 }
  }
  const a = (id: string) => dest?.id === id
  const hit = useHit(pick, dest)
  const vb = rotate
    ? `-10 -10 ${k * H + 20} ${k * W + 20}`
    : `-10 -10 ${k * W + 20} ${k * H + 20}`
  const park = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    label: string,
    id: string,
  ) => {
    const r = R(x1, y1, x2, y2)
    return (
      <g key={id} {...hit(id)}>
        <rect
          {...r}
          rx={4}
          fill="#52525b"
          stroke={a(id) ? C.route : "#fff"}
          strokeWidth={a(id) ? 4 : 2}
        />
        <OutPin
          x={r.x + r.width / 2}
          y={r.y + r.height / 2 - 9}
          kind="parking"
          letter={label.slice(-1)}
          size={24}
          active={a(id)}
        />
        <Cap x={r.x + r.width / 2} y={r.y + r.height / 2 - 9} size={24}>
          {label}
        </Cap>
      </g>
    )
  }
  const pin = (x: number, y: number) => P(x, y)
  return (
    <ZoomSvg
      viewBox={vb}
      onPoint={
        nav.picking
          ? (x, y) => nav.onSet(rotate ? [y / k, H - x / k] : [x / k, y / k])
          : undefined
      }
      focus={nav.yah ? P(nav.yah[0], nav.yah[1]) : null}
    >
      {/* site */}
      <rect
        {...R(0, 0, W, H)}
        fill={C.floor}
        stroke="#a1a1aa"
        strokeWidth={2}
      />
      {/* covered area (ceiling) */}
      {CEILINGS.map((c, i) => (
        <rect
          key={"c" + i}
          {...R(...c)}
          fill="#e4e4e7"
          stroke="#a1a1aa"
          strokeDasharray="8 6"
          strokeWidth={2}
        />
      ))}
      {/* road */}
      <rect {...R(ROAD.x1, 0, ROAD.x2, H)} fill="#71717a" />
      <line
        {...L(ROAD.c, 60, ROAD.c, 1920)}
        stroke="#fff"
        strokeWidth={2}
        strokeDasharray="10 10"
      />
      {LANE_YS.map((y) => {
        const [x1, y1] = P(ROAD.c - 58, y),
          [x2, y2] = P(ROAD.c + 58, y)
        const up = rotate ? 0 : -90 // north
        const down = rotate ? 180 : 90 // south
        return (
          <g key={y} fill="#fff">
            <path
              d="M -9 -4 L 4 -4 L 4 -9 L 12 0 L 4 9 L 4 4 L -9 4 Z"
              transform={`translate(${x1},${y1}) rotate(${up})`}
            />
            <path
              d="M -9 -4 L 4 -4 L 4 -9 L 12 0 L 4 9 L 4 4 L -9 4 Z"
              transform={`translate(${x2},${y2}) rotate(${down})`}
            />
          </g>
        )
      })}
      {/* building (ground floor), black walls and the closed-in areas beside Parkir F / G */}
      {[...BUILDING, ...INFILL, ...WALLS, ...BOUNDARY].map((r, i) => (
        <rect key={"m" + i} {...R(...r)} fill="#27272a" />
      ))}
      <line
        {...L(FACADE.x, FACADE.y1, FACADE.x, FACADE.y2)}
        stroke="#60a5fa"
        strokeWidth={5}
      />
      <g {...hit("gf")}>
        {(() => {
          const [x, y] = pin(105, 1305)
          return (
            <>
              <OutPin x={x} y={y} kind="building" active={a("gf")} />
              <Cap x={x} y={y}>
                Lobby Gedung
              </Cap>
            </>
          )
        })()}
      </g>
      {/* basement doors in the building walls: opened double doors + stairs down inside */}
      {BASEMENT_DOORS.map((d) => {
        const xf = d.x,
          xb = d.x - DOOR_DEPTH,
          r = (d.y2 - d.y1) / 2,
          open = 70
        const leaf = (hy: number, s: 1 | -1) => {
          // door leaf hinged at the jamb, swung open outwards, with its dashed swing arc
          const at = (t: number): [number, number] => [
            xf + r * Math.sin(t),
            hy + s * r * Math.cos(t),
          ]
          const pts = Array.from({ length: 8 }, (_, i) =>
            P(...at(((open * Math.PI) / 180) * (i / 7))),
          )
          const end = at((open * Math.PI) / 180)
          return (
            <g key={hy}>
              <polyline
                points={pts.map((q) => q.join(",")).join(" ")}
                fill="none"
                stroke={C.exit}
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
              <line
                {...L(xf, hy, end[0], end[1])}
                stroke={C.exit}
                strokeWidth={3}
                strokeLinecap="round"
              />
            </g>
          )
        }
        const [px, py] = pin(d.x + 48, (d.y1 + d.y2) / 2)
        return (
          <g key={d.id} {...hit(d.id)}>
            <rect
              {...R(xb, d.y1, xf, d.y2)}
              fill="#bbf7d0"
              stroke={a(d.id) ? C.route : C.exit}
              strokeWidth={a(d.id) ? 3 : 1.5}
            />
            {Array.from(
              { length: 4 },
              (_, i) => xb + ((i + 1) * DOOR_DEPTH) / 5,
            ).map((x) => (
              <line
                key={x}
                {...L(x, d.y1 + 2, x, d.y2 - 2)}
                stroke={C.exit}
                strokeWidth={1}
              />
            ))}
            {leaf(d.y1, 1)}
            {leaf(d.y2, -1)}
            <OutPin x={px} y={py} kind="basement" size={22} active={a(d.id)} />
            <Cap x={px} y={py} size={22}>
              {d.label}
            </Cap>
          </g>
        )
      })}
      {/* planter strips */}
      {PLANTERS.map(([x1, y1, x2, y2], i) => (
        <line
          key={"p" + i}
          {...L(x1, y1, x2, y2)}
          stroke="#15803d"
          strokeWidth={5}
          strokeLinecap="round"
        />
      ))}
      {LOTS.map((l) => park(...l.r, l.label, l.id))}
      {/* smoking area */}
      <g {...hit("smoking")}>
        <rect
          {...R(...SMOKING)}
          rx={4}
          fill="#a16207"
          stroke={a("smoking") ? C.route : "#fff"}
          strokeWidth={a("smoking") ? 4 : 2}
        />
        {(() => {
          const [x, y] = pin(
            (SMOKING[0] + SMOKING[2]) / 2,
            (SMOKING[1] + SMOKING[3]) / 2 - 10,
          )
          return (
            <>
              <OutPin x={x} y={y - 6} kind="smoking" active={a("smoking")} />
              <Cap x={x} y={y}>
                Smoking Area
              </Cap>
            </>
          )
        })()}
      </g>
      {/* basement vehicle exit ramp comes up on the south-bound lane, cars leave through the south gate */}
      {(() => {
        const [x, y] = pin(OUT_RAMP[0] + 30, OUT_RAMP[1])
        return (
          <>
            <OutPin x={x} y={y} kind="ramp" size={22} />
            <Cap x={x} y={y} size={22}>
              Ramp Keluar Basement
            </Cap>
          </>
        )
      })()}
      {/* gates */}
      {GATES.map((g, i) => (
        <g key={g.id} {...hit(g.id)}>
          <line
            {...L(g.x1, g.y, g.x2, g.y)}
            stroke="#dc2626"
            strokeWidth={6}
            strokeDasharray="12 6"
          />
          {(() => {
            const [x, yy] = pin(g.x1 - 50, g.y + (i ? -10 : 30))
            return (
              <OutPin x={x} y={yy} kind="gate" size={24} active={a(g.id)} />
            )
          })()}
          {(() => {
            const [x, yy] = pin(g.x1 - 50, g.y + (i ? -10 : 30))
            return (
              <Cap
                x={x}
                y={yy}
                size={24}
                anchor={rotate ? (i ? "start" : "end") : "middle"}
              >
                Gate Masuk dan Keluar
              </Cap>
            )
          })()}
        </g>
      ))}
      {nav.leg && <Route leg={nav.leg} map={(p) => P(p[0], p[1])} />}
      {nav.yah && <You p={P(nav.yah[0], nav.yah[1])} />}
    </ZoomSvg>
  )
}

function P4Pin({
  x,
  y,
  kind,
  size = 26,
  hit,
  active,
}: {
  x: number
  y: number
  kind: P4Kind
  size?: number
  hit?: HitProps
  active?: boolean
}) {
  return (
    <g {...hit}>
      <rect
        x={x - size / 2 - 2}
        y={y - size / 2 - 2}
        width={size + 4}
        height={size + 4}
        rx={7}
        fill="#fff"
        stroke={active ? C.route : "none"}
        strokeWidth={3}
      />
      <rect
        x={x - size / 2}
        y={y - size / 2}
        width={size}
        height={size}
        rx={5}
        fill={P4_COLOR[kind]}
      />
      <svg
        x={x - size / 2 + 3}
        y={y - size / 2 + 3}
        width={size - 6}
        height={size - 6}
      >
        <P4Icon kind={kind} />
      </svg>
    </g>
  )
}

/** Door opening drawn on a wall: gap in the wall + small coloured pictogram right outside it */
function Door({
  p,
  horizontal,
  color,
}: {
  p: Pt
  horizontal: boolean
  color: string
}) {
  const w = 28
  return horizontal ? (
    <line
      x1={p[0] - w / 2}
      y1={p[1]}
      x2={p[0] + w / 2}
      y2={p[1]}
      stroke={color}
      strokeWidth={5}
      strokeLinecap="round"
    />
  ) : (
    <line
      x1={p[0]}
      y1={p[1] - w / 2}
      x2={p[0]}
      y2={p[1] + w / 2}
      stroke={color}
      strokeWidth={5}
      strokeLinecap="round"
    />
  )
}

function Floor4Plan({
  dest,
  pick,
  nav,
}: {
  dest: Dest | null
  pick: (id: string) => void
  nav: FloorNav
}) {
  const a = (id: string) => dest?.id === id
  const hit = useHit(pick, dest)
  const horiz = (q: Parameters<typeof doorInfo>[0]) => doorInfo(q).horizontal
  const pts = (q: Parameters<typeof polyOf>[0]) =>
    polyOf(q)
      .map((p) => p.join(","))
      .join(" ")
  return (
    <ZoomSvg
      viewBox={`-10 -10 ${F4_W + 20} ${F4_H + 20}`}
      onPoint={nav.picking ? (x, y) => nav.onSet([x, y]) : undefined}
      focus={nav.yah}
    >
      <rect
        x={0}
        y={0}
        width={F4_W}
        height={F4_H}
        fill={C.floor}
        stroke={C.wall}
        strokeWidth={4}
      />
      {F4_ROOMS.map((q) => (
        <g key={q.id} {...hit(q.id)}>
          <rect
            x={q.x1}
            y={q.y1}
            width={q.x2 - q.x1}
            height={q.y2 - q.y1}
            fill={a(q.id) ? "#ffedd5" : "#fff"}
            stroke={a(q.id) ? C.route : C.wall}
            strokeWidth={a(q.id) ? 4 : 2}
          />
          <Txt
            x={(q.x1 + q.x2) / 2}
            y={(q.y1 + q.y2) / 2}
            size={12}
            weight={700}
          >
            {q.label}
          </Txt>
          <Door p={q.door} horizontal={horiz(q)} color="#64748b" />
        </g>
      ))}
      {/* solid wall block facing the lifts + lift-bank core */}
      <rect
        x={F4_VOID.x1}
        y={F4_VOID.y1}
        width={F4_VOID.x2 - F4_VOID.x1}
        height={F4_VOID.y2 - F4_VOID.y1}
        fill={C.core}
      />
      <rect
        x={F4_LIFT_CORE.x1}
        y={F4_LIFT_CORE.y1}
        width={F4_LIFT_CORE.x2 - F4_LIFT_CORE.x1}
        height={F4_LIFT_CORE.y2 - F4_LIFT_CORE.y1}
        fill={C.core}
      />
      <text
        x={(F4_VOID.x1 + F4_VOID.x2) / 2}
        y={(F4_VOID.y1 + F4_VOID.y2) / 2}
        fontSize={13}
        fontWeight={800}
        fill="#fff"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="system-ui, sans-serif"
        transform={`rotate(-90 ${(F4_VOID.x1 + F4_VOID.x2) / 2} ${(F4_VOID.y1 + F4_VOID.y2) / 2})`}
      >
        LIFT G – 19 · Lantai G sampai 19
      </text>
      {F4_WALLS.map(([x1, y1, x2, y2], i) => (
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={C.wall}
          strokeWidth={2}
        />
      ))}
      {/* core rooms with door + pictogram */}
      {F4_CORE.map((q) => {
        const c = q.pin ?? [(q.x1 + q.x2) / 2, (q.y1 + q.y2) / 2]
        return (
          <g key={q.id} {...hit(q.id)}>
            <polygon
              points={pts(q)}
              fill={a(q.id) ? "#ffedd5" : P4_COLOR[q.kind]}
              fillOpacity={a(q.id) ? 1 : 0.12}
              stroke={a(q.id) ? C.route : C.wall}
              strokeWidth={a(q.id) ? 4 : 2}
              strokeLinejoin="round"
            />
            <P4Pin
              x={c[0]}
              y={c[1] - 8}
              kind={q.kind}
              size={26}
              active={a(q.id)}
            />
            <Txt x={c[0]} y={c[1] + 18} size={10} weight={700}>
              {q.label}
            </Txt>
            <Door p={q.door} horizontal={horiz(q)} color={P4_COLOR[q.kind]} />
            {/* small pictogram marking the entrance */}
            {(() => {
              const { horizontal: h, inward } = doorInfo(q)
              return (
                <P4Pin
                  x={q.door[0] - (h ? 0 : inward * 16)}
                  y={q.door[1] - (h ? inward * 16 : 0)}
                  kind={q.kind}
                  size={18}
                />
              )
            })()}
          </g>
        )
      })}
      {/* lift bank */}
      {F4_LIFTS.map((cy, i) => (
        <g key={cy} {...hit("f4-lift")}>
          <rect
            x={368}
            y={cy - 27}
            width={75}
            height={54}
            rx={4}
            fill={C.liftA}
            stroke={a("f4-lift") ? C.route : "#fff"}
            strokeWidth={a("f4-lift") ? 4 : 2}
          />
          <P4Pin x={392} y={cy} kind="lift" size={24} />
          <Txt
            x={425}
            y={cy}
            size={12}
            color="#fff"
            weight={800}
          >{`A${i + 1}`}</Txt>
        </g>
      ))}
      {nav.leg && <Route leg={nav.leg} map={(p) => p} />}
      {nav.yah && <You p={nav.yah} />}
    </ZoomSvg>
  )
}

function BPin({
  x,
  y,
  kind,
  letter,
  size = 26,
  active,
}: {
  x: number
  y: number
  kind: BKind
  letter?: string
  size?: number
  active?: boolean
}) {
  return (
    <g>
      <rect
        x={x - size / 2 - 2}
        y={y - size / 2 - 2}
        width={size + 4}
        height={size + 4}
        rx={7}
        fill="#fff"
        stroke={active ? C.route : "none"}
        strokeWidth={3}
      />
      <rect
        x={x - size / 2}
        y={y - size / 2}
        width={size}
        height={size}
        rx={5}
        fill={B_COLOR[kind]}
      />
      <svg
        x={x - size / 2 + 3}
        y={y - size / 2 + 3}
        width={size - 6}
        height={size - 6}
      >
        <BIcon kind={kind} letter={letter} />
      </svg>
    </g>
  )
}

/**
 * Axis-aligned glass wall on the plan: centre line from `a` to `b` along the wall at cross coordinate `c`, thickness `t`,
 * mullions every ~36 px and a glass double door (leaves of length `h`) centred at `door`, swinging to side `swing` (+1/-1).
 */
function GlassWall2D({
  vertical,
  c,
  a,
  b,
  t,
  door,
  h,
  swing,
}: {
  vertical: boolean
  c: number
  a: number
  b: number
  t: number
  door: number
  h: number
  swing: 1 | -1
}) {
  const P = (along: number, across: number) =>
    vertical ? `${across} ${along}` : `${along} ${across}`
  const XY = (along: number, across: number) =>
    vertical ? { x: across, y: along } : { x: along, y: across }
  // sweep direction of the first leaf's arc (from the open leaf back to the closed position)
  const s1 = (vertical ? swing : -swing) > 0 ? 1 : 0
  return (
    <g pointerEvents="none">
      {([
        [a, door - h],
        [door + h, b],
      ] as const).map(([s, e]) => {
        const n = Math.max(1, Math.floor((e - s) / 36)),
          r0 = XY(s, c - t / 2)
        return (
          <g key={s}>
            <rect
              x={r0.x}
              y={r0.y}
              width={vertical ? t : e - s}
              height={vertical ? e - s : t}
              fill="#dbeafe"
              stroke="#60a5fa"
              strokeWidth={1.5}
            />
            <path
              d={`M ${P(s, c)} L ${P(e, c)}`}
              stroke="#60a5fa"
              strokeWidth={1}
            />
            {Array.from(
              { length: n - 1 },
              (_, i) => s + ((i + 1) * (e - s)) / n,
            ).map((m) => (
              <path
                key={m}
                d={`M ${P(m, c - t / 2)} L ${P(m, c + t / 2)}`}
                stroke="#3b82f6"
                strokeWidth={2}
              />
            ))}
          </g>
        )
      })}
      <g stroke="#2563eb" fill="none">
        <path
          d={`M ${P(door - h, c)} L ${P(door - h, c + swing * h)}`}
          strokeWidth={2}
        />
        <path
          d={`M ${P(door + h, c)} L ${P(door + h, c + swing * h)}`}
          strokeWidth={2}
        />
        <path
          d={`M ${P(door - h, c + swing * h)} A ${h} ${h} 0 0 ${s1} ${P(door, c)}`}
          strokeDasharray="3 3"
          strokeWidth={1.2}
        />
        <path
          d={`M ${P(door + h, c + swing * h)} A ${h} ${h} 0 0 ${1 - s1} ${P(door, c)}`}
          strokeDasharray="3 3"
          strokeWidth={1.2}
        />
      </g>
    </g>
  )
}

/** Lobby (Figma 13:3), drawn in ground-floor px: building east of the glass facade, open car-park deck west of it */
function LobbyPlan({
  dest,
  pick,
  nav,
}: {
  dest: Dest | null
  pick: (id: string) => void
  nav: FloorNav
}) {
  const B = LB_BOUNDS,
    D = LB_DIVIDER,
    P = LB_CARPARK
  const a = (id: string) => dest?.id === id
  const hit = useHit(pick, dest)
  const door = LB_DOOR_HALF
  const gx = (D.x1 + D.x2) / 2
  const stalls = Math.floor((P.y2 - P.y1) / 52),
    pitch = (P.y2 - P.y1) / stalls
  const box = (q: { x1: number; y1: number; x2: number; y2: number }) => ({
    x: q.x1,
    y: q.y1,
    width: q.x2 - q.x1,
    height: q.y2 - q.y1,
  })
  const core = Object.fromEntries(LB_CORE.map((q) => [q.kind, q]))
  return (
    <ZoomSvg
      viewBox={`${B.x1 - 10} ${B.y1 - 10} ${B.x2 - B.x1 + 20} ${B.y2 - B.y1 + 20}`}
      onPoint={nav.picking ? (x, y) => nav.onSet([x, y]) : undefined}
      focus={nav.yah}
    >
      {/* open car-park deck above the outdoor side of the entrance */}
      <rect
        x={B.x1}
        y={B.y1}
        width={D.x1 - B.x1}
        height={B.y2 - B.y1}
        fill="#e4e4e7"
        stroke="#a1a1aa"
        strokeWidth={2}
        strokeDasharray="8 6"
      />
      <Txt
        x={(B.x1 + D.x1) / 2}
        y={B.y1 + 40}
        size={10}
        weight={600}
        color="#71717a"
      >
        Dek parkir · di atas Area Luar
      </Txt>
      <g {...hit(P.id)}>
        <rect
          {...box(P)}
          rx={4}
          fill="#52525b"
          stroke={a(P.id) ? C.route : "#fff"}
          strokeWidth={a(P.id) ? 4 : 2}
        />
        {Array.from({ length: stalls + 1 }, (_, i) => P.y1 + i * pitch).map(
          (y) => (
            <g key={y} stroke="#fff" strokeOpacity={0.55} strokeWidth={1.5}>
              <line x1={P.x1} y1={y} x2={P.x1 + 92} y2={y} />
              <line x1={P.x2 - 92} y1={y} x2={P.x2} y2={y} />
            </g>
          ),
        )}
        <BPin
          x={(P.x1 + P.x2) / 2}
          y={(P.y1 + P.y2) / 2 - 8}
          kind="parking"
          active={a(P.id)}
        />
        <Cap x={(P.x1 + P.x2) / 2} y={(P.y1 + P.y2) / 2 - 8}>
          {P.label}
        </Cap>
      </g>
      {/* building floor */}
      <rect
        x={D.x2}
        y={B.y1}
        width={B.x2 - D.x2}
        height={B.y2 - B.y1}
        fill={C.floor}
        stroke={C.wall}
        strokeWidth={4}
      />
      {/* cream corridors past the glass walls (the hall keeps the plain floor) */}
      {LB_CREAM_FLOORS.map(([x1, y1, x2, y2], i) => (
        <rect
          key={i}
          x={x1}
          y={y1}
          width={x2 - x1}
          height={y2 - y1}
          fill="#fbf3e2"
        />
      ))}
      {/* solid wall west of Toilet Pria, cream marble (faces the cream corridor); drawn under the rooms so the Toilet Pria label stays on top */}
      {LB_CREAM_WALLS.map(([x1, y1, x2, y2], i) => (
        <rect
          key={"c" + i}
          x={x1}
          y={y1}
          width={x2 - x1}
          height={y2 - y1}
          fill="#e9dcc0"
          stroke={C.wall}
          strokeWidth={1.5}
        />
      ))}
      {/* rooms */}
      {LB_ROOMS.map((q) => {
        const cx = (q.x1 + q.x2) / 2,
          cy = (q.y1 + q.y2) / 2
        const wc = q.kind === "men" || q.kind === "women"
        const h =
          Math.abs(q.door[1] - q.y1) < 1 || Math.abs(q.door[1] - q.y2) < 1
        if (q.open)
          return (
            // open lobby: no walls, cream floor with a blue inlay border and the one long white reception desk
            <g key={q.id} {...hit(q.id)}>
              <rect
                {...box(q)}
                fill={a(q.id) ? "#ffedd5" : "#fbf3e2"}
                stroke={a(q.id) ? C.route : "#3b6fd4"}
                strokeWidth={a(q.id) ? 3 : 2}
                strokeDasharray={a(q.id) ? undefined : "6 5"}
              />
              <rect
                {...box(LB_DESK)}
                rx={3}
                fill="#ffffff"
                stroke="#cbd5e1"
                strokeWidth={1}
              />
              <rect
                x={LB_DESK.x1}
                y={LB_DESK.y2 - 2}
                width={LB_DESK.x2 - LB_DESK.x1}
                height={2}
                fill="#1d4ed8"
              />
              <text
                x={(LB_DESK.x1 + LB_DESK.x2) / 2}
                y={(LB_DESK.y1 + LB_DESK.y2) / 2}
                fontSize={7.5}
                fontWeight={800}
                letterSpacing={1.5}
                fill="#1e3a8a"
                textAnchor="middle"
                dominantBaseline="middle"
                fontFamily="system-ui, sans-serif"
              >
                {LB_DESK.text}
              </text>
              <Txt x={cx} y={LB_DESK.y2 + 18} size={11} weight={700}>
                {q.label}
              </Txt>
              <Txt
                x={cx}
                y={LB_DESK.y2 + 32}
                size={9}
                weight={600}
                color="#71717a"
              >
                Meja resepsionis
              </Txt>
            </g>
          )
        if (q.curve) {
          // rounded south-west corner holding the curved entrance
          const R = q.curve,
            arc = (a: number) => {
              const t = (a * Math.PI) / 180
              return `${q.x1 + R + R * Math.cos(t)} ${q.y2 - R + R * Math.sin(t)}`
            }
          return (
            <g key={q.id} {...hit(q.id)}>
              <path
                d={`M ${q.x1} ${q.y1} H ${q.x2} V ${q.y2} H ${q.x1 + R} A ${R} ${R} 0 0 1 ${q.x1} ${q.y2 - R} Z`}
                fill={a(q.id) ? "#ffedd5" : "#fff"}
                stroke={a(q.id) ? C.route : C.wall}
                strokeWidth={a(q.id) ? 4 : 2}
              />
              <path
                d={`M ${arc(106)} A ${R} ${R} 0 0 1 ${arc(164)}`}
                fill="none"
                stroke="#64748b"
                strokeWidth={5}
                strokeLinecap="round"
              />
              <Txt x={cx} y={cy} size={12} weight={700}>
                {q.label}
              </Txt>
            </g>
          )
        }
        return (
          <g key={q.id} {...hit(q.id)}>
            <rect
              {...box(q)}
              fill={a(q.id) ? "#ffedd5" : wc ? LB_COLOR[q.kind] : "#fff"}
              fillOpacity={a(q.id) ? 1 : wc ? 0.12 : 1}
              stroke={a(q.id) ? C.route : C.wall}
              strokeWidth={a(q.id) ? 4 : 2}
            />
            <Door
              p={q.door}
              horizontal={h}
              color={wc ? LB_COLOR[q.kind] : "#64748b"}
            />
            {q.kind === "men" ? (
              <Txt x={q.x1 - 8} y={cy} size={10} weight={700} anchor="end">
                {q.label}
              </Txt>
            ) : q.kind === "women" ? (
              <Txt x={q.x2 + 8} y={cy} size={10} weight={700} anchor="start">
                {q.label}
              </Txt>
            ) : (
              <g transform={q.vertical ? `rotate(90 ${cx} ${cy})` : undefined}>
                <Txt
                  x={cx}
                  y={cy}
                  size={q.x2 - q.x1 < 130 && !q.vertical ? 10 : 12}
                  weight={700}
                >
                  {q.label}
                </Txt>
              </g>
            )}
          </g>
        )
      })}
      {/* solid building mass around the Lift G–19 core */}
      {LB_WALLS.map(([x1, y1, x2, y2], i) => (
        <rect
          key={i}
          x={x1}
          y={y1}
          width={x2 - x1}
          height={y2 - y1}
          fill={C.core}
        />
      ))}
      {/* full-height glass facade with the double door to the car park, and the glass wall in front of the lobby with its double door */}
      <GlassWall2D
        vertical
        c={gx}
        a={B.y1}
        b={B.y2}
        t={D.x2 - D.x1}
        door={D.door}
        h={door}
        swing={1}
      />
      <GlassWall2D
        vertical={false}
        c={LB_LOBBY_GLASS.y}
        a={LB_LOBBY_GLASS.x1}
        b={LB_LOBBY_GLASS.x2}
        t={LB_LOBBY_GLASS.t}
        door={LB_LOBBY_GLASS.door}
        h={door}
        swing={-1}
      />
      <Txt
        x={D.x2 + 8}
        y={D.door - door - 10}
        size={10}
        anchor="start"
        color="#2563eb"
      >
        Dinding kaca · Pintu ganda
      </Txt>
      <Txt
        x={LB_LOBBY_GLASS.door + door + 6}
        y={LB_LOBBY_GLASS.y + 16}
        size={10}
        anchor="start"
        color="#2563eb"
      >
        Pintu ganda · Lobby
      </Txt>
      <GlassWall2D
        vertical
        c={LB_EAST_GLASS.x}
        a={LB_EAST_GLASS.y1}
        b={LB_EAST_GLASS.y2}
        t={LB_EAST_GLASS.t}
        door={LB_EAST_GLASS.door}
        h={door}
        swing={1}
      />
      {/* lift banks (same shafts as the Ground Floor) */}
      {([
        [
          LB_BANK_A,
          C.liftA,
          "lb-lift",
          "LIFT G – 19 · Lantai G sampai 19",
          LB_BANK_A.y2 + 8,
        ],
        [
          LB_BANK_B,
          C.liftB,
          "",
          "LIFT 19 – 33 · Lantai 19 sampai 33",
          LB_BANK_B.y1 - 32,
        ],
      ] as const).map(([bank, color, id, text, by]) => (
        <g key={text} {...(id ? hit(id) : null)}>
          <rect {...box(bank)} fill={C.core} />
          {LB_LIFT_X.map((x) => (
            <rect
              key={x}
              x={x}
              y={bank.y1}
              width={LB_LIFT_W}
              height={bank.y2 - bank.y1}
              rx={4}
              fill={color}
              stroke={id && a(id) ? C.route : "#fff"}
              strokeWidth={id && a(id) ? 4 : 2}
            />
          ))}
          <rect x={668} y={by} width={303} height={24} rx={12} fill={color} />
          <text
            x={819.5}
            y={by + 12}
            fontSize={13}
            fontWeight={800}
            fill="#fff"
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="system-ui, sans-serif"
          >
            {text}
          </text>
        </g>
      ))}
      {/* Lift Barang, emergency stairs, escalator */}
      <g {...hit(core.cargo.id)}>
        <rect
          {...box(core.cargo)}
          rx={4}
          fill={C.cargo}
          stroke={a(core.cargo.id) ? C.route : "#fff"}
          strokeWidth={a(core.cargo.id) ? 4 : 2}
        />
        <Txt
          x={(core.cargo.x1 + core.cargo.x2) / 2}
          y={core.cargo.y1 - 14}
          size={11}
          weight={700}
        >
          {core.cargo.label}
        </Txt>
      </g>
      {LB_CORE.filter((q) => q.kind === "stairs").map((q) => (
        <g key={q.id} {...hit(q.id)}>
          <rect
            {...box(q)}
            rx={4}
            fill={C.stairs}
            stroke={a(q.id) ? C.route : "#fff"}
            strokeWidth={a(q.id) ? 4 : 2}
          />
          {Array.from({ length: 6 }, (_, i) => q.y1 + 30 + i * 8).map((y) => (
            <line
              key={y}
              x1={q.x1 + 5}
              x2={q.x2 - 5}
              y1={y}
              y2={y}
              stroke="#fff"
              strokeOpacity={0.5}
            />
          ))}
          {/* the south wall now runs along the back of the stairs: label beside them (hall side / lab-corridor side) */}
          {q.x1 < 800 ? (
            <Txt
              x={q.x1 - 8}
              y={(q.y1 + q.y2) / 2}
              size={11}
              weight={700}
              anchor="end"
            >
              {q.label}
            </Txt>
          ) : (
            <Txt
              x={q.x2 + 8}
              y={(q.y1 + q.y2) / 2}
              size={11}
              weight={700}
              anchor="start"
            >
              {q.label}
            </Txt>
          )}
        </g>
      ))}
      <g {...hit(core.escalator.id)}>
        <rect
          {...box(core.escalator)}
          rx={4}
          fill={C.esc}
          stroke={a(core.escalator.id) ? C.route : "#fff"}
          strokeWidth={a(core.escalator.id) ? 4 : 2}
        />
        {Array.from({ length: 4 }).map((_, i) => (
          <line
            key={i}
            x1={core.escalator.x1 + 6}
            x2={core.escalator.x2 - 6}
            y1={core.escalator.y1 + 12 + i * 11}
            y2={core.escalator.y1 + 12 + i * 11}
            stroke="#fff"
            strokeOpacity={0.45}
          />
        ))}
        {Array.from({ length: 4 }).map((_, i) => (
          <line
            key={"b" + i}
            x1={core.escalator.x1 + 6}
            x2={core.escalator.x2 - 6}
            y1={core.escalator.y2 - 12 - i * 11}
            y2={core.escalator.y2 - 12 - i * 11}
            stroke="#fff"
            strokeOpacity={0.45}
          />
        ))}
        <Txt
          x={core.escalator.x2 + 8}
          y={(core.escalator.y1 + core.escalator.y2) / 2}
          size={11}
          weight={700}
          anchor="start"
        >
          {core.escalator.label}
        </Txt>
      </g>
      {/* pictograms from the plan, in their slots */}
      {LB_ICON_SLOTS.map(({ href, r }, i) => (
        <image
          key={i}
          href={href}
          x={r[0]}
          y={r[1]}
          width={r[2] - r[0]}
          height={r[3] - r[1]}
          preserveAspectRatio="none"
          pointerEvents="none"
        />
      ))}
      {nav.leg && <Route leg={nav.leg} map={(p) => p} />}
      {nav.yah && <You p={nav.yah} />}
    </ZoomSvg>
  )
}

/** Caption placement per stair (plan px + text anchor), clear of the EXIT signs and the lift */
const STAIR_CAP: Record<string, [number, number, "middle" | "start" | "end"]> =
  {
    "b-st1": [1176, 128, "end"],
    "b-st2": [1698, 52, "end"],
    "b-st3": [430, 322, "middle"],
    "b-st4": [1094, 852, "start"],
  }

function BasementPlan({
  dest,
  pick,
  rotate,
  nav,
}: {
  dest: Dest | null
  pick: (id: string) => void
  rotate: boolean
  nav: FloorNav
}) {
  // design px (Figma 1:4) scaled by k so pins/labels keep their size; portrait: rotate 90° so the long axis runs vertically
  const k = 0.55
  const P = (x: number, y: number): Pt =>
    rotate ? [k * (B_H - y), k * x] : [k * x, k * y]
  const R = (x1: number, y1: number, x2: number, y2: number) => {
    const [ax, ay] = P(x1, y1),
      [bx, by] = P(x2, y2)
    return {
      x: Math.min(ax, bx),
      y: Math.min(ay, by),
      width: Math.abs(bx - ax),
      height: Math.abs(by - ay),
    }
  }
  const L = (x1: number, y1: number, x2: number, y2: number) => {
    const [a1, b1] = P(x1, y1),
      [a2, b2] = P(x2, y2)
    return { x1: a1, y1: b1, x2: a2, y2: b2 }
  }
  // pictogram image from the plan, kept upright (not rotated with the plan) in its design slot
  const img = (r: BRect, href: string, opacity?: number) => {
    const [x, y] = P((r[0] + r[2]) / 2, (r[1] + r[3]) / 2),
      w = k * (r[2] - r[0]),
      h = k * (r[3] - r[1])
    return (
      <image
        href={href}
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        preserveAspectRatio="none"
        opacity={opacity}
        pointerEvents="none"
      />
    )
  }
  const a = (id: string) => dest?.id === id
  const hit = useHit(pick, dest)
  const vb = rotate
    ? `-10 -10 ${k * B_H + 20} ${k * B_W + 20}`
    : `-10 -10 ${k * B_W + 20} ${k * B_H + 20}`
  const mid = (r: BRect): Pt => P((r[0] + r[2]) / 2, (r[1] + r[3]) / 2)
  const label = (
    p: Pt,
    kind: BKind,
    text: string,
    active: boolean,
    letter?: string,
    size = 24,
  ) => (
    <>
      <BPin
        x={p[0]}
        y={p[1] - 8}
        kind={kind}
        letter={letter}
        size={size}
        active={active}
      />
      <Cap x={p[0]} y={p[1] - 8} size={size}>
        {text}
      </Cap>
    </>
  )
  const arrow = (
    x: number,
    y: number,
    key: string | number,
    fill = "#a1a1aa",
  ) => {
    const [px, py] = P(x, y)
    return (
      <path
        key={key}
        d="M -9 -4 L 4 -4 L 4 -9 L 12 0 L 4 9 L 4 4 L -9 4 Z"
        fill={fill}
        transform={`translate(${px},${py}) rotate(${rotate ? 270 : 180})`}
      />
    )
  }
  const rugs: Pt[] = []
  // rows face the qibla to the west: imam at the west side, rows behind him to the east
  for (let row = 0; row < 4; row++)
    for (let y = B_MOSQUE.r[1] + 14; y <= B_MOSQUE.r[3] - 14; y += 16)
      rugs.push([B_MOSQUE.r[0] + 48 + row * 30, y])
  const rampMid = (B_RAMP.y1 + B_RAMP.y2) / 2
  return (
    <ZoomSvg
      viewBox={vb}
      onPoint={
        nav.picking
          ? (x, y) => nav.onSet(rotate ? [y / k, B_H - x / k] : [x / k, y / k])
          : undefined
      }
      focus={nav.yah ? P(nav.yah[0], nav.yah[1]) : null}
    >
      <rect
        {...R(0, 0, B_W, B_H)}
        fill={C.floor}
        stroke={C.wall}
        strokeWidth={4}
      />
      {/* vehicle exit: no gate — marked line, then the ramp straight up to the outdoor driveway (opening in the west wall) */}
      <g {...hit(B_RAMP.id)}>
        <rect
          {...R(B_RAMP.x1, B_RAMP.y1, B_RAMP.x2, B_RAMP.y2)}
          fill={a(B_RAMP.id) ? "#ffedd5" : "#d4d4d8"}
          stroke={a(B_RAMP.id) ? C.route : "none"}
          strokeWidth={3}
        />
        <line
          {...L(0, B_RAMP.y1, 0, B_RAMP.y2)}
          stroke="#d4d4d8"
          strokeWidth={6}
        />
        {[50, 200].map((x) => arrow(x, rampMid + 60, "r" + x, "#ffffff"))}
        <rect
          {...R(B_RAMP.line[0], B_RAMP.y1, B_RAMP.line[1], B_RAMP.y2)}
          fill="#facc15"
        />
        <line
          {...L(
            (B_RAMP.line[0] + B_RAMP.line[1]) / 2,
            B_RAMP.y1,
            (B_RAMP.line[0] + B_RAMP.line[1]) / 2,
            B_RAMP.y2,
          )}
          stroke="#111827"
          strokeWidth={k * 11}
          strokeDasharray="8 8"
        />
        {label(P(122, rampMid - 10), "ramp", "Ramp Keluar", a(B_RAMP.id))}
      </g>
      {/* driving aisle: dashed centre line + arrows towards the exit ramp */}
      <line
        {...L(300, B_AISLE_Y, 1800, B_AISLE_Y)}
        stroke="#a1a1aa"
        strokeWidth={2}
        strokeDasharray="10 10"
      />
      {[380, 720, 1000, 1290, 1600].map((x) => arrow(x, B_AISLE_Y - 40, x))}
      {/* white wall in front of the mosque, between it and the parking hall */}
      <rect
        {...R(...B_WALL)}
        fill="#ffffff"
        stroke="#a1a1aa"
        strokeWidth={1.5}
      />
      {/* car parks */}
      {B_LOTS.map((l) => (
        <g key={l.id} {...hit(l.id)}>
          <rect
            {...R(...l.r)}
            rx={4}
            fill="#52525b"
            stroke={a(l.id) ? C.route : "#fff"}
            strokeWidth={a(l.id) ? 4 : 2}
          />
          {label(mid(l.r), "parking", l.label, a(l.id), l.letter)}
        </g>
      ))}
      {/* rooms with door gap */}
      {B_ROOMS.map((q) => {
        const [dx, dy] = q.door!
        const vertical = dx === q.r[0] || dx === q.r[2]
        const toilet = q.kind === "toilet"
        return (
          <g key={q.id} {...hit(q.id)}>
            <rect
              {...R(...q.r)}
              fill={a(q.id) ? "#ffedd5" : B_COLOR[q.kind]}
              fillOpacity={a(q.id) ? 1 : 0.14}
              stroke={a(q.id) ? C.route : C.wall}
              strokeWidth={a(q.id) ? 4 : 2}
            />
            <line
              {...(vertical
                ? L(dx, dy - 18, dx, dy + 18)
                : L(dx - 18, dy, dx + 18, dy))}
              stroke={B_COLOR[q.kind]}
              strokeWidth={5}
              strokeLinecap="round"
            />
            {/* the toilet keeps the plan's own man | woman pictogram; it is too small for a pin */}
            {toilet ? (
              <>
                {img(B_TOILET_ICON, PICTO.toilet)}
                {(() => {
                  const [x, y] = P((q.r[0] + q.r[2]) / 2, q.r[3] + 20)
                  return (
                    <Txt
                      x={x}
                      y={y}
                      size={11}
                      weight={700}
                      anchor={rotate ? "end" : "middle"}
                    >
                      {q.label}
                    </Txt>
                  )
                })()}
              </>
            ) : (
              label(mid(q.r), q.kind, q.label, a(q.id))
            )}
          </g>
        )
      })}
      {/* mosque + wudhu: one open prayer area (dashed outline), no walls between them */}
      <rect
        {...R(B_MOSQUE.r[0], B_MOSQUE.r[1], B_WUDHU.r[2], B_WUDHU.r[3])}
        fill="none"
        stroke="#a1a1aa"
        strokeDasharray="6 5"
        strokeWidth={1.5}
      />
      <g {...hit(B_WUDHU.id)}>
        <rect
          {...R(...B_WUDHU.r)}
          fill={a(B_WUDHU.id) ? "#ffedd5" : B_COLOR.wudhu}
          fillOpacity={a(B_WUDHU.id) ? 1 : 0.12}
          stroke={a(B_WUDHU.id) ? C.route : "none"}
          strokeWidth={3}
        />
        {/* taps along the east wall */}
        {Array.from(
          { length: 7 },
          (_, i) =>
            B_WUDHU.r[1] + 20 + i * ((B_WUDHU.r[3] - B_WUDHU.r[1] - 40) / 6),
        ).map((y) => (
          <circle
            key={y}
            cx={P(B_WUDHU.r[2] - 8, y)[0]}
            cy={P(B_WUDHU.r[2] - 8, y)[1]}
            r={2.5}
            fill={B_COLOR.wudhu}
          />
        ))}
        {label(mid(B_WUDHU.r), "wudhu", B_WUDHU.label, a(B_WUDHU.id))}
      </g>
      <g {...hit(B_MOSQUE.id)}>
        <rect
          {...R(...B_MOSQUE.r)}
          fill={a(B_MOSQUE.id) ? "#ffedd5" : "transparent"}
          stroke={a(B_MOSQUE.id) ? C.route : "none"}
          strokeDasharray="6 5"
          strokeWidth={3}
        />
        <rect
          {...R(
            B_MOSQUE.r[0] + 10,
            (B_MOSQUE.r[1] + B_MOSQUE.r[3]) / 2 - 7,
            B_MOSQUE.r[0] + 26,
            (B_MOSQUE.r[1] + B_MOSQUE.r[3]) / 2 + 7,
          )}
          rx={1.5}
          fill="#a16207"
        />
        {rugs.map(([x, y], i) => (
          <rect
            key={i}
            {...R(x - 12, y - 7, x + 12, y + 7)}
            rx={1.5}
            fill={
              ["#7f1d1d", "#14532d", "#1e3a8a", "#9a3412", "#4c1d95"][
                Math.floor(i / 40) % 5
              ]
            }
            fillOpacity={0.8}
          />
        ))}
        {label(mid(B_MOSQUE.r), "mosque", B_MOSQUE.label, a(B_MOSQUE.id))}
      </g>
      {/* stairs up to the outdoor basement doors, with the plan's stairs pictogram */}
      {B_STAIRS.map((q) => {
        const [x1, y1, x2, y2] = q.r
        const [cx, cy, anchor] = STAIR_CAP[q.id]
        // portrait (rotated): caption just past the flight's side, along the long axis, clear of its EXIT sign
        const [tx, ty] = rotate ? P(x2 + 16, (y1 + y2) / 2) : P(cx, cy)
        return (
          <g key={q.id} {...hit(q.id)}>
            <rect
              {...R(x1, y1, x2, y2)}
              fill={C.stairs}
              fillOpacity={a(q.id) ? 0.5 : 0.18}
              stroke={a(q.id) ? C.route : C.stairs}
              strokeWidth={a(q.id) ? 3 : 1.5}
            />
            {Array.from(
              { length: 8 },
              (_, i) => y1 + ((i + 1) * (y2 - y1)) / 9,
            ).map((y) => (
              <line
                key={y}
                {...L(x1 + 3, y, x2 - 3, y)}
                stroke={C.stairs}
                strokeWidth={1}
                strokeOpacity={0.5}
              />
            ))}
            <rect
              {...R(
                q.icon[0] - 2,
                q.icon[1] - 2,
                q.icon[0] + B_STAIR_ICON + 2,
                q.icon[1] + B_STAIR_ICON + 2,
              )}
              rx={2}
              fill="#fff"
            />
            {img(
              [
                q.icon[0],
                q.icon[1],
                q.icon[0] + B_STAIR_ICON,
                q.icon[1] + B_STAIR_ICON,
              ],
              PICTO.stairs,
            )}
            <Txt
              x={tx}
              y={ty}
              size={10}
              weight={700}
              color={a(q.id) ? C.route : "#18181b"}
              anchor={rotate ? "middle" : anchor}
            >
              {q.label}
            </Txt>
          </g>
        )
      })}
      {/* EXIT pictograms where the plan has its EXIT signs */}
      {B_EXITS.map((r, i) => {
        const [x, y] = mid(r)
        return <BPin key={"x" + i} x={x} y={y} kind="exit" size={18} />
      })}
      {/* lift: out of service, does not run to the Ground Floor (not routable) */}
      <g>
        <rect
          {...R(...B_LIFT.r)}
          rx={3}
          fill={B_OFF_COLOR}
          stroke="#fff"
          strokeWidth={2}
        />
        {img(B_LIFT.icon, PICTO.lift, 0.55)}
        <line
          {...L(B_LIFT.icon[0], B_LIFT.icon[1], B_LIFT.icon[2], B_LIFT.icon[3])}
          stroke="#dc2626"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        {(() => {
          const [x, y] = P(B_LIFT.r[0] - 8, (B_LIFT.r[1] + B_LIFT.r[3]) / 2)
          return (
            <>
              <Txt
                x={x}
                y={y - 6}
                size={10}
                weight={700}
                anchor={rotate ? "middle" : "end"}
              >
                Lift
              </Txt>
              <Txt
                x={x}
                y={y + 6}
                size={8}
                weight={800}
                color="#dc2626"
                anchor={rotate ? "middle" : "end"}
              >
                {B_LIFT_STATUS.toUpperCase()}
              </Txt>
            </>
          )
        })()}
      </g>
      {nav.leg && <Route leg={nav.leg} map={(p) => P(p[0], p[1])} />}
      {nav.yah && <You p={P(nav.yah[0], nav.yah[1])} />}
    </ZoomSvg>
  )
}

export default function Plan2D({
  floor,
  dest,
  onPick,
  Icon,
  landscape,
  nav,
}: {
  floor: Floor
  dest: Dest | null
  onPick: (d: Dest | null) => void
  Icon: IconC
  landscape: boolean
  nav: FloorNav
}) {
  const pick = (id: string) => {
    const d = DESTS[floor].find((x) => x.id === id) || null
    onPick(dest?.id === id ? null : d)
  }
  return (
    <div className="absolute inset-0 pb-[9.5rem] pt-[4.25rem] sm:pb-6 sm:pl-6 sm:pr-[22rem] sm:pt-44">
      <div className="h-full w-full overflow-hidden bg-white sm:rounded-2xl sm:p-4 sm:shadow-lg sm:ring-1 sm:ring-slate-200">
        {floor === "basement" ? (
          <BasementPlan dest={dest} pick={pick} rotate={!landscape} nav={nav} />
        ) : floor === "lt4" ? (
          <Floor4Plan dest={dest} pick={pick} nav={nav} />
        ) : floor === "lobby" ? (
          <LobbyPlan dest={dest} pick={pick} nav={nav} />
        ) : floor === "ground" ? (
          <GroundPlan Icon={Icon} dest={dest} pick={pick} nav={nav} />
        ) : (
          <OutdoorPlan
            Icon={Icon}
            dest={dest}
            pick={pick}
            rotate={landscape}
            nav={nav}
          />
        )}
      </div>
    </div>
  )
}
