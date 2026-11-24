import { useId, useState } from "react"
import {
  ALL_DESTS,
  FLOORS,
  FLOOR_TAG,
  floorName,
  type Dest,
  type Floor,
} from "./Wayfinding"
import { searchDests, SUGGEST } from "./search"
import { setPrefs, usePlace, usePrefs, useT } from "./prefs"

export type StartOpts = {
  mode: "3d" | "2d"
  floor?: Floor
  dest?: Dest | null
  search?: boolean
}

const HERO =
  "https://images.unsplash.com/photo-1771076392336-dcfa8ffe8504?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600"
const QUICK = ["b-toilet", "lift-a", "b-mosque", "b-canteen", "bank", "cafe"]
  .map((id) => ALL_DESTS.find((d) => d.id === id)!)
  .filter(Boolean)

function Glyph({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  )
}

/** ID / EN switch (shared with the map's menu) */
export function LangSwitch({ dark }: { dark?: boolean }) {
  const { lang } = usePrefs()
  return (
    <div
      role="group"
      aria-label="Bahasa / Language"
      className={`inline-flex rounded-full p-1 text-xs font-bold ${
        dark ? "bg-white/10 ring-1 ring-white/15" : "bg-slate-200/80"
      }`}
    >
      {(["id", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => setPrefs({ lang: l })}
          lang={l}
          className={`min-h-9 min-w-11 rounded-full px-3 transition ${
            lang === l
              ? dark
                ? "bg-brand-gold text-brand-navy"
                : "bg-brand-navy text-white"
              : dark
                ? "text-white/75 hover:text-white"
                : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

export default function Home({
  onStart: start,
}: {
  onStart: (o: StartOpts) => void
}) {
  const t = useT()
  const place = usePlace()
  const { lang } = usePrefs()
  const [leaving, setLeaving] = useState(false)
  const [q, setQ] = useState("")
  const [focused, setFocused] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()
  // play an exit animation before handing over to the map
  const onStart = (o: StartOpts) => {
    setLeaving(true)
    setTimeout(() => start(o), 280)
  }
  const results = q.trim() ? searchDests(ALL_DESTS, q) : []
  const showResults = focused && q.trim().length > 0
  // keyboard order = visual order (grouped by floor)
  const ordered = FLOORS.flatMap((f) => results.filter((d) => d.floor === f))
  const choose = (d: Dest) => onStart({ mode: "3d", floor: d.floor, dest: d })
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((i) => Math.min(ordered.length - 1, i + 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === "Enter" && ordered[active]) {
      e.preventDefault()
      choose(ordered[active])
    } else if (e.key === "Escape") {
      if (q) {
        e.preventDefault()
        setQ("")
      } else (e.target as HTMLInputElement).blur()
    }
  }
  const views: {
    mode: StartOpts["mode"]
    title: string
    sub: string
    icon: string
  }[] = [
    {
      mode: "3d",
      title: t("Peta 3D", "3D map"),
      sub: t("Jelajahi gedung dalam 3 dimensi", "Explore the building in 3D"),
      icon: "M12 2l9 5v10l-9 5-9-5V7zM12 12l9-5M12 12v10M12 12L3 7",
    },
    {
      mode: "2d",
      title: t("Denah 2D", "2D plan"),
      sub: t(
        "Denah datar, cepat dan mudah dibaca",
        "Flat plan, fast and easy to read",
      ),
      icon: "M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15",
    },
  ]
  const floors: { f: Floor; sub: string }[] = [
    {
      f: "outdoor",
      sub: t(
        "Gate · Parkir A–G · Area Merokok · Pintu Basement",
        "Gates · Parking A–G · Smoking Area · Basement Doors",
      ),
    },
    {
      f: "ground",
      sub: t(
        "Lobby · Lift · Resepsionis · Bank · Kafe",
        "Lobby · Lifts · Reception · Bank · Café",
      ),
    },
    {
      f: "lobby",
      sub: t(
        "Cakrawala Lobby · Parkir · Perpustakaan · Lab · Kantor",
        "Cakrawala Lobby · Car Park · Library · Labs · Offices",
      ),
    },
    {
      f: "lt4",
      sub: t(
        "Ruang Kelas · Kantor · R. Karyawan · Toilet",
        "Classrooms · Offices · Staff Room · Toilets",
      ),
    },
    {
      f: "basement",
      sub: t(
        "Parkir · Masjid · Kantin · Pos Keamanan · Toilet",
        "Car Park · Mosque · Canteen · Security Post · Toilet",
      ),
    },
  ]
  return (
    <div
      className={`relative h-[100dvh] w-full overflow-y-auto overflow-x-hidden bg-brand-navy [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-white transition-all duration-300 ${
        leaving ? "scale-[0.98] opacity-0" : "lg-fade"
      }`}
    >
      {/* hero */}
      <div className="absolute inset-x-0 top-0 h-[62vh] sm:h-[70vh]">
        <img
          src={HERO}
          alt={t(
            "Fasad gedung Landmark Centre di malam hari",
            "The Landmark Centre building at night",
          )}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-navy/40 via-brand-navy/70 to-brand-navy" />
      </div>

      <main className="lg-enter relative mx-auto flex min-h-[100dvh] max-w-5xl flex-col px-5 pb-10 pt-8 sm:px-8 sm:pt-12">
        <header className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gold text-brand-navy">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              aria-hidden
              fill="currentColor"
            >
              <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
            </svg>
          </div>
          <div className="flex-1 leading-tight">
            <p className="text-sm font-bold tracking-wide">Landmark Guide</p>
            <p className="text-[11px] uppercase tracking-[0.25em] text-brand-gold">
              Landmark Centre
            </p>
          </div>
          <LangSwitch dark />
        </header>

        <div className="mt-[16vh] sm:mt-[20vh]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-gold">
            {t("Selamat datang", "Welcome")}
          </p>
          <h1 className="mt-2 max-w-xl text-4xl font-bold leading-[1.05] sm:text-6xl">
            {t(
              "Temukan arah Anda di Landmark Centre",
              "Find your way around Landmark Centre",
            )}
          </h1>
          <p className="mt-3 max-w-md text-sm text-white/75 sm:text-base">
            {t(
              "Cari lokasi, atur posisi Anda, dan ikuti rute dari area parkir sampai ke lift dan layanan di dalam gedung.",
              "Search for a place, set where you are, and follow the route from the car park to the lifts and services inside.",
            )}
          </p>

          {/* primary search: results appear here, the map opens only after picking a place */}
          <div className="relative mt-6 w-full max-w-xl">
            <div className="flex items-center gap-2 rounded-2xl bg-white py-2 pl-5 pr-2 text-slate-500 shadow-2xl ring-4 ring-white/10 focus-within:ring-brand-gold/60">
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="h-5 w-5 shrink-0 text-brand-route-ink"
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
              <input
                value={q}
                role="combobox"
                aria-label={t("Cari tujuan", "Search for a destination")}
                aria-expanded={showResults}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={
                  showResults && ordered[active]
                    ? `${listId}-${ordered[active].id}`
                    : undefined
                }
                onChange={(e) => {
                  setQ(e.target.value)
                  setActive(0)
                }}
                onKeyDown={onKey}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={t(
                  "Mau ke mana? Contoh: toilet, masjid, lift",
                  "Where to? e.g. toilet, mosque, lift",
                )}
                className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-500"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  aria-label={t("Hapus pencarian", "Clear search")}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                >
                  <Glyph d="M6 6l12 12M18 6L6 18" />
                </button>
              )}
            </div>
            {showResults && (
              <div className="lg-enter absolute inset-x-0 top-full z-20 mt-2 max-h-[50vh] overflow-y-auto rounded-2xl bg-white p-2 text-slate-800 shadow-2xl">
                <div
                  id={listId}
                  role="listbox"
                  aria-label={t("Hasil pencarian", "Search results")}
                >
                  {FLOORS.map((f) => {
                    const items = results.filter((d) => d.floor === f)
                    if (!items.length) return null
                    return (
                      <div
                        key={f}
                        role="group"
                        aria-label={floorName(f, lang)}
                        className="mb-1"
                      >
                        <p
                          aria-hidden
                          className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                        >
                          {floorName(f, lang)}
                        </p>
                        {items.map((d) => {
                          const on = ordered[active]?.id === d.id
                          return (
                            // mousedown keeps focus in the input, click selects (standard combobox pattern)
                            <div
                              key={d.id}
                              id={`${listId}-${d.id}`}
                              role="option"
                              aria-selected={on}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => choose(d)}
                              onMouseEnter={() => setActive(ordered.indexOf(d))}
                              className={`flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-sm ${
                                on ? "bg-slate-100" : ""
                              }`}
                            >
                              <span
                                aria-hidden
                                className="h-3 w-3 shrink-0 rounded-full"
                                style={{ background: d.color }}
                              />
                              <span className="flex-1 font-medium">
                                {place(d.label)}
                              </span>
                              <span className="text-xs text-slate-500">
                                {place(d.group)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
                {!results.length && (
                  <div
                    className="px-3 py-3 text-sm text-slate-600"
                    role="status"
                  >
                    <p>
                      {t(
                        `Tidak ada lokasi yang cocok dengan “${q.trim()}”.`,
                        `No place matches “${q.trim()}”.`,
                      )}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {t("Coba:", "Try:")}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {SUGGEST[lang].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
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
            )}
            <p className="sr-only" role="status">
              {showResults
                ? t(
                    `${results.length} lokasi ditemukan`,
                    `${results.length} places found`,
                  )
                : ""}
            </p>
          </div>

          {/* popular: one tap straight to a route */}
          <div
            className="mt-4 flex max-w-xl flex-wrap gap-2"
            aria-label={t("Tujuan populer", "Popular destinations")}
            role="group"
          >
            {QUICK.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => choose(d)}
                className="flex min-h-11 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-medium ring-1 ring-white/15 backdrop-blur transition hover:bg-white/20"
              >
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 rounded-full ring-1 ring-white/60"
                  style={{ background: d.color }}
                />
                {place(d.label)}
                <span className="text-xs text-white/70">
                  · {floorName(d.floor, lang)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* view modes */}
        <section className="mt-10" aria-labelledby="lg-views">
          <h2
            id="lg-views"
            className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-white/60"
          >
            {t("Pilih tampilan", "Choose a view")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {views.map((v) => (
              <button
                key={v.mode}
                type="button"
                onClick={() => onStart({ mode: v.mode })}
                className="group flex items-center gap-4 rounded-2xl bg-brand-ink p-4 text-left ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:ring-brand-gold/50 sm:flex-col sm:items-start"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gold/15 text-brand-gold">
                  <Glyph d={v.icon} />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">{v.title}</span>
                  <span className="block text-xs text-white/70">{v.sub}</span>
                </span>
                <span
                  aria-hidden
                  className="text-brand-gold transition group-hover:translate-x-1"
                >
                  →
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* floors */}
        <section className="mt-8" aria-labelledby="lg-floors">
          <h2
            id="lg-floors"
            className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-white/60"
          >
            {t("Direktori lantai", "Floor directory")}
          </h2>
          <div className="overflow-hidden rounded-2xl bg-brand-ink ring-1 ring-white/10">
            {floors.map((f, i) => (
              <button
                key={f.f}
                type="button"
                onClick={() => onStart({ mode: "3d", floor: f.f })}
                className={`flex w-full items-center gap-4 px-4 py-4 text-left transition hover:bg-white/5 ${
                  i ? "border-t border-white/10" : ""
                }`}
              >
                <span
                  aria-hidden
                  className="flex h-11 w-14 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-bold text-brand-navy"
                >
                  {FLOOR_TAG[f.f]}
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">
                    {floorName(f.f, lang)}
                  </span>
                  <span className="block text-xs text-white/70">{f.sub}</span>
                </span>
                <span aria-hidden className="text-white/50">
                  →
                </span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
