import type { Pt } from "./Wayfinding"
import { SIGN } from "./palette"
/* Lantai 4 — coordinates in design px (plan is 975 × 1024, traced from the Figma floor plan) */
export const F4_W = 975
export const F4_H = 1024

export type P4Kind = "women" | "men" | "staff" | "stairs" | "lift" | "cargo" | "room" | "office"
export const P4_COLOR: Record<P4Kind, string> = {
  women: SIGN.women,
  men: SIGN.men,
  staff: SIGN.staff,
  stairs: SIGN.escape,
  lift: SIGN.lift,
  cargo: SIGN.cargo,
  room: SIGN.room,
  office: SIGN.info,
}

/** Pictograms (white on a coloured tile), 24×24 — standard signage shapes */
export function P4Icon({ kind }: { kind: P4Kind }) {
  const s = {
    stroke: "white",
    strokeWidth: 1.8,
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }
  const person = (x: number, y: number, k = 1) => (
    <g key={x} transform={`translate(${x} ${y}) scale(${k})`} fill="white">
      <circle cx="0" cy="-3.3" r="1.25" />
      <path d="M-1.6 -1.6h3.2a.6.6 0 0 1 .6.6V2h-.9v3.2h-1.1V2.4h-.4v2.8h-1.1V2h-.9V-1a.6.6 0 0 1 .6-.6z" />
    </g>
  )
  switch (kind) {
    case "women":
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full" fill="white">
          <circle cx="12" cy="4" r="2.4" />
          <path d="M10.3 7.4h3.4c.7 0 1.2.4 1.4 1l2.3 7.6h-3.2V22h-2v-6h-.4v6h-2v-6H6.6l2.3-7.6c.2-.6.7-1 1.4-1z" />
        </svg>
      )
    case "men":
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full" fill="white">
          <circle cx="12" cy="4" r="2.4" />
          <path d="M9.2 7.4h5.6c.9 0 1.6.7 1.6 1.6v6.3h-1.9V22h-2.3v-6.3h-.4V22H9.5v-6.7H7.6V9c0-.9.7-1.6 1.6-1.6z" />
        </svg>
      )
    case "stairs":
      // emergency stair: figure walking down a flight of steps
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <path
            d="M2.5 21.5h5v-3.5h4v-3.5h4V11h4V7.5h2"
            stroke="white"
            strokeWidth="1.8"
            fill="none"
            strokeLinejoin="round"
          />
          <circle cx="9" cy="3.6" r="1.7" fill="white" />
          <path
            d="M8.6 6.2l-2.2 4.2 2.8 1.8-1 3.6M8.6 6.2l2.6 2.4 2.6-.6M8.6 6.2l-.4 3.8"
            stroke="white"
            strokeWidth="1.7"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case "lift":
      // as on the Figma plan: up/down arrows above a car with three people
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <path
            {...s}
            d="M7.5 7.5V2M5.3 4.2l2.2-2.2 2.2 2.2M16.5 2v5.5M14.3 5.3l2.2 2.2 2.2-2.2"
          />
          <rect
            x="4.2"
            y="10"
            width="15.6"
            height="12"
            rx="1.2"
            stroke="white"
            strokeWidth="1.6"
            fill="none"
          />
          {person(8.2, 16.4, 0.85)}
          {person(12, 16.4, 0.85)}
          {person(15.8, 16.4, 0.85)}
        </svg>
      )
    case "cargo":
      // goods lift: car with a person and a box, up/down arrows at the side (as on the Figma plan)
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <rect
            x="3.5"
            y="2.5"
            width="17"
            height="19"
            rx="1.2"
            stroke="white"
            strokeWidth="1.6"
            fill="none"
          />
          <path
            {...s}
            strokeWidth={1.3}
            d="M17.5 4.5v3M16.4 5.6l1.1-1.1 1.1 1.1M17.5 19.5v-3M16.4 18.4l1.1 1.1 1.1-1.1"
          />
          <circle cx="9" cy="6.6" r="1.6" fill="white" />
          <path
            d="M7.1 9h3.8c.5 0 .9.4.9.9v4.6h-1.2V19H8.9v-4h-.1v4H7.1v-4.5H6.2V9.9c0-.5.4-.9.9-.9z"
            fill="white"
          />
          <rect x="12.5" y="14" width="4.5" height="5" rx=".4" fill="white" />
        </svg>
      )
    case "staff":
      // staff only: person with ID lanyard
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full" fill="white">
          <circle cx="12" cy="6" r="3.2" />
          <path d="M5 21v-2.5A5.5 5.5 0 0 1 10.5 13h3a5.5 5.5 0 0 1 5.5 5.5V21z" />
          <path
            d="M10 13.2l2 3.3 2-3.3"
            stroke={P4_COLOR.staff}
            strokeWidth="1.2"
            fill="none"
          />
          <rect
            x="10.6"
            y="16.6"
            width="2.8"
            height="2.4"
            rx=".4"
            fill={P4_COLOR.staff}
          />
        </svg>
      )
    case "office":
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <rect {...s} x="3.5" y="8" width="17" height="12" rx="1.5" />
          <path {...s} d="M9 8V5.5h6V8M3.5 13h17M11 13v2h2v-2" />
        </svg>
      )
    default:
      // classroom: whiteboard with a teacher
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <rect {...s} x="7.5" y="3" width="13.5" height="10" rx=".8" />
          <path {...s} d="M10 6.5h6M10 9.5h4" />
          <circle cx="5" cy="9.5" r="1.8" fill="white" />
          <path
            d="M3.2 12.5h3.6c.5 0 .9.4.9.9V18H6.4v4H3.6v-4H2.3v-4.6c0-.5.4-.9.9-.9z"
            fill="white"
          />
          <path {...s} d="M7 13l3.5-2.5" />
        </svg>
      )
  }
}

