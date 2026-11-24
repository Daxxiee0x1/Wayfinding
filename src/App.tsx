import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import Plan2D from "./Plan2D"
import Home, { LangSwitch, type StartOpts } from "./Home"
import {
  ALL_DESTS,
  DEFAULT_YAH,
  FLOORS,
  FLOOR_STACK,
  FLOOR_TAG,
  findRoute,
  floorName,
  stepText,
  type Dest,
  type Floor,
  type FloorNav,
  type Yah,
} from "./Wayfinding"
import { COLOR, Icon, LABEL, type Kind } from "./Pictos"
import { OUT_COLOR, OutIcon, type OutKind } from "./OutdoorData"
import { P4_COLOR, P4Icon, type P4Kind } from "./Floor4Data"
import { LB_COLOR, LBIcon, type LBKind } from "./LobbyData"
import { B_COLOR, B_OFF_COLOR, BIcon, type BKind } from "./BasementData"
import { searchDests, SUGGEST } from "./search"
import { setPrefs, usePlace, usePrefs, useT } from "./prefs"
import { SIGN } from "./palette"
import type { Map3DProps, Stage } from "./Map3D"
import type { Ctx } from "./Building3D"
import type { Spin } from "./TopView"

type Mode = "3d" | "2d"

/* ---------- 3D map: lazy chunk + honest staged loading ---------- */
const loadMap3D = () => import("./Map3D")
const STAGES: Stage[] = ["module", "scene", "frame", "ready"]
const hasWebGL = () => {
  try {
    const c = document.createElement("canvas")
    return !!(c.getContext("webgl2") || c.getContext("webgl"))
  } catch {
    return false
  }
}

class MapBoundary extends Component<{
  fallback: (retry: () => void) => ReactNode
  onError: () => void
  children: ReactNode
}, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed
      ? this.props.fallback(() => this.setState({ failed: false }))
      : this.props.children
  }
}

/**
 * Full-screen loading page of the 3D map (covers the empty canvas and the map controls). The map has no downloadable
 * assets, so a byte percentage would be invented; instead the three real stages are shown: engine chunk, building the
 * procedural model, first drawn frame. Floor switches hold it back briefly so fast ones never flash it; on entry from
 * the start screen it shows at once so the empty map UI is never visible. It offers the 2D plan if the device is slow.
 */
