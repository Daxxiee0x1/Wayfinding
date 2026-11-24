import type { Pt } from "./Wayfinding"
import { P4Icon } from "./Floor4Data"
import { BIcon } from "./BasementData"
import { Icon } from "./Pictos"
import { SIGN } from "./palette"

/*
 * Lobby = Figma node 13:3 (file iS9leDnjEBZonIO8i5FBOq), 10315 x 5351 design units.
 * Stored in Ground Floor plan px (1 px = 7.66 units, origin at design 893 / 532) so the Lobby stacks exactly on the
 * Ground Floor: its two lift banks, Lift Barang and both emergency stairs sit on the same spots as downstairs, and its
 * full-height dividing wall runs along the Ground Floor door wall. West of that wall is the open car-park deck, which
 * therefore lies above the outdoor side of the building entrance.
 */
// south wall brought forward to the back of the two emergency stairs
export const LB_BOUNDS = { x1: -116.5, y1: -69.5, x2: 1230, y2: 492 }
/** Full-height glass curtain wall between the car-park deck (west) and the building (east), with a glass double door in the middle */
export const LB_DIVIDER = { x1: 234.5, x2: 245, door: 300 }
/** Half width of the double-door opening in the glass wall (plan px) */
export const LB_DOOR_HALF = 24
/**
 * Glass wall in front of the Cakrawala Lobby: runs from the glass facade to Lift Barang, glass double door in the middle.
 * y = centre line, t = thickness (plan px)
 */
export const LB_LOBBY_GLASS = {
  x1: LB_DIVIDER.x2,
  x2: 582,
  y: 151,
  t: 10,
  door: (LB_DIVIDER.x2 + 582) / 2,
}
/** The single long reception desk in the open Cakrawala Lobby; its front (south side, facing the hall) carries the name */
export const LB_DESK = {
  x1: LB_LOBBY_GLASS.door - 70,
  y1: 30,
  x2: LB_LOBBY_GLASS.door + 70,
  y2: 46,
  text: "CAKRAWALA UNIVERSITY",
}
/** Glass wall east of the hall, end to end from Toilet Wanita to Tangga Darurat 2, glass double door in the middle */
export const LB_EAST_GLASS = { x: 1052, y1: 192, y2: 410, t: 10, door: 300 }
/** Library + Chemistry Lab reach down to this line; the Management Office stays set back so the Library's curved entrance shows */
const NORTH_ROW_Y = 12
const MGMT_Y2 = -14
/** Radius (plan px) of the Library's curved south-west corner, where its entrance is */
export const LB_LIB_R = NORTH_ROW_Y - MGMT_Y2
/**
 * After passing a glass wall the palette is cream / blue / white: the lobby + Management Office behind the lobby glass,
 * the corridor along the Library / labs (with Toilet Pria), and everything east of the east glass wall.
 * The hall before that (lift banks, escalator) keeps the black marble.
 */
export const lbCream = (x: number, y: number) =>
  (x <= LB_LOBBY_GLASS.x2 + 1.5 && y <= LB_LOBBY_GLASS.y + 0.5) ||
  y <= 96 ||
  x >= LB_EAST_GLASS.x - 0.5
/** Cream-marble floor of the corridors in that zone (rooms and the lobby have their own floors) */
export const LB_CREAM_FLOORS: [number, number, number, number][] = [
  [582, MGMT_Y2, 1154, 48.5],
  [LB_EAST_GLASS.x, 48.5, 1154, LB_BOUNDS.y2],
]
export const LB_LIFT_X = [653, 725, 798, 871, 944] // lift cars, 43 px wide (same shafts as the Ground Floor)
export const LB_LIFT_W = 43
export const LB_BANK_A = { x1: 628, y1: 136, x2: 1011, y2: 192 } // Lift G–19, doors facing south
export const LB_BANK_B = { x1: 628, y1: 410, x2: 1011, y2: 466 } // Lift 19–33, doors facing north
/**
 * Solid building mass: fills the strip between Toilet Pria and Lift Barang / the Lift G–19 bank, and the space above
 * that bank, so the core reads as one block from Lift Barang to the toilets. The block west of Toilet Pria faces the
 * cream corridor and takes the cream finish.
 */
