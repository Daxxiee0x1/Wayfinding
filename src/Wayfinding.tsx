import { F4_CORE, F4_EDGES, F4_NODES, F4_ROOMS, P4_COLOR } from "./Floor4Data"
import {
  B_COLOR,
  B_EDGES,
  B_LOTS,
  B_MOSQUE,
  B_NODES,
  B_RAMP,
  B_ROOMS,
  B_STAIRS,
  B_WUDHU,
} from "./BasementData"
import {
  LB_CARPARK,
  LB_COLOR,
  LB_CORE,
  LB_EDGES,
  LB_NODES,
  LB_ROOMS,
} from "./LobbyData"
import { SIGN } from "./palette"
import { placeEn, type Lang } from "./prefs"

export type Pt = [number, number]
export type Floor = "basement" | "outdoor" | "ground" | "lobby" | "lt4"
export const FLOORS: Floor[] = ["outdoor", "ground", "lobby", "lt4", "basement"]
/** Floors from top to bottom (floor switchers) and their short tags */
export const FLOOR_STACK: Floor[] = [
  "lt4",
  "lobby",
  "ground",
  "outdoor",
  "basement",
]
export const FLOOR_TAG: Record<Floor, string> = {
  lt4: "4",
  lobby: "LB",
  ground: "GF",
  outdoor: "Luar",
  basement: "B",
}
export type Dest = {
  id: string
  label: string
  group: string
  color: string
  floor: Floor
  node: string
}
/** via = node on this floor where the route changes floor (stairs, lift, ramp, door) */
export type Leg = {
  pts: Pt[]
  label: string
  final: boolean
  step: number
  next: Floor | null
  via?: string
}
export type Route = Record<Floor, Leg | null>
export type Yah = { floor: Floor; pt: Pt }

/** What one floor needs to draw wayfinding: its own YAH (if on this floor), its route leg, and pick mode */
export type FloorNav = {
  yah: Pt | null
  leg: Leg | null
  picking: boolean
  onSet: (p: Pt) => void
}

export const FLOOR_NAME: Record<Floor, string> = {
  outdoor: "Area Luar",
  ground: "Ground Floor",
  lobby: "Lobby",
  lt4: "Lantai 4",
  basement: "Basement",
}

const DOOR_NAME: Record<string, string> = {
  bs1: "Pintu Basement 1",
  basement: "Pintu Basement 2",
  bs2: "Pintu Basement 3",
}
const STAIR_DOOR: Record<string, string> = {
  "b-st1": "bs1",
  "b-st2": "basement",
  "b-st3": "bs2",
}
const STAIR_NAME = Object.fromEntries(B_STAIRS.map((q) => [q.id, q.label]))
/** Floor name in the current language */
export const floorName = (f: Floor, lang: Lang) =>
  lang === "en" ? placeEn(FLOOR_NAME[f]) : FLOOR_NAME[f]
/** Vertical order, to say "up" or "down" */
const LEVEL: Record<Floor, number> = {
  basement: -1,
  outdoor: 0,
  ground: 0,
  lobby: 1,
  lt4: 4,
}
/** What to do on a floor before continuing to the next one (a decision-point instruction: action + landmark + target) */
export function stepText(
  f: Floor,
  next: Floor,
  via: string | undefined,
  lang: Lang = "id",
) {
  const en = lang === "en",
    N = floorName(next, lang),
    v = via ?? ""
  const door = DOOR_NAME[v] ?? "Pintu Basement",
    stair = STAIR_NAME[v] ?? "tangga",
    stairDoor = DOOR_NAME[STAIR_DOOR[v]] ?? "Pintu Basement"
  const up = LEVEL[next] > LEVEL[f]
  if (f === "basement" && via === B_RAMP.id)
    return en
      ? "go up the Vehicle Exit Ramp to Outdoor (there is no gate in the basement)"
      : "naik Ramp Keluar Kendaraan ke Area Luar (tidak ada gate di basement)"
  if (f === "outdoor" && next === "ground")
    return en ? "go to the Building Lobby door" : "menuju pintu Lobby Gedung"
  if (f === "outdoor" && next === "basement")
    return en
      ? `go to ${placeEn(door)}, take the stairs down to the Basement`
      : `menuju ${door}, turun tangga ke Basement`
  if (f === "basement" && next === "outdoor")
    return en
      ? `go up ${placeEn(stair)} to ${placeEn(stairDoor)} (Outdoor)`
      : `naik ${stair} ke ${stairDoor} di Area Luar`
  if (f === "ground" && next === "outdoor")
    return en
      ? "go to the door out to Outdoor"
      : "menuju pintu keluar ke Area Luar"
  if (via === "esc" || via === "lb-esc")
    return en
      ? `take the Escalator ${up ? "up" : "down"} to ${N}`
      : `${up ? "naik" : "turun"} Eskalator ke ${N}`
  return en
    ? `take Lift G–19 ${up ? "up" : "down"} to ${N}`
    : `${up ? "naik" : "turun"} Lift G–19 ke ${N}`
}
/** Text of a leg's end pin: "Lanjut ke …" on intermediate floors, the destination on the last one */
export const legLabel = (leg: Leg, lang: Lang) =>
  leg.next
    ? lang === "en"
      ? `Continue to ${floorName(leg.next, lang)}`
      : `Lanjut ke ${FLOOR_NAME[leg.next]}`
    : lang === "en"
      ? placeEn(leg.label)
      : leg.label
