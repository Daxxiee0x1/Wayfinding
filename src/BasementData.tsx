import type { Pt } from "./Wayfinding"
import { P4Icon } from "./Floor4Data"
import { SIGN } from "./palette"

/*
 * Basement = Figma node 1:4 (file iS9leDnjEBZonIO8i5FBOq), 18455 x 8134 design units,
 * measured in plan px of its 2048 px wide render (1 plan px = 9.011 units).
 */
export const B_W = 2048
export const B_H = 903

export type BKind = "parking" | "stairs" | "lift" | "toilet" | "canteen" | "mosque" | "wudhu" | "security" | "storage" | "exit" | "ramp"
export const B_COLOR: Record<BKind, string> = {
  parking: SIGN.parking,
  stairs: SIGN.escape,
  lift: SIGN.lift,
  toilet: SIGN.toilet,
  canteen: SIGN.canteen,
  mosque: SIGN.mosque,
  wudhu: SIGN.wudhu,
  security: SIGN.security,
  storage: SIGN.storage,
  exit: SIGN.escape,
  ramp: SIGN.ramp,
}
/** Out-of-service facilities are drawn greyed out (as indoor-map apps do) */
export const B_OFF_COLOR = SIGN.off

/** Pictogram assets taken from the Figma plan (public/assets) */
export const PICTO = {
  lift: import.meta.env.BASE_URL + "assets/75da6.png",
  stairs: import.meta.env.BASE_URL + "assets/901f8.svg",
  toilet: import.meta.env.BASE_URL + "assets/0d5d5.svg",
}

/** Pictograms (white on a coloured tile), 24×24, same drawing style as the other floors */
export function BIcon({ kind, letter }: { kind: BKind; letter?: string }) {
  const s = {
    stroke: "white",
    strokeWidth: 1.8,
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }
  switch (kind) {
    case "stairs":
    case "lift":
      return <P4Icon kind={kind} />
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
    case "toilet":
      // man | woman, as on the plan
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full" fill="white">
          <circle cx="6.5" cy="4" r="1.9" />
          <path d="M4.3 7h4.4c.7 0 1.3.6 1.3 1.3v5.3H8.5V21H6.9v-5.4h-.8V21H4.5v-7.4H3V8.3C3 7.6 3.6 7 4.3 7z" />
          <rect x="11.4" y="3" width="1.2" height="18" rx=".6" />
          <circle cx="17.5" cy="4" r="1.9" />
          <path d="M16.2 7h2.6c.6 0 1 .3 1.2.9l1.8 6h-2.5V21h-1.6v-5h-.4v5h-1.6v-7.1h-2.5l1.8-6c.2-.6.6-.9 1.2-.9z" />
        </svg>
      )
    case "canteen":
      // fork + knife
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <path
            {...s}
            d="M7 2.5v6.5M4.5 2.5V7a2.5 2.5 0 0 0 5 0V2.5M7 9.5V21.5"
          />
          <path
            d="M16.5 2.5c-2 1.2-3 3.6-3 6.5v4h2.2v8.5h1.8V2.5z"
            fill="white"
          />
        </svg>
      )
    case "mosque":
      // dome with crescent between two minarets
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full" fill="white">
          <path d="M12 2.2a1.5 1.5 0 1 0 1.3 2.3 1.9 1.9 0 1 1-1.3-2.3z" />
          <path d="M12 6.5c-3.4 1.6-5.5 4-5.5 7h11c0-3-2.1-5.4-5.5-7z" />
          <rect x="5.5" y="14.3" width="13" height="7.2" rx=".4" />
          <path d="M11 21.5v-3.2a1 1 0 0 1 2 0v3.2z" fill="#047857" />
          <rect x="19.6" y="8" width="2.2" height="13.5" rx=".4" />
          <path d="M20.7 5.2l1.3 2.4h-2.6z" />
          <rect x="2.2" y="8" width="2.2" height="13.5" rx=".4" />
          <path d="M3.3 5.2l1.3 2.4H2z" />
        </svg>
      )
    case "security":
      // shield with a check mark
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <path
            d="M12 2.5l8 3v6c0 4.8-3.4 8.7-8 10-4.6-1.3-8-5.2-8-10v-6z"
            fill="white"
          />
          <path
            d="M8.3 12.2l2.6 2.6 4.8-5"
            stroke="#0f172a"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case "storage":
      // stacked boxes
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <rect {...s} x="3" y="12.5" width="8.5" height="8.5" rx=".6" />
          <rect {...s} x="12.5" y="12.5" width="8.5" height="8.5" rx=".6" />
          <rect {...s} x="7.8" y="3" width="8.5" height="8.5" rx=".6" />
          <path {...s} d="M6 12.5v3M15.5 12.5v3M10.8 3v3" />
        </svg>
      )
    case "exit":
      // running figure leaving through a door
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <path {...s} d="M14.5 21.5V2.5h7v19" />
          <circle cx="8.6" cy="4.2" r="1.8" fill="white" />
          <path
            {...s}
            strokeWidth={2}
            d="M8 7l-3 2.5-1.5 3M8 7l2.2 3.8 2.8.6M8 7l-.8 5.2 3 2.7-1 5.6M7.2 12.2l-2.4 3.4-3 .6"
          />
        </svg>
      )
    case "wudhu":
      // tap with falling water drops
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <path {...s} d="M3 7.5h9.5a3 3 0 0 1 3 3v1.5M8 4.5v3M5.5 4.5h5" />
          <path
            d="M15.5 14.5c-1.1 1.6-1.6 2.6-1.6 3.3a1.6 1.6 0 0 0 3.2 0c0-.7-.5-1.7-1.6-3.3zM11 17c-.8 1.2-1.2 1.9-1.2 2.4a1.2 1.2 0 0 0 2.4 0c0-.5-.4-1.2-1.2-2.4zM19.5 17c-.8 1.2-1.2 1.9-1.2 2.4a1.2 1.2 0 0 0 2.4 0c0-.5-.4-1.2-1.2-2.4z"
            fill="white"
          />
        </svg>
      )
    case "ramp":
      // car driving up an incline, arrow pointing up and out
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <path {...s} d="M2 21.5L21 13" />
          <g transform="translate(10.5 14.6) rotate(-24)" fill="white">
            <path d="M-6.5 -1.4l1.6-3c.2-.4.6-.6 1-.6h6.2c.4 0 .8.2 1 .6l1.7 3h.9c.6 0 1 .4 1 1v2.6h-14.4v-2.6c0-.6.4-1 1-1z" />
          </g>
          <path {...s} d="M15.5 3h5.5v5.5M21 3l-6 6" />
        </svg>
      )
  }
}