export const LB_WALLS: [number, number, number, number][] = [
  [582, 95.5, 1057, 110],
  [628, 110, 1011, 136],
  // behind the Lift 19–33 bank: solid from Tangga Darurat 1 to Tangga Darurat 2, back to the south wall
  [628, 466, 1011, LB_BOUNDS.y2],
]
/**
 * Black core faces that look into the cream zone get a cream-marble cladding framed in brass (x = face line,
 * side = which way the face points), and brass posts mark where a glass wall meets the core, so the finish only
 * changes at a glass wall or a brass trim, never in the middle of a plain wall
 */
export const LB_CLADDING: { x: number; y1: number; y2: number; side: 1 | -1 }[] = [
  { x: 582, y1: 95.5, y2: LB_LOBBY_GLASS.y, side: -1 }, // west face of the Lift Barang block, towards the lobby / corridor
  { x: 1057, y1: 410, y2: LB_BOUNDS.y2, side: 1 }, // east face of Tangga Darurat 2, towards the lab corridor
]
export const LB_BRASS_POSTS: Pt[] = [
  [582, LB_LOBBY_GLASS.y],
  [1057, 192],
  [1057, 410],
  [1057, LB_BOUNDS.y2],
]
export const LB_CREAM_WALLS: [number, number, number, number][] = [
  [582, 48.5, 951, 95.5],
]
/** EXIT signs above the two emergency stairs */
export const LB_EXITS: [number, number, number, number][] = [
  [571, 386, 642, 410],
  [998.5, 386, 1069.5, 410],
]

export type LBKind = "parking" | "lounge" | "office" | "library" | "lab" | "computer" | "men" | "women" | "cargo" | "lift" | "stairs" | "escalator"
export const LB_COLOR: Record<LBKind, string> = {
  parking: SIGN.parking,
  lounge: SIGN.lounge,
  office: SIGN.info,
  library: SIGN.library,
  lab: SIGN.lab,
  computer: SIGN.computer,
  men: SIGN.men,
  women: SIGN.women,
  cargo: SIGN.cargo,
  lift: SIGN.lift,
  stairs: SIGN.escape,
  escalator: SIGN.escalator,
}

/** Pictogram assets from the Figma plan (public/assets), with their slots in plan px */
export const LB_PICTO = {
  lift: import.meta.env.BASE_URL + "assets/75da6.png",
  cargo: import.meta.env.BASE_URL + "assets/d14e0.png",
  female: import.meta.env.BASE_URL + "assets/66b2e.svg",
  male: import.meta.env.BASE_URL + "assets/c8e8c.svg",
  escalator: import.meta.env.BASE_URL + "assets/478bf.svg",
  exit: import.meta.env.BASE_URL + "assets/1a38c.png",
}
type R4 = [number, number, number, number]
const LIFT_ICON = 37
export const LB_ICON_SLOTS: { href: string; r: R4 }[] = [
  ...[656, 728.5, 801.5, 874, 946.5].map((x): { href: string; r: R4 } => ({
    href: LB_PICTO.lift,
    r: [x, 145, x + LIFT_ICON, 145 + LIFT_ICON],
  })),
  ...[656, 730, 801.5, 874, 946.5].map((x, i): { href: string; r: R4 } => {
    const y = i === 1 ? 420.5 : 419
    return { href: LB_PICTO.lift, r: [x, y, x + LIFT_ICON, y + LIFT_ICON] }
  }),
  { href: LB_PICTO.cargo, r: [585.5, 133.5, 620.5, 168.5] },
  { href: LB_PICTO.male, r: [999, 67.5, 1011, 91.8] },
  { href: LB_PICTO.female, r: [1027.5, 145, 1040.8, 171.6] },
  { href: LB_PICTO.escalator, r: [352, 426.8, 374.8, 447.3] },
  ...LB_EXITS.map((r) => ({ href: LB_PICTO.exit, r })),
]