/** Top of the basement exit ramp on the outdoor driveway (site plan px): south-bound lane, just before Gate Selatan */
export const OUT_RAMP: Pt = [647, 1760]
export const DEFAULT_YAH: Yah = { floor: "outdoor", pt: [300, 1305] }

/* ---------- walkable network per floor (design px) ---------- */
const NODES: Record<Floor, Record<string, Pt>> = {
  ground: {
    door: [245, 313],
    E: [270, 313],
    N1: [270, 80],
    N2: [270, 560],
    W1: [330, 300],
    Wm: [330, 520],
    W2: [330, 540],
    C1: [470, 300],
    C2: [605, 300],
    C3: [800, 300],
    C4: [1034, 300],
    C5: [1034, 336],
    rec: [470, 186],
    cargo: [605, 215],
    st2: [605, 392],
    liftA: [800, 215],
    liftB: [800, 388],
    st1: [1034, 212],
    st3: [1034, 392],
    exit: [1095, 336],
    esc0: [420, 520],
    esc: [420, 506],
    bank: [419, 540],
    cafe: [311, 540],
  },
  lobby: LB_NODES,
  lt4: F4_NODES,
  basement: B_NODES,
  outdoor: {
    // design px of the site plan (Figma 13:119, 1134 x 2048)
    Y0: [300, 1305],
    gf: [226, 1305],
    N: [300, 744],
    b1: [140, 683],
    basement: [100, 683],
    smoking: [849, 744],
    bs1: [262, 488],
    bs2: [222, 1572],
    R1: [589, 1305],
    pe: [849, 1305],
    RF: [589, 165],
    gateN: [563, 40],
    pf: [200, 165],
    pg: [890, 170],
    S: [300, 1580],
    P1: [430, 1580],
    M: [589, 1580],
    P4: [840, 1580],
    gateS: [614, 1940],
    ramp: OUT_RAMP,
    P2: [430, 1785],
    P3: [430, 1825],
    pa: [300, 1785],
    pb: [300, 1825],
    P5: [840, 1738],
    P6: [840, 1858],
    pc: [972, 1738],
    pd: [972, 1858],
  },
}
const EDGES: Record<Floor, [string, string][]> = {
  ground: [
    ["door", "E"],
    ["E", "W1"],
    ["E", "N1"],
    ["E", "N2"],
    ["N2", "W2"],
    ["W1", "C1"],
    ["C1", "C2"],
    ["C2", "C3"],
    ["C3", "C4"],
    ["C4", "C5"],
    ["C5", "exit"],
    ["C1", "rec"],
    ["C2", "cargo"],
    ["C2", "st2"],
    ["C3", "liftA"],
    ["C3", "liftB"],
    ["C4", "st1"],
    ["C4", "st3"],
    ["W1", "Wm"],
    ["Wm", "W2"],
    ["Wm", "esc0"],
    ["esc0", "esc"],
    ["W2", "bank"],
    ["W2", "cafe"],
  ],
  lobby: LB_EDGES,
  lt4: F4_EDGES,
  basement: B_EDGES,
  outdoor: [
    ["Y0", "gf"],
    ["Y0", "N"],
    ["N", "b1"],
    ["b1", "basement"],
    ["N", "smoking"],
    ["Y0", "R1"],
    ["R1", "RF"],
    ["RF", "gateN"],
    ["RF", "pf"],
    ["RF", "pg"],
    ["R1", "pe"],
    ["R1", "M"],
    ["N", "bs1"],
    ["S", "bs2"],
    ["Y0", "S"],
    ["S", "P1"],
    ["P1", "M"],
    ["M", "P4"],
    ["M", "ramp"],
    ["ramp", "gateS"],
    ["P1", "P2"],
    ["P2", "pa"],
    ["P2", "P3"],
    ["P3", "pb"],
    ["P4", "P5"],
    ["P5", "pc"],
    ["P5", "P6"],
    ["P6", "pd"],
  ],
}
/**
 * Links between floors: building entrance, Lift A (G–19), the three basement doors ↔ basement stairs, and the vehicle
 * exit ramp. The basement lift is out of service, so it does not link the basement to the Ground Floor.
 * oneway = only from the first floor to the second (the ramp is an exit: cars drive up and leave via the outdoor gate).
 */