export type BRect = [number, number, number, number]
export type BPlace = {
  id: string
  label: string
  kind: BKind
  r: BRect
  door?: Pt
  letter?: string
}

/** Enclosed rooms (walls + door). Doors face the nearest walkway */
export const B_ROOMS: BPlace[] = [
  {
    id: "b-storage",
    label: "Gudang",
    kind: "storage",
    r: [0, 0, 242, 476],
    door: [242, 440],
  },
  {
    id: "b-security",
    label: "Pos Keamanan",
    kind: "security",
    r: [480, 179, 616, 284],
    door: [548, 284],
  },
  // tall narrow toilet with its door on the east side (as marked by the client)
  {
    id: "b-toilet",
    label: "Toilet",
    kind: "toilet",
    r: [635, 174, 685, 290],
    door: [685, 236],
  },
  {
    id: "b-canteen",
    label: "Kantin",
    kind: "canteen",
    r: [1229, 16, 1506, 149],
    door: [1368, 149],
  },
]
/** Open prayer area: only prayer rugs, no building. The imam stands at the west side (towards the qibla) */
export const B_MOSQUE: BPlace = {
  id: "b-mosque",
  label: "Masjid",
  kind: "mosque",
  r: [1872, 26, 2033, 683],
}
/** Wudhu: open ablution area, part of the mosque (no walls), taps on the east wall */
export const B_WUDHU: BPlace = {
  id: "b-wudhu",
  label: "Tempat Wudhu",
  kind: "wudhu",
  r: [1872, 712, 2033, 888],
}
/** Solid white wall (bar on the plan) in front of the mosque, between it and the parking hall */
export const B_WALL: BRect = [1814, 0, 1835, 683]
export const B_LOTS: BPlace[] = [
  {
    id: "b-cp1",
    label: "Parkir Mobil",
    kind: "parking",
    r: [406, 348, 683, 643],
    letter: "1",
  },
  {
    id: "b-cp2",
    label: "Parkir Mobil",
    kind: "parking",
    r: [815, 179, 1092, 643],
    letter: "2",
  },
  {
    id: "b-cp3",
    label: "Parkir Mobil",
    kind: "parking",
    r: [1229, 179, 1506, 643],
    letter: "3",
  },
]
/**
 * Stair flights. up = direction (in plan y) the flight climbs towards; icon = the stairs pictogram slot on the plan.
 * 1–3 lead up to the three basement doors in the outdoor area, 4 is an extra emergency stair (EXIT).
 */