function LoadingPage({
  stage,
  floor,
  visible,
  immediate,
  onUse2D,
}: {
  stage: Stage
  floor: Floor
  visible: boolean
  immediate: boolean
  onUse2D: () => void
}) {
  const t = useT()
  const { lang } = usePrefs()
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const h = setTimeout(() => setSlow(true), 5000)
    return () => clearTimeout(h)
  }, [])
  const steps = [
    t("Memuat mesin 3D", "Loading the 3D engine"),
    t("Membangun model lantai", "Building the floor model"),
    t("Menampilkan peta", "Drawing the map"),
  ]
  const idx = Math.min(2, STAGES.indexOf(stage))
  return (
    <div
      className={`absolute inset-0 z-[60] flex flex-col bg-brand-navy text-white transition-opacity duration-400 motion-reduce:transition-none ${
        immediate || !visible ? "" : "lg-load"
      } ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      role="status"
      aria-live="polite"
      aria-busy={visible}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(176,141,87,0.22),transparent_60%)]"
      />
      <div className="relative flex items-center gap-3 px-6 pt-8 sm:px-10">
        <div
          aria-hidden
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gold text-brand-navy"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
            <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
          </svg>
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold">Landmark Guide</p>
          <p className="text-[11px] uppercase tracking-[0.25em] text-brand-gold">
            Landmark Centre
          </p>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full max-w-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-gold">
            {t("Menyiapkan peta 3D", "Preparing the 3D map")}
          </p>
          <div className="mt-3 flex items-center gap-4">
            <span
              aria-hidden
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-base font-bold ring-1 ring-white/15"
            >
              {FLOOR_TAG[floor] === "Luar" && lang === "en" ? "Out" : FLOOR_TAG[floor]}
            </span>
            <h2 className="text-3xl font-bold sm:text-4xl">
              {floorName(floor, lang)}
            </h2>
          </div>

          <div
            role="progressbar"
            aria-label={t("Memuat peta 3D", "Loading 3D map")}
            aria-valuemin={0}
            aria-valuemax={3}
            aria-valuenow={idx}
            aria-valuetext={steps[idx]}
            className="mt-8 flex gap-1.5"
          >
            {steps.map((_, i) => (
              <span
                key={i}
                className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/15"
              >
                {i < idx && <span className="absolute inset-0 bg-brand-route" />}
                {i === idx && (
                  <span className="lg-shimmer absolute inset-0 bg-brand-route" />
                )}
              </span>
            ))}
          </div>
          <ol className="mt-5 space-y-3 text-sm">
            {steps.map((s, i) => (
              <li
                key={s}
                className={`flex items-center gap-3 ${
                  i === idx ? "font-semibold text-white" : "text-white/65"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    i < idx
                      ? "bg-emerald-600 text-white"
                      : i === idx
                        ? "bg-brand-route text-brand-navy"
                        : "bg-white/10 text-white/70"
                  }`}
                >
                  {i < idx ? (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                {s}
                {i < idx && <span className="sr-only">{t("selesai", "done")}</span>}
              </li>
            ))}
          </ol>

          {slow && (
            <div className="lg-enter mt-8 rounded-2xl bg-white/5 p-4 text-sm text-white/80 ring-1 ring-white/10">
              <p>
                {t(
                  "Perangkat ini butuh waktu lebih lama untuk menampilkan 3D.",
                  "This device is taking longer to show 3D.",
                )}
              </p>
              <button
                type="button"
                onClick={onUse2D}
                className="mt-3 min-h-11 w-full rounded-xl bg-brand-gold px-3 text-sm font-semibold text-brand-navy hover:brightness-110"
              >
                {t("Buka Denah 2D", "Open the 2D plan")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MapError({
  webgl,
  onRetry,
  onUse2D,
}: {
  webgl: boolean
  onRetry: () => void
  onUse2D: () => void
}) {
  const t = useT()
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center p-6"
      role="alert"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-xl ring-1 ring-slate-200">
        <p className="text-base font-bold text-slate-900">
          {t(
            "Peta 3D tidak dapat ditampilkan",
            "The 3D map could not be shown",
          )}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {webgl
            ? t(
                "Terjadi gangguan saat memuat peta. Periksa koneksi lalu coba lagi, atau gunakan Denah 2D.",
                "Something went wrong while loading. Check the connection and try again, or use the 2D plan.",
              )
            : t(
                "Browser atau perangkat ini tidak mendukung grafis 3D (WebGL). Denah 2D tetap menampilkan semua lokasi dan rute.",
                "This browser or device does not support 3D graphics (WebGL). The 2D plan still shows every place and route.",
              )}
        </p>
        <div className="mt-4 flex gap-2">
          {webgl && (
            <button
              type="button"
              onClick={onRetry}
              className="min-h-11 flex-1 rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-800 hover:bg-slate-200"
            >
              {t("Coba lagi", "Try again")}
            </button>
          )}
          <button
            type="button"
            onClick={onUse2D}
            className="min-h-11 flex-1 rounded-xl bg-brand-navy px-3 text-sm font-semibold text-white"
          >
            {t("Buka Denah 2D", "Open the 2D plan")}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- legend (one consistent pictogram set per floor; kept short for scanning) ---------- */
type LegendItem = { color: string; icon: ReactNode; label: string }
const L = <K extends string,>(
  color: Record<K, string>,
  IconC: (p: { kind: K; letter?: string }) => ReactNode,
  kind: K,
  label: string,
  letter?: string,
): LegendItem => ({
  color: color[kind],
  icon: <IconC kind={kind} letter={letter} />,
  label,
})
const LEGEND: Record<Floor, LegendItem[]> = {
  outdoor: [
    L<OutKind>(OUT_COLOR, OutIcon, "building", "Lobby Gedung"),
    L<OutKind>(OUT_COLOR, OutIcon, "basement", "Pintu Basement"),
    L<OutKind>(OUT_COLOR, OutIcon, "parking", "Parkir", "P"),
    L<OutKind>(OUT_COLOR, OutIcon, "gate", "Gate"),
    L<OutKind>(OUT_COLOR, OutIcon, "ramp", "Ramp Keluar Basement"),
    L<OutKind>(OUT_COLOR, OutIcon, "smoking", "Area Merokok"),
  ],
  ground: ([
    "lift",
    "escalator",
    "cargo",
    "stairs",
    "door",
    "info",
    "bank",
    "cafe",
  ] as Kind[]).map((k) => ({
    color: COLOR[k],
    icon: <Icon kind={k} />,
    label: k === "door" ? "Pintu Keluar" : k === "cafe" ? "Kafe" : LABEL[k],
  })),
  lobby: [
    L<LBKind>(LB_COLOR, LBIcon, "lift", "Lift"),
    L<LBKind>(LB_COLOR, LBIcon, "escalator", "Eskalator"),
    L<LBKind>(LB_COLOR, LBIcon, "stairs", "Tangga Darurat"),
    L<LBKind>(LB_COLOR, LBIcon, "men", "Toilet Pria"),
    L<LBKind>(LB_COLOR, LBIcon, "women", "Toilet Wanita"),
    L<LBKind>(LB_COLOR, LBIcon, "library", "Perpustakaan"),
    L<LBKind>(LB_COLOR, LBIcon, "lab", "Laboratorium"),
    L<LBKind>(LB_COLOR, LBIcon, "office", "Kantor"),
    L<LBKind>(LB_COLOR, LBIcon, "parking", "Parkir"),
  ],
  lt4: [
    L<P4Kind>(P4_COLOR, P4Icon, "lift", "Lift"),
    L<P4Kind>(P4_COLOR, P4Icon, "cargo", "Lift Barang"),
    L<P4Kind>(P4_COLOR, P4Icon, "stairs", "Tangga Darurat"),
    L<P4Kind>(P4_COLOR, P4Icon, "men", "Toilet Pria"),
    L<P4Kind>(P4_COLOR, P4Icon, "women", "Toilet Wanita"),
    L<P4Kind>(P4_COLOR, P4Icon, "staff", "Karyawan"),
    L<P4Kind>(P4_COLOR, P4Icon, "room", "Ruang Kelas"),
    L<P4Kind>(P4_COLOR, P4Icon, "office", "Kantor"),
  ],
  basement: [
    L<BKind>(B_COLOR, BIcon, "parking", "Parkir", "P"),
    L<BKind>(B_COLOR, BIcon, "stairs", "Tangga"),
    L<BKind>(B_COLOR, BIcon, "toilet", "Toilet"),
    L<BKind>(B_COLOR, BIcon, "mosque", "Masjid"),
    L<BKind>(B_COLOR, BIcon, "wudhu", "Tempat Wudhu"),
    L<BKind>(B_COLOR, BIcon, "canteen", "Kantin"),
    L<BKind>(B_COLOR, BIcon, "security", "Pos Keamanan"),
    L<BKind>(B_COLOR, BIcon, "storage", "Gudang"),
    L<BKind>(B_COLOR, BIcon, "ramp", "Ramp Keluar Kendaraan"),
  ],
}

function Switch({
  on,
  onChange,
  label,
  hint,
}: {
  on: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-left"
    >
      <span className="flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs opacity-75">{hint}</span>}
      </span>
      <span
        aria-hidden
        className={`relative h-6 w-10 shrink-0 rounded-full transition ${
          on ? "bg-emerald-700" : "bg-slate-400"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${
            on ? "left-[1.125rem]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  )
}

function Legend({
  floor,
  open,
  setOpen,
  mode,
}: {
  floor: Floor
  open: boolean
  setOpen: (b: boolean) => void
  mode: Mode
}) {
  const t = useT()
  const place = usePlace()
  const { lang, names } = usePrefs()
  return (
    <div
      className={`absolute left-3 top-[4.5rem] z-30 sm:left-6 sm:top-auto ${
        mode === "3d" ? "sm:bottom-[5.25rem]" : "sm:bottom-10 sm:left-10"
      }`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="lg-legend"
        onClick={() => setOpen(!open)}
        className="flex h-11 items-center gap-2 rounded-full bg-white/95 px-3 text-sm font-semibold text-slate-800 shadow-lg ring-1 ring-slate-200 hover:bg-white"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <rect x="4" y="4" width="6" height="6" rx="1.5" />
          <path d="M14 7h6M14 17h6" />
          <rect x="4" y="14" width="6" height="6" rx="1.5" />
        </svg>
        <span className="hidden sm:inline">{t("Keterangan", "Legend")}</span>
        <span className="sr-only sm:hidden">{t("Keterangan", "Legend")}</span>
      </button>
      {open && (
        <div
          id="lg-legend"
          role="region"
          aria-label={t(
            `Keterangan ${floorName(floor, lang)}`,
            `${floorName(floor, lang)} legend`,
          )}
          className="lg-enter absolute left-0 top-full mt-2 max-h-[60vh] w-64 overflow-y-auto rounded-2xl bg-white p-3 text-slate-800 shadow-xl ring-1 ring-slate-200 sm:bottom-full sm:top-auto sm:mb-2 sm:mt-0"
        >
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            {floorName(floor, lang)}
          </p>
          <ul className="mt-2 grid grid-cols-1 gap-1.5">
            {LEGEND[floor].map((it) => (
              <li key={it.label} className="flex items-center gap-2.5 text-sm">
                <span
                  aria-hidden
                  className="relative block h-7 w-7 shrink-0 rounded-md p-1 shadow-sm"
                  style={{ background: it.color }}
                >
                  {it.icon}
                </span>
                {place(it.label)}
              </li>
            ))}
            {floor === "basement" && (
              <li className="flex items-center gap-2.5 text-sm">
                <span
                  aria-hidden
                  className="block h-7 w-7 shrink-0 rounded-md"
                  style={{ background: B_OFF_COLOR }}
                />
                {t("Abu-abu = tidak beroperasi", "Grey = out of service")}
              </li>
            )}
          </ul>
          <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
            <li className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="flex h-7 w-7 items-center justify-center"
              >
                <span
                  className="h-1.5 w-7 rounded-full ring-2 ring-white"
                  style={{ background: SIGN.route }}
                />
              </span>
              {t("Rute Anda", "Your route")}
            </li>
            <li className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="flex h-7 w-7 items-center justify-center"
              >
                <span className="h-3.5 w-3.5 rounded-full bg-red-600 ring-4 ring-red-200" />
              </span>
              {t("Anda di sini", "You are here")}
            </li>
          </ul>
          {mode === "3d" && (
            <div className="mt-2 border-t border-slate-100 pt-1">
              <Switch
                on={names}
                onChange={(v) => setPrefs({ names: v })}
                label={t("Tampilkan nama lokasi", "Show place names")}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ---------- controls ---------- */
function ModeSwitch({
  mode,
  setMode,
}: {
  mode: Mode
  setMode: (m: Mode) => void
}) {
  const t = useT()
  return (
    <div
      role="group"
      aria-label={t("Jenis tampilan", "View type")}
      className="inline-flex shrink-0 rounded-full bg-slate-200/80 p-1 text-sm font-semibold"
    >
      {(["3d", "2d"] as Mode[]).map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={mode === m}
          onClick={() => setMode(m)}
          aria-label={
            m === "3d" ? t("Peta 3D", "3D map") : t("Denah 2D", "2D plan")
          }
          className={`min-h-10 min-w-11 rounded-full px-3 transition sm:min-h-9 ${
            mode === m
              ? "bg-brand-navy text-white shadow"
              : "text-slate-700 hover:text-slate-900"
          }`}
        >
          {m === "3d" ? "3D" : "2D"}
        </button>
      ))}
    </div>
  )
}

type RouteIssue = "none" | "stepFree" | null

function DestPanel({
  dest,
  onPick,
  yah,
  picking,
  setPicking,
  resetYah,
  route,
  issue,
  view,
  goFloor,
  openSignal,
}: {
  dest: Dest | null
  onPick: (d: Dest | null) => void
  yah: Yah
  picking: boolean
  setPicking: (b: boolean) => void
  resetYah: () => void
  route: ReturnType<typeof findRoute>
  issue: RouteIssue
  view: Floor
  goFloor: (f: Floor) => void
  openSignal: number
}) {
  const t = useT()
  const place = usePlace()
  const { lang, stepFree } = usePrefs()
  const [q, setQ] = useState("")
  const [open, setOpen] = useState(() => window.innerWidth >= 640)
  const input = useRef<HTMLInputElement>(null)
  // opening requests (e.g. from the sidebar) animate the existing panel instead of remounting it
  useEffect(() => {
    if (openSignal) {
      setOpen(true)
      setTimeout(() => input.current?.focus(), 320)
    }
  }, [openSignal])
  const isMobile = () => window.innerWidth < 640
  const pick = (d: Dest | null) => {
    onPick(d)
    if (isMobile()) setOpen(false)
  }
  // list only the floor on screen by default so other floors' places don't look like they belong here
  const [allFloors, setAllFloors] = useState(false)
  // typing searches every floor: people search by name, not by floor
  const searching = q.trim().length > 0
  const scoped =
    allFloors || searching
      ? ALL_DESTS
      : ALL_DESTS.filter((d) => d.floor === view)
  const list = searchDests(scoped, q)
  // current floor first when every floor is listed
  const listFloors =
    allFloors || searching
      ? [view, ...FLOORS.filter((f) => f !== view)]
      : [view]
  const steps = route
    ? FLOORS.filter((f) => route[f]).sort(
        (a, b) => route[a]!.step - route[b]!.step,
      )
    : []
  const destName = dest ? place(dest.label) : ""
  const basementIssue =
    dest && (dest.floor === "basement" || yah.floor === "basement")
  return (
    <aside
      aria-label={t("Cari tujuan dan rute", "Search and route")}
      className="absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.15)] sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-6 sm:max-h-[calc(100vh-3rem)] sm:w-80 sm:rounded-2xl sm:bg-white/95 sm:shadow-xl sm:backdrop-blur"
    >
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={() => setOpen(!open)}
        className="mx-auto flex h-6 w-20 shrink-0 items-center justify-center sm:hidden"
      >
        <span className="h-1.5 w-10 rounded-full bg-slate-300" />
      </button>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="lg-panel-body"
        onClick={() => setOpen(!open)}
        className="flex min-h-11 items-center justify-between px-4 pb-2 text-left sm:pt-3"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-route-ink">
            {t("Cari tujuan", "Find a place")}
          </p>
          <p className="text-sm font-bold text-slate-900">
            {dest
              ? destName
              : `${
                  allFloors
                    ? t("Semua lantai", "All floors")
                    : floorName(view, lang)
                } · ${scoped.length} ${t("lokasi", "places")}`}
          </p>
        </div>
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className={`h-5 w-5 text-slate-500 transition-transform ${
            open ? "" : "rotate-180"
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {/* collapsed: one-tap entry points */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
          open ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
        }`}
        inert={open}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex gap-2 px-4 pb-4">
            <button
              type="button"
              onClick={() => {
                setOpen(true)
                setTimeout(() => input.current?.focus(), 320)
              }}
              className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-slate-100 px-4 text-left text-sm text-slate-600"
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 shrink-0">
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  d="M20 20l-4-4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span className="truncate">
                {dest
                  ? t(`Ke ${destName}`, `To ${destName}`)
                  : t("Mau ke mana?", "Where to?")}
              </span>
            </button>
            <button
              type="button"
              aria-pressed={picking}
              onClick={() => setPicking(!picking)}
              className={`min-h-11 shrink-0 rounded-full px-4 text-xs font-semibold ${
                picking
                  ? "bg-red-700 text-white"
                  : "bg-red-50 text-red-800 ring-1 ring-red-200"
              }`}
            >
              {picking
                ? t("Tap peta…", "Tap the map…")
                : t("Posisi saya", "My position")}
            </button>
          </div>
        </div>
      </div>
      <div
        id="lg-panel-body"
        className={`grid min-h-0 transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
        inert={!open}
      >
        <div className="flex min-h-0 flex-col overflow-hidden">
          {/* you are here */}
          <div className="mx-4 mb-2 rounded-xl bg-red-50 p-2.5 ring-1 ring-red-100">
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-600 ring-2 ring-red-200"
              />
              <span className="flex-1">
                <b className="text-slate-900">
                  {t("Anda di sini", "You are here")}
                </b>{" "}
                · {floorName(yah.floor, lang)}
              </span>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                aria-pressed={picking}
                onClick={() => {
                  setPicking(!picking)
                  if (isMobile()) setOpen(false)
                }}
                className={`min-h-11 flex-1 rounded-lg px-2 text-xs font-semibold transition ${
                  picking
                    ? "bg-red-700 text-white"
                    : "bg-white text-red-800 ring-1 ring-red-200 hover:bg-red-100"
                }`}
              >
                {picking
                  ? t("Klik lokasi di peta…", "Click your spot on the map…")
                  : t("Atur posisi saya", "Set my position")}
              </button>
              <button
                type="button"
                onClick={resetYah}
                className="min-h-11 rounded-lg bg-white px-3 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              >
                {t("Reset", "Reset")}
              </button>
            </div>
          </div>
          <div className="mx-4 mb-2 rounded-xl bg-slate-50 px-1 text-slate-800 ring-1 ring-slate-200">
            <Switch
              on={stepFree}
              onChange={(v) => setPrefs({ stepFree: v })}
              label={t("Rute tanpa tangga", "Step-free route")}
              hint={t(
                "Hindari tangga dan eskalator",
                "Avoid stairs and escalators",
              )}
            />
          </div>
          {/* the route cannot be drawn: say why and what to do */}
          {dest && issue && (
            <div
              className="mx-4 mb-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-950 ring-1 ring-amber-200"
              role="alert"
            >
              <p className="text-sm font-bold">
                {issue === "stepFree"
                  ? t(
                      "Tidak tersedia rute tanpa tangga",
                      "No step-free route available",
                    )
                  : t("Rute tidak ditemukan", "No route found")}
              </p>
              <p className="mt-1">
                {issue === "stepFree"
                  ? basementIssue
                    ? t(
                        `Lift basement sedang tidak beroperasi, sehingga ${destName} hanya bisa dicapai lewat tangga. Minta bantuan petugas keamanan jika perlu.`,
                        `The basement lift is out of service, so ${destName} can only be reached by stairs. Ask security staff for help if needed.`,
                      )
                    : t(
                        `Semua jalur ke ${destName} melewati tangga atau eskalator.`,
                        `Every path to ${destName} uses stairs or an escalator.`,
                      )
                  : t(
                      `Tidak ada jalur dari posisi Anda ke ${destName}. Coba atur ulang posisi Anda di peta.`,
                      `There is no path from your position to ${destName}. Try setting your position again on the map.`,
                    )}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {issue === "stepFree" && (
                  <button
                    type="button"
                    onClick={() => setPrefs({ stepFree: false })}
                    className="min-h-11 rounded-lg bg-amber-900 px-3 font-semibold text-white"
                  >
                    {t(
                      "Tampilkan rute dengan tangga",
                      "Show route with stairs",
                    )}
                  </button>
                )}
                {issue === "none" && (
                  <button
                    type="button"
                    onClick={resetYah}
                    className="min-h-11 rounded-lg bg-amber-900 px-3 font-semibold text-white"
                  >
                    {t("Reset posisi", "Reset position")}
                  </button>
                )}
              </div>
            </div>
          )}
          {/* route steps */}
          {dest && route && steps.length > 0 && (
            <div className="mx-4 mb-2 rounded-xl bg-orange-50 p-2.5 ring-1 ring-orange-100">
              <p className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand-route-ink">
                {t("Petunjuk rute", "Directions")}
                {stepFree && (
                  <span className="rounded bg-emerald-700 px-1.5 py-0.5 text-[10px] normal-case tracking-normal text-white">
                    {t("tanpa tangga", "step-free")}
                  </span>
                )}
              </p>
              <ol className="space-y-1">
                {steps.map((f, i) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-xs text-slate-800"
                  >
                    <span
                      aria-hidden
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-route-ink text-[10px] font-bold text-white"
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1">
                      <b>{floorName(f, lang)}</b>:{" "}
                      {route[f]!.final || !route[f]!.next
                        ? t(`menuju ${destName}`, `go to ${destName}`)
                        : stepText(f, route[f]!.next!, route[f]!.via, lang)}
                    </span>
                    {view !== f && (
                      <button
                        type="button"
                        onClick={() => goFloor(f)}
                        aria-label={t(
                          `Lihat ${floorName(f, lang)}`,
                          `View ${floorName(f, lang)}`,
                        )}
                        className="min-h-11 rounded-lg bg-white px-3 text-[11px] font-semibold text-brand-route-ink ring-1 ring-orange-200"
                      >
                        {t("Lihat", "View")}
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className="flex gap-2 px-4 pb-2">
            <input
              ref={input}
              type="search"
              value={q}
              aria-label={t("Ketik nama lokasi", "Type a place name")}
              onFocus={() => setOpen(true)}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && q) {
                  e.preventDefault()
                  setQ("")
                }
              }}
              placeholder={t(
                "Ketik nama lokasi, mis. toilet…",
                "Type a place, e.g. toilet…",
              )}
              className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none placeholder:text-slate-500 focus:border-brand-route-ink focus:ring-2 focus:ring-orange-200"
            />
            {dest && (
              <button
                type="button"
                onClick={() => pick(null)}
                className="min-h-11 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                {t("Hapus rute", "Clear route")}
              </button>
            )}
          </div>
          {!searching && (
            <div className="px-4 pb-2">
              <div
                role="group"
                aria-label={t("Cakupan daftar", "List scope")}
                className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold"
              >
                {[false, true].map((all) => (
                  <button
                    key={String(all)}
                    type="button"
                    aria-pressed={allFloors === all}
                    onClick={() => setAllFloors(all)}
                    className={`min-h-10 flex-1 truncate rounded-md px-2 transition ${
                      allFloors === all
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {all
                      ? t("Semua lantai", "All floors")
                      : floorName(view, lang)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="sr-only" role="status">
            {searching
              ? t(
                  `${list.length} lokasi ditemukan`,
                  `${list.length} places found`,
                )
              : ""}
          </p>
          <div className="max-h-[48vh] overflow-y-auto px-2 pb-3 sm:max-h-[calc(100vh-24rem)]">
            {listFloors.map((f) => {
              const items = list.filter((d) => d.floor === f)
              if (!items.length) return null
              const groups = [...new Set(items.map((d) => d.group))]
              return (
                <section
                  key={f}
                  aria-label={floorName(f, lang)}
                  className="mb-2"
                >
                  <h3 className="sticky top-0 z-10 bg-white/95 px-2 py-1.5 text-xs font-bold text-slate-900">
                    {floorName(f, lang)}
                  </h3>
                  {groups.map((gname) => (
                    <div key={gname} role="group" aria-label={place(gname)}>
                      <p
                        aria-hidden
                        className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                      >
                        {place(gname)}
                      </p>
                      {items
                        .filter((d) => d.group === gname)
                        .map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            aria-pressed={dest?.id === d.id}
                            onClick={() => pick(dest?.id === d.id ? null : d)}
                            className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-left text-sm transition ${
                              dest?.id === d.id
                                ? "bg-orange-50 font-semibold text-brand-route-ink ring-1 ring-orange-200"
                                : "text-slate-800 hover:bg-slate-100"
                            }`}
                          >
                            <span
                              aria-hidden
                              className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white"
                              style={{ background: d.color }}
                            />
                            <span className="flex-1">{place(d.label)}</span>
                            {d.floor !== yah.floor && (
                              <span className="text-[11px] text-slate-500">
                                {t("beda lantai", "other floor")}
                              </span>
                            )}
                          </button>
                        ))}
                    </div>
                  ))}
                </section>
              )
            })}
            {!list.length && (
              <div className="px-2 py-3 text-sm text-slate-600">
                <p>
                  {searching
                    ? t(
                        `Tidak ada lokasi yang cocok dengan “${q.trim()}”.`,
                        `No place matches “${q.trim()}”.`,
                      )
                    : t(
                        `Belum ada lokasi di ${floorName(view, lang)}.`,
                        `No places on ${floorName(view, lang)} yet.`,
                      )}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SUGGEST[lang].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setQ(s)}
                      className="min-h-9 rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}

const MenuIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
  >
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
)

export default function App() {
  const t = useT()
  const { lang, stepFree, names } = usePrefs()
  const [home, setHome] = useState(true)
  const [drawer, setDrawer] = useState(false)
  const [legend, setLegend] = useState(false)
  const [fading, setFading] = useState(false)
  const [searchOpen, setSearchOpen] = useState(0)
  const [hover, setHover] = useState<string | null>(null)
  const [view, setView] = useState<Floor>("outdoor")
  const [mode, setMode] = useState<Mode>("3d")
  const [dest, setDest] = useState<Dest | null>(null)
  const [yah, setYah] = useState<Yah>(DEFAULT_YAH)
  const [picking, setPicking] = useState(false)
  const [viewReset, setViewReset] = useState(0)
  const [spin, setSpin] = useState<Spin>({ n: 0 })
  const turn = (s: Omit<Spin, "n">) => setSpin((p) => ({ ...s, n: p.n + 1 }))
  // the compass follows the camera without re-rendering the app
  const needle = useRef<HTMLSpanElement>(null)
  const heading = useRef(0)
  const onHeading = useCallback((a: number) => {
    heading.current = a
    if (needle.current) needle.current.style.transform = `rotate(${a}rad)`
  }, [])
  const [landscape, setLandscape] = useState(
    () => window.innerWidth >= window.innerHeight,
  )
  useEffect(() => {
    const r = () => setLandscape(window.innerWidth >= window.innerHeight)
    window.addEventListener("resize", r)
    return () => window.removeEventListener("resize", r)
  }, [])

  /* 3D map loading */
  const [webgl] = useState(hasWebGL)
  const [Map3D, setMap3D] = useState(() => lazy(loadMap3D))
  const [mapTry, setMapTry] = useState(0)
  const mapKey = `${view}-${mode}-${mapTry}`
  const [stage, setStage] = useState<Stage>("module")
  const [failedTry, setFailedTry] = useState(-1)
  // entering from the start screen: show the loading page at once (no empty map UI); later switches may skip it
  const [entering, setEntering] = useState(true)
  // a new Canvas starts over; reset during render so the overlay never shows a stale "ready"
  const [stageKey, setStageKey] = useState(mapKey)
  if (stageKey !== mapKey) {
    setStageKey(mapKey)
    setStage("module")
  }
  const liveKey = useRef(mapKey)
  liveKey.current = mapKey
  const onStage = useMemo(() => {
    const k = mapKey
    // ignore late reports from an unmounted Canvas, and never step backwards
    return (s: Stage) => {
      if (liveKey.current === k)
        setStage((p) => (STAGES.indexOf(s) > STAGES.indexOf(p) ? s : p))
    }
  }, [mapKey])
  // fetch the 3D chunk while the visitor is still on the start screen
  useEffect(() => {
    if (!webgl) return
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number
    }
    const go = () => {
      loadMap3D().catch(() => {
        /* surfaced by the error boundary when the map mounts */
      })
    }
    if (w.requestIdleCallback) w.requestIdleCallback(go, { timeout: 2500 })
    else setTimeout(go, 800)
  }, [webgl])

  const ctx: Ctx = { focus: null, hover, setHover }
  const start = (o: StartOpts) => {
    setMode(o.mode === "3d" && !webgl ? "2d" : o.mode)
    if (o.floor) setView(o.floor)
    if (o.dest !== undefined) setDest(o.dest)
    if (o.search) setSearchOpen((n) => n + 1)
    setEntering(true)
    setHome(false)
  }
  const [swap, setSwap] = useState(false)
  const transition = (fn: () => void) => {
    setSwap(true)
    setTimeout(() => {
      fn()
      requestAnimationFrame(() => setSwap(false))
    }, 220)
  }
  const changeMode = (m: Mode) => {
    if (m !== mode) transition(() => setMode(m))
  }
  const changeView = (f: Floor) => {
    if (f !== view) transition(() => setView(f))
  }
  const goHome = () => {
    setDrawer(false)
    setFading(true)
    setTimeout(() => {
      setHome(true)
      setFading(false)
    }, 300)
  }
  const outdoor = view === "outdoor"

  /* routing (step-free on request; failures are explained, never silently empty) */
  const anyRoute = useMemo(
    () => (dest ? findRoute(yah, dest) : null),
    [yah, dest],
  )
  const freeRoute = useMemo(
    () => (dest && stepFree ? findRoute(yah, dest, { stepFree: true }) : null),
    [yah, dest, stepFree],
  )
  const route = stepFree ? freeRoute : anyRoute
  const issue: RouteIssue =
    dest && !route ? (stepFree && anyRoute ? "stepFree" : "none") : null
  const nav = (f: Floor): FloorNav => ({
    yah: yah.floor === f ? yah.pt : null,
    leg: route ? route[f] : null,
    picking,
    onSet: (p) => {
      setYah({ floor: f, pt: p })
      setPicking(false)
    },
  })
  const pickId = (id: string) =>
    setDest(
      dest?.id === id ? null : (ALL_DESTS.find((d) => d.id === id) ?? null),
    )

  /* Escape closes the topmost layer: menu, then legend, then "set my position" */
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return
      if (drawer) setDrawer(false)
      else if (legend) setLegend(false)
      else if (picking) setPicking(false)
    }
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [drawer, legend, picking])
  /* menu: move focus in on open, back to the opener on close, keep Tab inside while open */
  const drawerRef = useRef<HTMLElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const openDrawer = () => {
    opener.current = (document.activeElement as HTMLElement)
    setDrawer(true)
  }
  useEffect(() => {
    if (drawer)
      setTimeout(
        () => drawerRef.current?.querySelector<HTMLElement>("button")?.focus(),
        50,
      )
    else opener.current?.focus()
  }, [drawer])
  const trap = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !drawerRef.current) return
    const f = [...drawerRef.current.querySelectorAll<HTMLElement>("button")]
    if (!f.length) return
    if (e.shiftKey && document.activeElement === f[0]) {
      e.preventDefault()
      f[f.length - 1].focus()
    } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
      e.preventDefault()
      f[0].focus()
    }
  }

  const loading =
    !home && mode === "3d" && webgl && stage !== "ready" && failedTry !== mapTry
  // keep the page mounted briefly after the first frame so it can fade out over the map
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (loading) {
      setShown(true)
      return
    }
    const h = setTimeout(() => setShown(false), 450)
    return () => clearTimeout(h)
  }, [loading])
  useEffect(() => {
    if (stage === "ready") setEntering(false)
  }, [stage])

  if (home) return <Home onStart={start} />

  const mapProps: Map3DProps = {
    view,
    nav,
    ctx,
    activeId: dest?.id,
    onPick: pickId,
    onEnter: () => changeView("ground"),
    reset: viewReset,
    spin,
    onHeading,
    onStage,
  }
  const use2D = () => changeMode("2d")
  const retry = () => {
    setMap3D(() => lazy(loadMap3D))
    setMapTry((n) => n + 1)
  }
  const floorBtn = (v: Floor, cls: string, label: ReactNode) => (
    <button
      key={v}
      type="button"
      aria-pressed={view === v}
      aria-label={floorName(v, lang)}
      onClick={() => changeView(v)}
      className={cls}
    >
      {label}
    </button>
  )

  return (
    <div
      className={`lg-fade relative h-screen w-full overflow-hidden bg-gradient-to-b transition-opacity duration-300 ${
        fading ? "opacity-0" : ""
      } ${picking ? "cursor-crosshair" : ""} ${
        mode === "2d"
          ? "from-slate-100 to-slate-200"
          : outdoor
            ? "from-sky-200 to-sky-100"
            : "from-slate-200 to-slate-400"
      }`}
    >
      <main
        aria-label={t(
          `Peta ${floorName(view, lang)}`,
          `${floorName(view, lang)} map`,
        )}
        key={`${view}-${mode}`}
        className={`lg-fade absolute inset-0 transition-opacity duration-200 motion-reduce:transition-none ${
          swap ? "!opacity-0" : ""
        }`}
      >
        {mode === "2d" ? (
          <Plan2D
            floor={view}
            dest={dest}
            onPick={setDest}
            Icon={Icon}
            landscape={landscape}
            nav={nav(view)}
          />
        ) : !webgl ? (
          <MapError webgl={false} onRetry={retry} onUse2D={use2D} />
        ) : (
          <MapBoundary
            key={mapTry}
            onError={() => setFailedTry(mapTry)}
            fallback={() => <MapError webgl onRetry={retry} onUse2D={use2D} />}
          >
            <div
              className={`absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none ${
                stage === "ready" ? "opacity-100" : "opacity-0"
              }`}
            >
              <Suspense fallback={null}>
                <Map3D key={mapKey} {...mapProps} />
              </Suspense>
            </div>
          </MapBoundary>
        )}
      </main>

      {/* desktop header */}
      <header className="absolute left-6 top-6 z-30 hidden rounded-2xl bg-white/90 px-5 py-4 shadow-lg backdrop-blur sm:block">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openDrawer}
            aria-label={t("Buka menu", "Open menu")}
            aria-expanded={drawer}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-navy text-white"
          >
            <MenuIcon />
          </button>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-gold-ink">
              Landmark Centre · {floorName(view, lang)}
            </p>
            <h1 className="text-2xl font-bold text-brand-navy">
              Landmark Guide
            </h1>
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          {mode === "2d"
            ? t(
                "Seret untuk geser · Scroll untuk zoom",
                "Drag to pan · Scroll to zoom",
              )
            : t(
                "Seret untuk memutar 360° · Scroll untuk zoom · Klik kanan untuk geser",
                "Drag to rotate 360° · Scroll to zoom · Right-click to pan",
              )}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <ModeSwitch mode={mode} setMode={changeMode} />
          <div
            role="group"
            aria-label={t("Lantai", "Floor")}
            className="inline-flex rounded-full bg-slate-200/80 p-1 text-sm font-semibold"
          >
            {FLOOR_STACK.map((v) =>
              floorBtn(
                v,
                `min-h-9 rounded-full px-3 transition ${
                  view === v
                    ? "bg-brand-navy text-white shadow"
                    : "text-slate-700 hover:text-slate-900"
                }`,
                floorName(v, lang),
              ),
            )}
          </div>
        </div>
      </header>

      {/* mobile top bar */}
      <header className="absolute inset-x-3 top-3 z-30 flex items-center gap-2 rounded-full bg-white/95 py-1 pl-1 pr-1 shadow-lg sm:hidden">
        <button
          type="button"
          onClick={openDrawer}
          aria-label={t("Buka menu", "Open menu")}
          aria-expanded={drawer}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-navy text-white"
        >
          <MenuIcon />
        </button>
        <div className="min-w-0 flex-1 leading-tight">
          <h1 className="truncate text-sm font-bold text-slate-900">
            Landmark Guide
          </h1>
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-brand-gold-ink">
            {floorName(view, lang)}
          </p>
        </div>
        <ModeSwitch mode={mode} setMode={changeMode} />
      </header>

      {/* mobile floor switcher (like indoor maps) */}
      <div
        role="group"
        aria-label={t("Lantai", "Floor")}
        className="absolute right-3 top-[4.5rem] z-30 flex flex-col overflow-hidden rounded-2xl bg-white/95 shadow-lg ring-1 ring-slate-200 sm:hidden"
      >
        {FLOOR_STACK.map((v) =>
          floorBtn(
            v,
            `h-11 w-12 text-xs font-bold transition ${
              view === v ? "bg-slate-900 text-white" : "text-slate-700"
            }`,
            <span aria-hidden>
              {FLOOR_TAG[v] === "Luar" && lang === "en" ? "Out" : FLOOR_TAG[v]}
            </span>,
          ),
        )}
      </div>

      <Legend floor={view} open={legend} setOpen={setLegend} mode={mode} />

      {/* camera controls of the 3D map: start view + turning (right-drag is hard to find and awkward on a trackpad) */}
      {mode === "3d" && webgl && (
        <div
          role="group"
          aria-label={t("Kontrol kamera", "Camera controls")}
          className="absolute right-3 top-[19rem] z-30 flex flex-col items-center gap-2 sm:bottom-6 sm:left-6 sm:right-auto sm:top-auto sm:flex-row"
        >
          <button
            type="button"
            onClick={() => setViewReset((n) => n + 1)}
            aria-label={t("Kembali ke tampilan awal", "Back to the start view")}
            title={t("Tampilan awal", "Start view")}
            className="flex h-11 w-12 items-center justify-center rounded-2xl bg-white/95 text-slate-700 shadow-lg ring-1 ring-slate-200 transition hover:text-slate-900 sm:w-auto sm:gap-2 sm:rounded-full sm:px-4 sm:text-sm sm:font-semibold"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              <circle cx="12" cy="12" r="7" />
            </svg>
            <span className="hidden sm:inline">
              {t("Tampilan awal", "Start view")}
            </span>
          </button>
          <div className="flex flex-col overflow-hidden rounded-2xl bg-white/95 text-slate-700 shadow-lg ring-1 ring-slate-200 sm:flex-row sm:rounded-full">
            <button
              type="button"
              onClick={() => turn({ by: -Math.PI / 4 })}
              aria-label={t("Putar peta ke kiri", "Rotate map left")}
              title={t("Putar ke kiri", "Rotate left")}
              className="flex h-11 w-12 items-center justify-center transition hover:bg-slate-100 hover:text-slate-900 sm:w-11"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 4v5h5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => turn({ to: 0 })}
              aria-label={t("Hadapkan utara ke atas", "Turn north up")}
              title={t("Utara ke atas", "North up")}
              className="flex h-11 w-12 items-center justify-center border-y border-slate-200 transition hover:bg-slate-100 sm:w-11 sm:border-x sm:border-y-0"
            >
              <span
                ref={needle}
                style={{ transform: `rotate(${heading.current}rad)` }}
                className="relative flex h-6 w-6 flex-col items-center"
              >
                <span
                  aria-hidden
                  className="text-[8px] font-black leading-none text-red-700"
                >
                  {t("U", "N")}
                </span>
                <svg viewBox="0 0 10 16" aria-hidden className="h-4 w-2.5">
                  <path d="M5 0 9 8H1z" fill="#dc2626" />
                  <path d="M1 8h8l-4 8z" fill="#64748b" />
                </svg>
              </span>
            </button>
            <button
              type="button"
              onClick={() => turn({ by: Math.PI / 4 })}
              aria-label={t("Putar peta ke kanan", "Rotate map right")}
              title={t("Putar ke kanan", "Rotate right")}
              className="flex h-11 w-12 items-center justify-center transition hover:bg-slate-100 hover:text-slate-900 sm:w-11"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-3-6.7" />
                <path d="M21 4v5h-5" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <DestPanel
        openSignal={searchOpen}
        dest={dest}
        onPick={setDest}
        yah={yah}
        picking={picking}
        setPicking={setPicking}
        resetYah={() => {
          setYah(DEFAULT_YAH)
          setPicking(false)
        }}
        route={route}
        issue={issue}
        view={view}
        goFloor={changeView}
      />
      {picking && (
        <div
          className="absolute left-1/2 top-[4.25rem] z-40 flex w-max max-w-[92vw] -translate-x-1/2 items-center gap-2 rounded-full bg-red-700 py-1 pl-4 pr-1 text-xs font-semibold text-white shadow-lg sm:top-6 sm:text-sm"
          role="status"
        >
          <span>
            {t(
              "Klik/tap lokasi di peta untuk menetapkan posisi Anda",
              "Click/tap the map to set your position",
            )}
          </span>
          <button
            type="button"
            onClick={() => setPicking(false)}
            className="min-h-9 rounded-full bg-white/15 px-3 hover:bg-white/25"
          >
            {t("Batal", "Cancel")}
            <span className="hidden sm:inline"> (Esc)</span>
          </button>
        </div>
      )}
      {!picking && issue && (
        <div className="pointer-events-none absolute left-1/2 top-[4.25rem] z-40 w-max max-w-[86vw] -translate-x-1/2 rounded-full bg-amber-900 px-4 py-2 text-center text-xs font-semibold text-white shadow-lg sm:top-6 sm:text-sm">
          {issue === "stepFree"
            ? t(
                "Tidak tersedia rute tanpa tangga",
                "No step-free route available",
              )
            : t("Rute tidak ditemukan", "No route found")}
        </div>
      )}

      {/* sidebar menu */}
      <div
        className={`absolute inset-0 z-50 ${
          drawer ? "" : "pointer-events-none"
        }`}
        inert={!drawer}
      >
        <div
          onClick={() => setDrawer(false)}
          className={`absolute inset-0 bg-brand-navy/50 backdrop-blur-[2px] transition-opacity duration-300 ${
            drawer ? "opacity-100" : "opacity-0"
          }`}
        />
        <nav
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label={t("Menu", "Menu")}
          onKeyDown={trap}
          className={`absolute inset-y-0 left-0 flex w-[82vw] max-w-xs flex-col bg-brand-navy text-white shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none ${
            drawer ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center gap-3 px-5 pb-4 pt-6">
            <div
              aria-hidden
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gold text-brand-navy"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
              </svg>
            </div>
            <div className="flex-1 leading-tight">
              <p className="text-sm font-bold">Landmark Guide</p>
              <p className="text-[11px] uppercase tracking-[0.25em] text-brand-gold">
                Landmark Centre
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDrawer(false)}
              aria-label={t("Tutup menu", "Close menu")}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-6">
            <p className="px-2 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/65">
              {t("Navigasi", "Navigation")}
            </p>
            <button
              type="button"
              onClick={() => {
                setDrawer(false)
                setSearchOpen((n) => n + 1)
              }}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-white/10"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="h-4 w-4 text-orange-300"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  fill="none"
                />
                <path
                  d="M20 20l-4-4"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
              {t("Cari tujuan", "Find a place")}
            </button>
            <button
              type="button"
              onClick={() => {
                setDrawer(false)
                setPicking(true)
              }}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-white/10"
            >
              <span
                aria-hidden
                className="ml-0.5 h-2.5 w-2.5 rounded-full bg-red-500"
              />{" "}
              {t("Atur posisi saya", "Set my position")}
            </button>
            {dest && (
              <button
                type="button"
                onClick={() => {
                  setDrawer(false)
                  setDest(null)
                }}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-white/10"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden
                  className="h-4 w-4 text-white/70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
                {t(
                  `Hapus rute ke ${dest.label}`,
                  `Clear route to ${dest.label}`,
                )}
              </button>
            )}
            <p className="px-2 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/65">
              {t("Tampilan", "View")}
            </p>
            {(["3d", "2d"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => {
                  changeMode(m)
                  setDrawer(false)
                }}
                className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-sm ${
                  mode === m
                    ? "bg-white/10 font-semibold text-brand-gold"
                    : "hover:bg-white/10"
                }`}
              >
                {m === "3d" ? t("Peta 3D", "3D map") : t("Denah 2D", "2D plan")}
                {mode === m && (
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full bg-brand-gold"
                  />
                )}
              </button>
            ))}
            <p className="px-2 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/65">
              {t("Lantai", "Floor")}
            </p>
            {FLOOR_STACK.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={view === f}
                onClick={() => {
                  changeView(f)
                  setDrawer(false)
                }}
                className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm ${
                  view === f
                    ? "bg-white/10 font-semibold text-brand-gold"
                    : "hover:bg-white/10"
                }`}
              >
                <span
                  aria-hidden
                  className="flex h-7 w-9 items-center justify-center rounded-lg bg-white text-[11px] font-bold text-brand-navy"
                >
                  {FLOOR_TAG[f]}
                </span>
                {floorName(f, lang)}
              </button>
            ))}
            <p className="px-2 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/65">
              {t("Pengaturan", "Settings")}
            </p>
            <div className="flex min-h-11 items-center justify-between px-3 text-sm">
              {t("Bahasa", "Language")}
              <LangSwitch dark />
            </div>
            <div className="px-1">
              <Switch
                on={stepFree}
                onChange={(v) => setPrefs({ stepFree: v })}
                label={t("Rute tanpa tangga", "Step-free route")}
                hint={t(
                  "Untuk kursi roda, stroller, troli",
                  "For wheelchairs, prams, trolleys",
                )}
              />
            </div>
            <div className="px-1">
              <Switch
                on={names}
                onChange={(v) => setPrefs({ names: v })}
                label={t("Tampilkan nama lokasi", "Show place names")}
                hint={t(
                  "Nama selalu tampil di peta 3D",
                  "Always show names on the 3D map",
                )}
              />
            </div>
          </div>
          <div className="border-t border-white/10 p-3">
            <button
              type="button"
              onClick={goHome}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-gold px-3 text-sm font-semibold text-brand-navy hover:brightness-110"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 6l-6 6 6 6" />
              </svg>
              {t("Kembali ke menu utama", "Back to start")}
            </button>
          </div>
        </nav>
      </div>
      {(loading || shown) && (
        <LoadingPage
          key={mapKey}
          stage={stage}
          floor={view}
          visible={loading}
          immediate={entering}
          onUse2D={use2D}
        />
      )}
    </div>
  )
}