export type Rect = { x1: number; y1: number; x2: number; y2: number }
/** poly = outline for non-rectangular rooms (defaults to the bounding rect) */
export type Room = Rect & {
  id: string
  label: string
  kind: P4Kind
  door: Pt
  pin?: Pt
  vertical?: boolean
  poly?: Pt[]
}
const r = (
  id: string,
  label: string,
  kind: P4Kind,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  door: Pt,
  pin?: Pt,
  vertical?: boolean,
): Room => ({ id, label, kind, x1, y1, x2, y2, door, pin, vertical })

const TOP_X = [0, 120, 258, 414, 556, 695, 838, 975]
const TOP_N = [
  "R. Weekuri",
  "R. Limboto",
  "R. Lindu",
  "R. Sentarum",
  "R. Paniai",
  "R. Ayamaru",
  "R. Tondano",
]
const BOT_X = [0, 121, 262, 412, 554, 697, 838, 975]
const BOT_N = [
  "R. Toba",
  "R. Sentani",
  "Kantor Akademik",
  "R. Towuti",
  "R. Ranau",
  "R. Singkarak",
  "Kantor Bisnis",
]

/** Perimeter meeting rooms + offices (door = mid-point of the wall facing the corridor) */
export const F4_ROOMS: Room[] = [
  ...TOP_N.map((n, i) => {
    const cx = (TOP_X[i] + TOP_X[i + 1]) / 2
    return r(`f4-t${i}`, n, "room", TOP_X[i], 0, TOP_X[i + 1], 231, [cx, 231])
  }),
  ...BOT_N.map((n, i) => {
    const cx = (BOT_X[i] + BOT_X[i + 1]) / 2
    return r(
      `f4-b${i}`,
      n,
      n.startsWith("Kantor") ? "office" : "room",
      BOT_X[i],
      810,
      BOT_X[i + 1],
      1024,
      [cx, 810],
    )
  }),
  r("f4-habema", "R. Habema", "room", 0, 271, 241, 419, [241, 345]),
  r("f4-kaco", "R. Kaco", "room", 0, 419, 241, 568, [241, 494]),
  r("f4-weekuri2", "R. Weekuri 2", "room", 0, 568, 241, 725, [241, 646]),
  r("f4-kelimutu", "R. Kelimutu", "room", 733, 310, 975, 451, [733, 380]),
  r("f4-batur", "R. Batur", "room", 733, 451, 975, 614, [733, 532]),
  r("f4-poso", "R. Poso", "room", 733, 614, 975, 769, [733, 691]),
]

/** Core facilities. Doors marked by the user: T. Darurat (bottom wall), WC Wanita (top wall), R. Karyawan (bottom wall, next to the lifts) */
export const F4_CORE: Room[] = [
  r(
    "f4-st1",
    "Tangga Darurat 1",
    "stairs",
    285,
    273,
    438,
    348,
    [312, 348],
    [362, 310],
  ),
  r(
    "f4-wcw",
    "Toilet Wanita",
    "women",
    285,
    378,
    366,
    467,
    [312, 378],
    [325, 425],
  ),
  // door sits flush against the lift-core wall (opening 330–366)
  r(
    "f4-kar1",
    "R. Karyawan 1",
    "staff",
    285,
    467,
    366,
    638,
    [348, 638],
    [325, 552],
    true,
  ),
  // cargo lift: door on its top wall, opening into the small passage beside R. Karyawan
  r(
    "f4-cargo",
    "Lift Barang",
    "cargo",
    285,
    690,
    438,
    768,
    [357, 690],
    [330, 735],
  ),
  // WC Pria is L-shaped: the upper room continues down the right side and wraps under a small vestibule;
  // the entrance is at the bottom of that vestibule (next to the lift-lobby wall)
  {
    ...r(
      "f4-wcp",
      "Toilet Pria",
      "men",
      537,
      273,
      688,
      451,
      [620, 410],
      [612, 312],
    ),
    poly: [
      [537, 273],
      [688, 273],
      [688, 451],
      [604, 451],
      [604, 410],
      [637, 410],
      [637, 352],
      [537, 352],
    ],
  },
  // door flush against the solid wall block opposite the lifts (opening 604–640)
  r(
    "f4-kar2",
    "R. Karyawan 2",
    "staff",
    604,
    451,
    688,
    638,
    [622, 638],
    [646, 545],
    true,
  ),
  r(
    "f4-st2",
    "Tangga Darurat 2",
    "stairs",
    533,
    690,
    688,
    768,
    [560, 690],
    [610, 729],
  ),
]
export const F4_LIFTS = [407, 465, 522, 580, 638] // lift car centres (x 366–445)
/** Solid wall block facing the lift bank (the X on the plan) */
export const F4_VOID: Rect = { x1: 528, y1: 378, x2: 604, y2: 666 }
export const F4_LIFT_CORE: Rect = { x1: 366, y1: 378, x2: 445, y2: 666 }