type Portal = [Floor, string, Floor, string, number, boolean?]
const PORTALS: Portal[] = [
  ["outdoor", "gf", "ground", "door", 1],
  ["ground", "liftA", "lt4", "lift", 60],
  // the Lobby sits between the Ground Floor and Lantai 4: Lift G–19 stops there, and the escalator runs up to it
  ["ground", "liftA", "lobby", "lb-lift", 20],
  ["lobby", "lb-lift", "lt4", "lift", 45],
  ["ground", "esc", "lobby", "lb-esc", 15],
  ["basement", "b-ramp", "outdoor", "ramp", 300, true],
  ["outdoor", "bs1", "basement", "b-st1", 30],
  ["outdoor", "basement", "basement", "b-st2", 30],
  ["outdoor", "bs2", "basement", "b-st3", 30],
]
/**
 * Links a wheelchair, pram or trolley cannot use: the escalator and the basement stairs. The vehicle ramp is excluded
 * too because it is a driveway, not a footpath. With the basement lift out of service the basement therefore has no
 * step-free link, and the app says so instead of drawing a route through stairs.
 */
const NOT_STEP_FREE = (p: Portal) =>
  p[1] === "esc" || p[3].startsWith("b-st") || p[0] === "basement"

// one vocabulary of list groups on every floor
const LIFTS = "Lift & Eskalator",
  STAIRS = "Tangga & Pintu Keluar"
