import { placeEn } from "./prefs"
import type { Dest } from "./Wayfinding"

/**
 * Forgiving place search shared by the start screen and the map panel. It ignores case, accents, punctuation and spacing
 * ("Lab-Komputer", "labkomputer", "LÁB komputer"), tolerates small typos ("perpustkaan", "elevtor") and matches
 * Indonesian and English names and everyday synonyms ("WC", "restroom", "musholla", "food").
 */
export const norm = (s: string) =>
  s.normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

/** Synonym sets: if a place mentions any entry, every entry of the set finds it */
const SYN: string[][] = [
  [
    "toilet",
    "wc",
    "restroom",
    "rest room",
    "kamar mandi",
    "kamar kecil",
    "bathroom",
    "lavatory",
    "washroom",
    "loo",
  ],
  ["pria", "laki laki", "cowok", "men", "male", "gents"],
  ["wanita", "perempuan", "cewek", "women", "female", "ladies"],
  [
    "masjid",
    "musholla",
    "mushola",
    "musala",
    "mushalla",
    "surau",
    "mosque",
    "prayer room",
    "sholat",
    "salat",
    "shalat",
    "ibadah",
  ],
  ["wudhu", "wudu", "ablution"],
  [
    "kantin",
    "canteen",
    "food",
    "food court",
    "makan",
    "makanan",
    "restoran",
    "restaurant",
  ],
  ["kafe", "cafe", "coffee", "kopi", "ngopi", "minum"],
  ["lift", "elevator", "elevater", "lif"],
  ["lift barang", "cargo", "service lift", "freight", "goods lift"],
  ["eskalator", "escalator", "tangga berjalan"],
  [
    "tangga",
    "stairs",
    "staircase",
    "stairway",
    "darurat",
    "emergency",
    "evakuasi",
    "evacuation",
    "exit",
  ],
  ["pintu keluar", "exit", "way out"],
  ["perpustakaan", "pustaka", "library", "perpus"],
  ["lab", "laboratorium", "laboratory", "labor"],
  ["kimia", "chemistry"],
  ["komputer", "computer", "pc"],
  ["teknik", "engineering"],
  ["mahasiswa", "student", "siswa"],
  ["terpadu", "integrated"],
  ["manajemen", "management"],
  ["akademik", "academic"],
  ["bisnis", "business"],
  ["parkir", "parking", "car park", "carpark", "mobil", "car"],
  [
    "resepsionis",
    "reception",
    "front desk",
    "informasi",
    "information",
    "info",
    "lobi",
  ],
  ["bank", "atm", "teller"],
  ["kantor", "office"],
  ["gudang", "storage", "store room", "storeroom"],
  ["keamanan", "security", "satpam", "pos"],
  ["gate", "gerbang", "entrance", "pintu masuk", "masuk"],
  ["utara", "north"],
  ["selatan", "south"],
  ["smoking", "merokok", "rokok", "smoke"],
  ["ruang", "room", "meeting", "rapat"],
  ["karyawan", "staff", "pegawai", "employee"],
  ["ramp", "tanjakan"],
]

/** Optimal string alignment distance (Damerau–Levenshtein with adjacent swaps), capped for speed */
function dist(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let p2: number[] = [],
    p = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const c = [i]
    let low = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        c[j] = Math.min(c[j], p2[j - 2] + 1)
      low = Math.min(low, c[j])
    }
    if (low > max) return max + 1
    p2 = p
    p = c
  }
  return p[b.length]
}
const allowed = (len: number) => (len >= 7 ? 2 : len >= 4 ? 1 : 0)

type Entry = { words: string[]; text: string; compact: string; name: string }
const cache = new WeakMap<Dest, Entry>()
function entry(d: Dest): Entry {
  let e = cache.get(d)
  if (e) return e
  const name = norm(`${d.label} ${placeEn(d.label)}`)
  const base = ` ${name} ${norm(`${d.group} ${placeEn(d.group)}`)} `
  // expand from the place's own words only: chaining through added synonyms would let "eskalator" reach "exit"
  let text = base
  for (const set of SYN)
    if (set.some((w) => base.includes(` ${w} `))) text += set.join(" ") + " "
  e = {
    words: [...new Set(text.split(" ").filter(Boolean))],
    text,
    compact: name.replace(/ /g, ""),
    name,
  }
  cache.set(d, e)
  return e
}

/** 0 = no match; higher = better */
function scoreWord(q: string, words: string[]) {
  let best = 0
  for (const w of words) {
    if (w === q) return 4
    if (w.startsWith(q)) best = Math.max(best, 3)
    else if (q.length >= 3 && w.includes(q)) best = Math.max(best, 2)
    else {
      const k = allowed(q.length)
      // compare with the whole word and with its prefix, so half-typed words with a typo still match
      if (
        k &&
        (dist(q, w, k) <= k ||
          (w.length > q.length && dist(q, w.slice(0, q.length), k) <= k))
      )
        best = Math.max(best, 1)
      // 3-letter queries: only a single dropped letter of a 4-letter word ("lft" -> "lift", "kfe" -> "kafe")
      else if (q.length === 3 && w.length === 4 && dist(q, w, 1) <= 1)
        best = Math.max(best, 1)
    }
  }
  return best
}

export function scoreDest(d: Dest, query: string) {
  const q = norm(query)
  if (!q) return 1
  const e = entry(d)
  const qc = q.replace(/ /g, "")
  // spacing-insensitive: "labkomputer" / "lab komputer" / "lab-komputer"
  if (qc.length >= 3 && e.compact.includes(qc))
    return 10 + (e.compact.startsWith(qc) ? 2 : 0)
  let total = 0
  for (const t of q.split(" ")) {
    const s = scoreWord(t, e.words)
    if (!s) return 0
    total += s
  }
  // names beat synonym-only hits
  return total + (e.name.includes(q) ? 3 : 0)
}

/** Matching places, best first (ties keep the original order) */
export function searchDests(list: Dest[], query: string) {
  if (!norm(query)) return list
  return list
    .map((d, i) => ({ d, i, s: scoreDest(d, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.d)
}

/** Quick suggestions shown when nothing matches */
export const SUGGEST = {
  id: ["Toilet", "Lift", "Masjid", "Kantin", "Parkir"],
  en: ["Toilet", "Lift", "Mosque", "Canteen", "Parking"],
}
