import { SIGN } from "./palette"

// Outdoor site plan = Figma node 13:119, measured in design px (1134 x 2048); 14.8 px = 1 world unit
export const OUT_W = 1134
export const OUT_H = 2048
export const OUT_S = 14.8
export const ox = (x: number) => (x - OUT_W / 2) / OUT_S
export const oz = (y: number) => (y - OUT_H / 2) / OUT_S
export const ln = (v: number) => v / OUT_S
export const outWorld = (x: number, y: number): [number, number] => [
  ox(x),
  oz(y),
]

export type Rect = [number, number, number, number]
/** Main driveway spanning both gates */
export const ROAD = { x1: 472, x2: 706, c: 589 }
export const GATES = [
  { id: "gate-n", x1: 472, x2: 655, y: 22 },
  { id: "gate-s", x1: 523, x2: 706, y: 1956 },
]
export const LOTS: { id: string; label: string; r: Rect; vertical?: boolean }[] = [
  { id: "pf", label: "Parkir F", r: [0, 57, 241, 270] },
  { id: "pg", label: "Parkir G", r: [849, 57, 1090, 281] },
  { id: "pe", label: "Parkir E", r: [849, 1107, 1090, 1469], vertical: true },
  { id: "pa", label: "Parkir A", r: [196, 1685, 377, 1797] },
  { id: "pb", label: "Parkir B", r: [196, 1810, 377, 1911] },
  { id: "pc", label: "Parkir C", r: [881, 1685, 1063, 1792] },
  { id: "pd", label: "Parkir D", r: [881, 1804, 1063, 1911] },
]
export const SMOKING: Rect = [849, 637, 1090, 850]
/** Doors in the building walls (east faces) that open onto stairs going down into the basement inside the building */
export const BASEMENT_DOORS: {
  id: string
  label: string
  x: number
  y1: number
  y2: number
}[] = [
  { id: "bs1", label: "Pintu Basement 1", x: 241, y1: 466, y2: 510 },
  { id: "basement", label: "Pintu Basement 2", x: 88, y1: 660, y2: 707 },
  { id: "bs2", label: "Pintu Basement 3", x: 201, y1: 1550, y2: 1594 },
]
/** How far the door + stairwell is set into the wall (design px) */
export const DOOR_DEPTH = 22
/** Ground-floor mass: wing behind the basement, entrance block with the glass facade, wing down to Parkir A */
export const BUILDING: Rect[] = [
  [0, 627, 88, 1140],
  [0, 1140, 218, 1470],
  [0, 1470, 201, 1680],
]
export const FACADE = { x: 218, y1: 1145, y2: 1469 }
/** Black walls on the plan (full building height) */
export const WALLS: Rect[] = [
  [219, 270, 241, 645],
  [83, 627, 241, 645],
  [853, 281, 875, 640],
  [849, 850, 863, 1107],
]
/** Areas beside Parkir F and G, closed in with building walls */
export const INFILL: Rect[] = [
  [0, 270, 219, 627],
  [875, 281, 1090, 637],
]
/** Thin site boundary along the east edge */
export const BOUNDARY: Rect[] = [
  [1128, 0, 1134, 572],
  [1128, 942, 1134, 2048],
]
/** Planter strips (white lines) around Parkir A/B and between C/D */
export const PLANTERS: Rect[] = [
  [196, 1680, 385, 1680],
  [381, 1680, 381, 1767],
  [381, 1842, 381, 1915],
  [196, 1803, 378, 1803],
  [196, 1915, 385, 1915],
  [881, 1798, 1063, 1798],
]
/** Covered drop-off area and Parkir E */
export const CEILINGS: Rect[] = [
  [94, 645, 849, 1470],
  [849, 1090, 1128, 1490],
]

export type OutKind = "parking" | "gate" | "smoking" | "building" | "basement" | "ramp"
export const OUT_COLOR: Record<OutKind, string> = {
  parking: SIGN.parking,
  gate: SIGN.gate,
  smoking: SIGN.smoking,
  building: SIGN.info,
  basement: SIGN.escape,
  ramp: SIGN.ramp,
}

/** Pictograms for outdoor facilities (same drawing style as the ground-floor icons) */
export function OutIcon({ kind, letter }: { kind: OutKind; letter?: string }) {
  const s = {
    stroke: "white",
    strokeWidth: 2,
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }
  switch (kind) {
    case "parking":
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <path {...s} strokeWidth={2.6} d="M7 20V4h5.5a4 4 0 0 1 0 8H7" />
          {letter && (
            <text
              x="19"
              y="21"
              fontSize="9"
              fontWeight="800"
              fill="white"
              textAnchor="middle"
              fontFamily="system-ui"
            >
              {letter}
            </text>
          )}
        </svg>
      )
    case "gate":
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <rect {...s} x="3" y="12" width="4" height="9" />
          <path {...s} d="M7 14h14" />
          <path stroke="#ef4444" strokeWidth={2} d="M10 14h3M16 14h3" />
          <path {...s} d="M2 21h20" />
        </svg>
      )
    case "smoking":
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <rect {...s} x="2" y="14" width="15" height="4" />
          <path
            {...s}
            d="M19 14v4M21 14v4M18 11c0-2 2-2 2-4M21 11c0-2 2-2 2-4"
          />
        </svg>
      )
    case "building":
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <rect {...s} x="4" y="3" width="16" height="18" />
          <path {...s} d="M8 7h2M14 7h2M8 11h2M14 11h2M10 21v-5h4v5" />
        </svg>
      )
    case "ramp":
      // car coming up the basement exit ramp
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <path {...s} d="M2 21.5L21 13" />
          <g transform="translate(10.5 14.6) rotate(-24)" fill="white">
            <path d="M-6.5 -1.4l1.6-3c.2-.4.6-.6 1-.6h6.2c.4 0 .8.2 1 .6l1.7 3h.9c.6 0 1 .4 1 1v2.6h-14.4v-2.6c0-.6.4-1 1-1z" />
          </g>
          <path {...s} d="M15.5 3h5.5v5.5M21 3l-6 6" />
        </svg>
      )
    case "basement":
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <path {...s} d="M2.5 7h4v4h4v4h4v4h7" />
          <path {...s} d="M18 2.5v8M15 7.5l3 3 3-3" />
          <text
            x="7"
            y="21.5"
            fontSize="8"
            fontWeight="800"
            fill="white"
            textAnchor="middle"
            fontFamily="system-ui"
          >
            B
          </text>
        </svg>
      )
  }
}

export const LANE_YS = Array.from({ length: 11 }, (_, i) => 130 + i * 175)