const LB_GROUP: Record<string, string> = {
  parking: "Parkir",
  lounge: "Fasilitas",
  library: "Fasilitas",
  office: "Kantor",
  lab: "Laboratorium",
  computer: "Laboratorium",
  men: "Toilet",
  women: "Toilet",
  cargo: LIFTS,
  lift: LIFTS,
  stairs: STAIRS,
  escalator: LIFTS,
}
const d = (
  id: string,
  label: string,
  group: string,
  color: string,
  floor: Floor,
  node: string,
): Dest => ({ id, label, group, color, floor, node })
export const ALL_DESTS: Dest[] = [
  d("gf", "Lobby Gedung", "Gedung", SIGN.info, "outdoor", "gf"),
  d("bs1", "Pintu Basement 1", "Gedung", SIGN.escape, "outdoor", "bs1"),
  d(
    "basement",
    "Pintu Basement 2",
    "Gedung",
    SIGN.escape,
    "outdoor",
    "basement",
  ),
  d("bs2", "Pintu Basement 3", "Gedung", SIGN.escape, "outdoor", "bs2"),
  d("smoking", "Area Merokok", "Fasilitas", SIGN.smoking, "outdoor", "smoking"),
  ...["A", "B", "C", "D", "E", "F", "G"].map((l) =>
    d(
      "p" + l.toLowerCase(),
      `Parkir ${l}`,
      "Parkir",
      SIGN.parking,
      "outdoor",
      "p" + l.toLowerCase(),
    ),
  ),
  d("gate-n", "Gate Utara", "Akses", SIGN.gate, "outdoor", "gateN"),
  d("gate-s", "Gate Selatan", "Akses", SIGN.gate, "outdoor", "gateS"),
  d("lift-a", "Lift G–19", LIFTS, SIGN.lift, "ground", "liftA"),
  d("lift-b", "Lift 19–33", LIFTS, SIGN.liftB, "ground", "liftB"),
  d("cargo", "Lift Barang", LIFTS, SIGN.cargo, "ground", "cargo"),
  d("esc", "Eskalator", LIFTS, SIGN.escalator, "ground", "esc"),
  d("st1", "Tangga Darurat 1", STAIRS, SIGN.escape, "ground", "st1"),
  d("st2", "Tangga Darurat 2", STAIRS, SIGN.escape, "ground", "st2"),
  d("st3", "Tangga Darurat 3", STAIRS, SIGN.escape, "ground", "st3"),
  d("exit", "Pintu Keluar", STAIRS, SIGN.escape, "ground", "exit"),
  d("reception", "Resepsionis", "Layanan", SIGN.info, "ground", "rec"),
  d("bank", "Bank Sentosa", "Layanan", SIGN.bank, "ground", "bank"),
  d("cafe", "Kaw Kaw Coffee", "Layanan", SIGN.cafe, "ground", "cafe"),
  d("f4-lift", "Lift Lantai 4", LIFTS, SIGN.lift, "lt4", "lift"),
  ...F4_CORE.map((c) =>
    d(
      c.id,
      c.label,
      c.kind === "stairs"
        ? STAIRS
        : c.kind === "cargo"
          ? LIFTS
          : c.kind === "staff"
            ? "Karyawan"
            : "Toilet",
      P4_COLOR[c.kind],
      "lt4",
      c.id,
    ),
  ),
  ...F4_ROOMS.map((r) =>
    d(
      r.id,
      r.label,
      r.kind === "office" ? "Kantor" : "Ruang Kelas",
      P4_COLOR[r.kind],
      "lt4",
      r.id,
    ),
  ),
  d("lb-lift", "Lift Lobby", LIFTS, LB_COLOR.lift, "lobby", "lb-lift"),
  ...[LB_CARPARK, ...LB_ROOMS, ...LB_CORE].map((q) =>
    d(q.id, q.label, LB_GROUP[q.kind], LB_COLOR[q.kind], "lobby", q.id),
  ),
  d(
    B_MOSQUE.id,
    B_MOSQUE.label,
    "Fasilitas",
    B_COLOR.mosque,
    "basement",
    B_MOSQUE.id,
  ),
  d(
    B_WUDHU.id,
    B_WUDHU.label,
    "Fasilitas",
    B_COLOR.wudhu,
    "basement",
    B_WUDHU.id,
  ),
  ...B_ROOMS.map((r) =>
    d(
      r.id,
      r.label,
      r.kind === "toilet" ? "Toilet" : "Fasilitas",
      B_COLOR[r.kind],
      "basement",
      r.id,
    ),
  ),
  ...B_LOTS.map((l) =>
    d(
      l.id,
      `${l.label} ${l.letter}`,
      "Parkir",
      B_COLOR.parking,
      "basement",
      l.id,
    ),
  ),
  ...B_STAIRS.map((t) =>
    d(t.id, t.label, STAIRS, B_COLOR.stairs, "basement", t.id),
  ),
  d(B_RAMP.id, B_RAMP.label, "Akses", B_COLOR.ramp, "basement", B_RAMP.id),
]
export const DESTS: Record<Floor, Dest[]> = {
  outdoor: ALL_DESTS.filter((x) => x.floor === "outdoor"),
  ground: ALL_DESTS.filter((x) => x.floor === "ground"),
  lobby: ALL_DESTS.filter((x) => x.floor === "lobby"),
  lt4: ALL_DESTS.filter((x) => x.floor === "lt4"),
  basement: ALL_DESTS.filter((x) => x.floor === "basement"),
}

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1])