/** Extra wall segments of the core (besides room rectangles) */
export const F4_WALLS: [number, number, number, number][] = [
  [285, 348, 285, 378], // closes the west end so Tangga Darurat 1 and WC Wanita form one continuous wall
  [285, 638, 285, 690], // closes the gap between R. Karyawan 1 and the cargo lift
  [688, 638, 688, 690], // closes the gap between R. Karyawan 2 and Tangga Darurat 2
]

/* ---------- walkable network ---------- */
const CX = 486 // central spine between lifts and void
const TY = 250,
  BY = 790,
  LX = 262,
  RX = 711
export const F4_NODES: Record<string, Pt> = {
  T_L: [LX, TY],
  T_C: [CX, TY],
  T_R: [RX, TY],
  B_L: [LX, BY],
  B_C: [CX, BY],
  B_R: [RX, BY],
  C_st: [CX, 363],
  C_wcp: [CX, 335],
  C_lift: [CX, 522],
  C_low: [CX, 678],
  C_cargo: [CX, 729],
  W_pass: [312, 363],
  K_turn: [348, 678],
  K2_turn: [622, 678],
  V_wcp: [620, 365],
  lift: [452, 522],
}
export const F4_EDGES: [string, string][] = [
  ["T_L", "B_L"],
  ["T_R", "B_R"],
  ["T_C", "C_wcp"],
  ["C_wcp", "C_st"],
  ["C_st", "C_lift"],
  ["C_lift", "C_low"],
  ["C_low", "C_cargo"],
  ["C_cargo", "B_C"],
  ["C_lift", "lift"],
  ["C_st", "W_pass"],
  ["C_st", "V_wcp"],
  ["C_low", "K_turn"],
  ["C_low", "K2_turn"],
]
// corridor polylines: rooms hook onto them, and their nodes are chained in order
const chain = (ids: string[], axis: 0 | 1) => {
  const s = [...ids].sort((a, b) => F4_NODES[a][axis] - F4_NODES[b][axis])
  for (let i = 1; i < s.length; i++) F4_EDGES.push([s[i - 1], s[i]])
}
const top = ["T_L", "T_C", "T_R"],
  bot = ["B_L", "B_C", "B_R"],
  left = ["T_L", "B_L"],
  right = ["T_R", "B_R"]
F4_EDGES.splice(0, 2) // left/right replaced by chained versions
for (const rm of F4_ROOMS) {
  const [dx, dy] = rm.door
  const k = "j_" + rm.id
  F4_NODES[rm.id] = rm.door
  if (dy === 231) {
    F4_NODES[k] = [dx, TY]
    top.push(k)
  } else if (dy === 810) {
    F4_NODES[k] = [dx, BY]
    bot.push(k)
  } else if (dx === 241) {
    F4_NODES[k] = [LX, dy]
    left.push(k)
  } else {
    F4_NODES[k] = [RX, dy]
    right.push(k)
  }
  F4_EDGES.push([k, rm.id])
}
chain(top, 0)
chain(bot, 0)
chain(left, 1)
chain(right, 1)
const hook: Record<string, string> = {
  "f4-st1": "W_pass",
  "f4-wcw": "W_pass",
  "f4-kar1": "K_turn",
  "f4-cargo": "K_turn",
  "f4-wcp": "V_wcp",
  "f4-kar2": "K2_turn",
  "f4-st2": "C_low",
}
for (const c of F4_CORE) {
  F4_NODES[c.id] = c.door
  F4_EDGES.push([hook[c.id], c.id])
}

export const polyOf = (q: Room): Pt[] =>
  q.poly ?? [
    [q.x1, q.y1],
    [q.x2, q.y1],
    [q.x2, q.y2],
    [q.x1, q.y2],
  ]
export function inPoly([x, y]: Pt, poly: Pt[]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i],
      [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inside = !inside
  }
  return inside
}
/** Door axis + which way is "into the room" */
export function doorInfo(q: Room) {
  const poly = polyOf(q)
  const [dx, dy] = q.door
  const horizontal = poly.some((a, i) => {
    const b = poly[(i + 1) % poly.length]
    return (
      a[1] === b[1] &&
      Math.abs(a[1] - dy) < 1 &&
      dx > Math.min(a[0], b[0]) &&
      dx < Math.max(a[0], b[0])
    )
  })
  const inward = horizontal
    ? inPoly([dx, dy + 3], poly)
      ? 1
      : -1
    : inPoly([dx + 3, dy], poly)
      ? 1
      : -1
  return { horizontal, inward }
}
