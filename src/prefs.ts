import { useSyncExternalStore } from "react"
import { MOBILE } from "./quality"

/**
 * App-wide preferences shared by the DOM UI and the 3D scenes (React Three Fiber renders with its own reconciler,
 * so a tiny external store is used instead of React context).
 */
export type Lang = "id" | "en"
type Prefs = { lang: Lang; names: boolean; stepFree: boolean }

const KEY = "lg-prefs"
const load = (): Prefs => {
  // names default on for touch screens: there is no hover there to reveal what a pictogram means
  const base: Prefs = { lang: "id", names: MOBILE, stepFree: false }
  try {
    return { ...base, ...JSON.parse(localStorage.getItem(KEY) || "{}") }
  } catch {
    return base
  }
}
let prefs = load()
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function setPrefs(p: Partial<Prefs>) {
  prefs = { ...prefs, ...p }
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    /* private mode */
  }
  if (typeof document !== "undefined")
    document.documentElement.lang = prefs.lang
  listeners.forEach((l) => l())
}
if (typeof document !== "undefined") document.documentElement.lang = prefs.lang

export const usePrefs = () => useSyncExternalStore(subscribe, () => prefs)

/** Inline bilingual strings: t('Cari tujuan', 'Find a place') */
export function useT() {
  const { lang } = usePrefs()
  return (id: string, en: string) => (lang === "en" ? en : id)
}

/* ---------- place names (data stays Indonesian; English is derived) ---------- */
const EXACT: Record<string, string> = {
  "Area Luar": "Outdoor",
  "Ground Floor": "Ground Floor",
  Lobby: "Lobby",
  "Lantai 4": "Level 4",
  Basement: "Basement",
  "Lobby Gedung": "Building Lobby",
  "Area Merokok": "Smoking Area",
  "Gate Utara": "North Gate",
  "Gate Selatan": "South Gate",
  "Gate Utara · Masuk & Keluar": "North Gate · Entry & Exit",
  "Gate Selatan · Masuk & Keluar": "South Gate · Entry & Exit",
  Lift: "Lift",
  "Lift Barang": "Service Lift",
  Eskalator: "Escalator",
  "Pintu Keluar": "Exit",
  Resepsionis: "Reception",
  "Lift Lantai 4": "Level 4 Lift",
  "Lift Lobby": "Lobby Lift",
  "Toilet Pria": "Men's Toilet",
  "Toilet Wanita": "Women's Toilet",
  Toilet: "Toilet",
  Gudang: "Storage Room",
  "Pos Keamanan": "Security Post",
  Kantin: "Canteen",
  Masjid: "Mosque",
  "Tempat Wudhu": "Ablution Area",
  "Ramp Keluar Kendaraan": "Vehicle Exit Ramp",
  "Ramp Keluar": "Exit Ramp",
  "Ramp Keluar Basement": "Basement Exit Ramp",
  "Ramp Keluar Basement → Gate": "Basement Exit Ramp → Gate",
  "Kantor Manajemen": "Management Office",
  Perpustakaan: "Library",
  "Lab Kimia": "Chemistry Lab",
  "Lab Terpadu": "Integrated Lab",
  "Lab Komputer": "Computer Lab",
  "Kantor Akademik": "Academic Office",
  "Kantor Bisnis": "Business Office",
  "Parkir Mobil": "Car Park",
  "Lab Teknik": "Engineering Lab",
  "Lab Mahasiswa": "Student Lab",
  Kantor: "Office",
  "Tangga Darurat": "Emergency Stairs",
  Pintu: "Door",
  Kafe: "Café",
  "Tidak beroperasi": "Out of service",
  "TIDAK BEROPERASI": "OUT OF SERVICE",
  "Meja resepsionis": "Reception desk",
  "Dek parkir · di atas Area Luar": "Parking deck · above Outdoor",
  "Dinding kaca · Pintu ganda": "Glass wall · Double door",
  "Pintu ganda · Lobby": "Double door · Lobby",
  // list groups
  Parkir: "Parking",
  Gedung: "Building",
  Fasilitas: "Facilities",
  Akses: "Access",
  "Lift & Eskalator": "Lifts & Escalators",
  "Tangga & Pintu Keluar": "Stairs & Exits",
  Layanan: "Services",
  Karyawan: "Staff",
  "Ruang Kelas": "Classrooms",
  Laboratorium: "Laboratories",
}
const PATTERNS: [RegExp, string][] = [
  [/^Parkir Mobil (\w+)$/, "Car Park $1"],
  [/^Parkir (\w)$/, "Parking $1"],
  [/^Tangga Darurat (\d+)$/, "Emergency Stairs $1"],
  [/^Tangga Basement (\d+)$/, "Basement Stairs $1"],
  [/^Pintu Basement (\d+)$/, "Basement Door $1"],
  [/^R\. Karyawan (\d+)$/, "Staff Room $1"],
  [/^R\. (.+)$/, "$1 Room"],
  [/^Lift (A|B)(\d) · (.+)$/, "Lift $1$2 · $3"],
  [/^LIFT (.+) · Lantai (\S+) sampai (\S+)$/, "LIFT $1 · Levels $2 to $3"],
]
export function placeEn(s: string) {
  if (EXACT[s]) return EXACT[s]
  for (const [re, out] of PATTERNS) if (re.test(s)) return s.replace(re, out)
  return s
}
/** Translate a place / sign caption into the current language */
export function usePlace() {
  const { lang } = usePrefs()
  return (s: string) => (lang === "en" ? placeEn(s) : s)
}