/** Nearest point on the floor's network to an arbitrary position */
function snap(floor: Floor, p: Pt): { q: Pt; a: string; b: string } {
  let best = { q: p, a: "", b: "", dd: Infinity }
  for (const [a, b] of EDGES[floor]) {
    const A = NODES[floor][a],
      B = NODES[floor][b]
    const vx = B[0] - A[0],
      vy = B[1] - A[1]
    const t = Math.max(
      0,
      Math.min(
        1,
        ((p[0] - A[0]) * vx + (p[1] - A[1]) * vy) / (vx * vx + vy * vy || 1),
      ),
    )
    const q: Pt = [A[0] + vx * t, A[1] + vy * t]
    const dd = dist(p, q)
    if (dd < best.dd) best = { q, a, b, dd }
  }
  return best
}

/**
 * Shortest path from "you are here" to a destination, possibly across floors. Returns null when the network has no
 * path (with stepFree: none without stairs / escalator), so the UI can explain why instead of showing nothing.
 */
export function findRoute(
  yah: Yah,
  dest: Dest,
  opts: { stepFree?: boolean } = {},
): Route | null {
  const key = (f: Floor, n: string) => `${f}:${n}`
  const pos = new Map<string, Pt>()
  const adj = new Map<string, { to: string; w: number }[]>()
  const link = (u: string, v: string, w: number, oneway = false) => {
    if (!adj.has(u)) adj.set(u, [])
    if (!adj.has(v)) adj.set(v, [])
    adj.get(u)!.push({ to: v, w })
    if (!oneway) adj.get(v)!.push({ to: u, w })
  }
  for (const f of FLOORS) {
    for (const [n, p] of Object.entries(NODES[f])) pos.set(key(f, n), p)
    for (const [a, b] of EDGES[f])
      link(key(f, a), key(f, b), dist(NODES[f][a], NODES[f][b]))
  }
  for (const p of PORTALS) {
    if (opts.stepFree && NOT_STEP_FREE(p)) continue
    const [fa, a, fb, b, w, oneway] = p
    link(key(fa, a), key(fb, b), w, oneway)
  }
  // start node: snapped onto the nearest edge
  const s = snap(yah.floor, yah.pt)
  const start = key(yah.floor, "__start")
  pos.set(start, s.q)
  link(start, key(yah.floor, s.a), dist(s.q, NODES[yah.floor][s.a]))
  link(start, key(yah.floor, s.b), dist(s.q, NODES[yah.floor][s.b]))
  const goal = key(dest.floor, dest.node)
  // Dijkstra
  const D = new Map<string, number>([[start, 0]]),
    prev = new Map<string, string>(),
    done = new Set<string>()
  while (true) {
    let u = "",
      best = Infinity
    for (const [k, v] of D)
      if (!done.has(k) && v < best) {
        best = v
        u = k
      }
    if (!u || u === goal) break
    done.add(u)
    for (const { to, w } of adj.get(u) || []) {
      const nd = best + w
      if (nd < (D.get(to) ?? Infinity)) {
        D.set(to, nd)
        prev.set(to, u)
      }
    }
  }
  const chain: string[] = []
  for (let c: string | undefined = goal; c; c = prev.get(c)) chain.unshift(c)
  const empty = (): Route => ({
    outdoor: null,
    ground: null,
    lobby: null,
    lt4: null,
    basement: null,
  })
  if (chain[0] !== start) return null
  const route: Route = empty()
  const legs: { f: Floor; pts: Pt[]; via?: string }[] = []
  for (const k of chain) {
    const f = k.split(":")[0] as Floor
    const last = legs[legs.length - 1]
    if (!last || last.f !== f) legs.push({ f, pts: [] })
    legs[legs.length - 1].pts.push(pos.get(k)!)
    legs[legs.length - 1].via = k.slice(f.length + 1)
  }
  legs[0].pts.unshift(yah.pt)
  legs.forEach((l, i) => {
    const final = i === legs.length - 1
    const next = final ? null : legs[i + 1].f
    route[l.f] = {
      pts: l.pts,
      final,
      step: i,
      next,
      via: l.via,
      label: next ? `Lanjut ke ${FLOOR_NAME[next]}` : dest.label,
    }
  })
  return route
}