export const B_STAIRS: (BPlace & { up: 1 | -1; icon: Pt })[] = [
  {
    id: "b-st1",
    label: "Tangga Basement 1",
    kind: "stairs",
    r: [1136, 0, 1175, 106],
    door: [1155, 106],
    up: -1,
    icon: [1144, 41],
  },
  {
    id: "b-st2",
    label: "Tangga Basement 2",
    kind: "stairs",
    r: [1708, 0, 1748, 98],
    door: [1728, 98],
    up: -1,
    icon: [1716, 35],
  },
  {
    id: "b-st3",
    label: "Tangga Basement 3",
    kind: "stairs",
    r: [411, 179, 449, 284],
    door: [430, 284],
    up: -1,
    icon: [418, 220],
  },
  {
    id: "b-st4",
    label: "Tangga Darurat 4",
    kind: "stairs",
    r: [1043, 797, 1082, 903],
    door: [1062, 797],
    up: 1,
    icon: [1051, 838],
  },
]
export const B_STAIR_ICON = 23.3
/** Lift shaft — out of service: it does not run up to the Ground Floor, so it is not part of any route */
export const B_LIFT: BPlace & { icon: BRect } = {
  id: "b-lift",
  label: "Lift",
  kind: "lift",
  r: [1091, 59, 1126, 106],
  door: [1108, 106],
  icon: [1093, 67, 1124.5, 98.5],
}
export const B_LIFT_STATUS = "Tidak beroperasi"
/** EXIT spots next to the emergency stairs (drawn with the EXIT pictogram) */
export const B_EXITS: BRect[] = [
  [400, 285, 460, 305],
  [1698, 118, 1758, 138],
  [1032, 776, 1092, 796],
]
/** Toilet pictogram slot on the plan */
export const B_TOILET_ICON: BRect = [646, 221, 673, 248]
/**
 * Vehicle exit: there is no barrier in the basement. Cars cross the marked line (grey bar on the plan) and drive
 * straight up the ramp to the outdoor driveway, then leave through the gate in the outdoor area.
 */
export const B_RAMP = {
  id: "b-ramp",
  label: "Ramp Keluar Kendaraan",
  x1: 0,
  x2: 243,
  line: [243, 254] as Pt,
  y1: 667,
  y2: 870,
}
/** Driving aisle in front of the car parks; lane arrows point to the exit ramp */
export const B_AISLE_Y = 768

/* ---------- walkable network ---------- */
export const B_NODES: Record<string, Pt> = {
  // main aisle
  "b-ramp": [150, 768],
  H0: [320, 768],
  Hc1: [545, 768],
  Hm: [787, 768],
  Hc2: [954, 768],
  H3: [1062, 768],
  Hm2: [1160, 768],
  Hc3: [1368, 768],
  H5: [1660, 768],
  H6: [1853, 768],
  W1: [1853, 800],
  // west corridor + row in front of the security post / toilet
  L1: [320, 440],
  U0: [320, 316],
  U1: [430, 316],
  U2: [548, 316],
  U3: [750, 316],
  U4: [787, 316],
  TL: [750, 236],
  // north corridor in front of the canteen
  T1: [787, 164],
  T2: [1160, 164],
  T3: [1368, 164],
  T4: [1660, 164],
  T5: [1728, 164],
  // corridor between the wall and the mosque
  M1: [1853, 355],
  "b-storage": [242, 440],
  "b-security": [548, 284],
  "b-toilet": [685, 236],
  "b-canteen": [1368, 149],
  "b-wudhu": [1872, 800],
  "b-mosque": [1880, 355],
  "b-cp1": [545, 653],
  "b-cp2": [954, 653],
  "b-cp3": [1368, 653],
  "b-st1": [1155, 106],
  "b-st2": [1728, 98],
  "b-st3": [430, 284],
  "b-st4": [1062, 797],
}
export const B_EDGES: [string, string][] = [
  ["b-ramp", "H0"],
  ["H0", "Hc1"],
  ["Hc1", "Hm"],
  ["Hm", "Hc2"],
  ["Hc2", "H3"],
  ["H3", "Hm2"],
  ["Hm2", "Hc3"],
  ["Hc3", "H5"],
  ["H5", "H6"],
  ["H6", "W1"],
  ["H0", "L1"],
  ["L1", "U0"],
  ["L1", "b-storage"],
  ["U0", "U1"],
  ["U1", "U2"],
  ["U2", "U3"],
  ["U3", "U4"],
  ["U4", "Hm"],
  ["U4", "T1"],
  ["T1", "T2"],
  ["T2", "T3"],
  ["T3", "T4"],
  ["T4", "T5"],
  ["T2", "Hm2"],
  ["T4", "H5"],
  ["H6", "M1"],
  ["U1", "b-st3"],
  ["U2", "b-security"],
  ["U3", "TL"],
  ["TL", "b-toilet"],
  ["T3", "b-canteen"],
  ["T2", "b-st1"],
  ["T5", "b-st2"],
  ["H3", "b-st4"],
  ["W1", "b-wudhu"],
  ["M1", "b-mosque"],
  ["Hc1", "b-cp1"],
  ["Hc2", "b-cp2"],
  ["Hc3", "b-cp3"],
]