/** Pictograms (white on a coloured tile), 24×24, same drawing style as the other floors */
export function LBIcon({ kind }: { kind: LBKind }) {
  const s = {
    stroke: "white",
    strokeWidth: 1.8,
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }
  switch (kind) {
    case "parking":
      return <BIcon kind="parking" />
    case "escalator":
      return <Icon kind="escalator" />
    case "lounge":
      // sofa
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <path
            {...s}
            d="M5 11V8.5A2.5 2.5 0 0 1 7.5 6h9A2.5 2.5 0 0 1 19 8.5V11"
          />
          <path
            d="M3.5 10.5a1.75 1.75 0 0 1 3.5 0V13h10v-2.5a1.75 1.75 0 0 1 3.5 0V17.5h-17z"
            fill="white"
          />
          <path {...s} d="M5 17.5V20M19 17.5V20" />
        </svg>
      )
    case "library":
      // books on a shelf
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <path {...s} d="M3 20.5h18" />
          <rect x="4" y="5" width="3.4" height="14" rx=".5" fill="white" />
          <rect
            x="8.4"
            y="3.5"
            width="3.4"
            height="15.5"
            rx=".5"
            fill="white"
          />
          <path d="M13.4 6.4l3.2-.9 4 13.3-3.2.9z" fill="white" />
        </svg>
      )
    case "lab":
      // laboratory flask
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <path
            {...s}
            d="M9 3h6M10.3 3v6.2L4.9 18.4A1.8 1.8 0 0 0 6.5 21h11a1.8 1.8 0 0 0 1.6-2.6L13.7 9.2V3"
          />
          <path
            d="M7.4 15h9.2l1.7 3.2c.2.4-.1.8-.5.8H6.2c-.4 0-.7-.4-.5-.8z"
            fill="white"
          />
        </svg>
      )
    case "computer":
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <rect {...s} x="3" y="4" width="18" height="12" rx="1.5" />
          <path {...s} d="M9 20h6M12 16v4" />
        </svg>
      )
    default:
      return <P4Icon kind={kind} />
  }
}

export type LBRect = { x1: number; y1: number; x2: number; y2: number }
/**
 * door = opening in a wall (on the corridor side); vertical = narrow room whose name runs along its length on the plan;
 * open = area without walls (door is then just the arrival point)
 */
/** curve = radius of a rounded south-west corner holding a curved entrance (door is then the middle of that arc) */
export type LBRoom = LBRect & {
  id: string
  label: string
  kind: LBKind
  door: Pt
  vertical?: boolean
  open?: boolean
  curve?: number
}
const r = (
  id: string,
  label: string,
  kind: LBKind,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  door: Pt,
  vertical?: boolean,
): LBRoom => ({ id, label, kind, x1, y1, x2, y2, door, vertical })

/** Open car-park deck west of the dividing wall (no walls of its own) */
export const LB_CARPARK = r(
  "lb-carpark",
  "Parkir Mobil",
  "parking",
  -71,
  13.5,
  170,
  440,
  [150, 300],
)

/** Middle of the Library's curved entrance */
const LIB_DOOR: Pt = [
  582.5 + LB_LIB_R * (1 - Math.SQRT1_2),
  NORTH_ROW_Y - LB_LIB_R * (1 - Math.SQRT1_2),
]

/** Rooms: enclosed (walls + a door), except the open lobby in front of the Management Office */
export const LB_ROOMS: LBRoom[] = [
  // open area between the Management Office and the lobby glass wall, from the glass facade to Lift Barang
  {
    ...r(
      "lb-lobby",
      "Cakrawala Lobby",
      "lounge",
      LB_DIVIDER.x2,
      MGMT_Y2,
      582,
      LB_LOBBY_GLASS.y - LB_LOBBY_GLASS.t / 2,
      [LB_LOBBY_GLASS.door, 80],
    ),
    open: true,
  },
  // one room from the glass facade to the Library, set back behind the Library's front line
  r(
    "lb-mgmt",
    "Kantor Manajemen",
    "office",
    LB_DIVIDER.x2,
    -69.5,
    582.5,
    MGMT_Y2,
    [532, MGMT_Y2],
  ),
  // Library + Chemistry Lab in one row down to NORTH_ROW_Y; the Library is entered through its curved corner
  {
    ...r(
      "lb-library",
      "Perpustakaan",
      "library",
      582.5,
      -69.5,
      1034.5,
      NORTH_ROW_Y,
      LIB_DOOR,
    ),
    curve: LB_LIB_R,
  },
  r("lb-chem", "Lab Kimia", "lab", 1034.5, -69.5, 1154, NORTH_ROW_Y, [
    1094,
    NORTH_ROW_Y,
  ]),
  r("lb-integ", "Lab Terpadu", "lab", 1154, -69.5, 1230, 49, [1154, 30], true),
  r(
    "lb-comp",
    "Lab Komputer",
    "computer",
    1154,
    49,
    1230,
    164.5,
    [1154, 107],
    true,
  ),
  r("lb-eng", "Lab Teknik", "lab", 1154, 164.5, 1230, 281.5, [1154, 223], true),
  r(
    "lb-student",
    "Lab Mahasiswa",
    "lab",
    1154,
    281.5,
    1230,
    419.5,
    [1154, 350.5],
    true,
  ),
  r(
    "lb-office",
    "Kantor",
    "office",
    1154,
    419.5,
    1230,
    LB_BOUNDS.y2,
    [1154, 456],
    true,
  ),
  // entrance on the north side, towards the Library and the labs
  r("lb-wcp", "Toilet Pria", "men", 951, 48.5, 1057, 95.5, [1004, 48.5]),
  r("lb-wcw", "Toilet Wanita", "women", 1011, 110, 1057, 192, [1034, 192]),
]

/** Cores built from the shared 3D parts (same positions as on the Ground Floor) */
export const LB_CORE: LBRoom[] = [
  r("lb-cargo", "Lift Barang", "cargo", 582, 110, 628, 192, [605, 192]),
  r("lb-st1", "Tangga Darurat 1", "stairs", 582, 410, 628, 492, [605, 410]),
  r("lb-st2", "Tangga Darurat 2", "stairs", 1011, 410, 1057, 492, [1034, 410]),
  // arrives from the Ground Floor; its top landing is at the north end
  r("lb-esc", "Eskalator", "escalator", 342, 376, 388, 488, [365, 376]),
]

/* ---------- walkable network (plan px) ---------- */
export const LB_NODES: Record<string, Pt> = {
  // main hall between the two lift banks
  deck: [LB_DIVIDER.x1 + 5, LB_DIVIDER.door],
  H0: [265, 300],
  H1: [365, 300],
  Hd: [LB_LOBBY_GLASS.door, 300],
  H2: [540, 300],
  H3: [605, 300],
  H4: [800, 300],
  H5: [1034, 300],
  // through the lobby double door (D1), across the lobby and up to the corridor along the Library
  D1: [LB_LOBBY_GLASS.door, LB_LOBBY_GLASS.y],
  L1: [LB_LOBBY_GLASS.door, 110],
  W1: [540, 110],
  // corridor in front of the Library / Chemistry Lab (y 12–48.5)
  T0: [532, 30],
  T1: [540, 30],
  T2: [808.5, 30],
  T3: [930, 30],
  T4: [1094, 30],
  T5: [1105, 30],
  // east corridor in front of the labs, reached from the hall through the east glass double door (X1)
  E1: [1105, 107],
  E2: [1105, 205],
  E3: [1105, 223],
  X1: [1105, LB_EAST_GLASS.door],
  E4: [1105, 350.5],
  E5: [1105, 392],
  E6: [1105, 456],
  M1: [1004, 30],
  R1: [1034, 205],
  R2: [1034, 392],
  C1: [605, 215],
  S1: [605, 392],
  esc0: [365, 356],
  "lb-lift": [800, 215],
}
export const LB_EDGES: [string, string][] = [
  ["deck", "H0"],
  ["H0", "H1"],
  ["H1", "Hd"],
  ["Hd", "H2"],
  ["H2", "H3"],
  ["H3", "H4"],
  ["H4", "H5"],
  ["Hd", "D1"],
  ["D1", "L1"],
  ["L1", "W1"],
  ["W1", "T1"],
  ["T0", "T1"],
  ["T1", "T2"],
  ["T2", "T3"],
  ["T3", "M1"],
  ["M1", "T4"],
  ["T4", "T5"],
  ["T5", "E1"],
  ["E1", "E2"],
  ["E2", "E3"],
  ["E3", "X1"],
  ["X1", "E4"],
  ["E4", "E5"],
  ["E5", "E6"],
  ["H5", "X1"],
  ["H5", "R1"],
  ["H5", "R2"],
  ["H3", "C1"],
  ["H3", "S1"],
  ["H1", "esc0"],
  ["H4", "lb-lift"],
]
const HOOK: Record<string, string> = {
  "lb-carpark": "deck",
  "lb-lobby": "L1",
  "lb-mgmt": "T0",
  "lb-library": "T1",
  "lb-chem": "T4",
  "lb-integ": "T5",
  "lb-comp": "E1",
  "lb-eng": "E3",
  "lb-student": "E4",
  "lb-office": "E6",
  "lb-wcp": "M1",
  "lb-wcw": "R1",
  "lb-cargo": "C1",
  "lb-st1": "S1",
  "lb-st2": "R2",
  "lb-esc": "esc0",
}
for (const q of [LB_CARPARK, ...LB_ROOMS, ...LB_CORE]) {
  LB_NODES[q.id] = q.door
  LB_EDGES.push([HOOK[q.id], q.id])
}
