import { SIGN } from "./palette"

/* Ground-floor pictograms (white stroke on a coloured tile) shared by the 3D pins, the 2D plan and the legend */
export type Kind = "lift" | "cargo" | "stairs" | "escalator" | "door" | "cafe" | "bank" | "info"

export const COLOR: Record<Kind, string> = {
  lift: SIGN.lift,
  cargo: SIGN.cargo,
  stairs: SIGN.escape,
  escalator: SIGN.escalator,
  door: SIGN.escape,
  cafe: SIGN.cafe,
  bank: SIGN.bank,
  info: SIGN.info,
}
export const LABEL: Record<Kind, string> = {
  lift: "Lift",
  cargo: "Lift Barang",
  stairs: "Tangga Darurat",
  escalator: "Eskalator",
  door: "Pintu",
  cafe: "Kafe",
  bank: "Bank Sentosa",
  info: "Resepsionis",
}

export function Icon({ kind }: { kind: Kind }) {
  const s = {
    stroke: "white",
    strokeWidth: 2,
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }
  switch (kind) {
    case "stairs":
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <path {...s} d="M3 20h4v-4h4v-4h4V8h5" />
          <circle cx="15" cy="4" r="1.6" fill="white" />
          <path {...s} d="M14 6l-2 4 3 2" />
        </svg>
      )
    case "lift":
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <path {...s} d="M6 7l2-3 2 3M14 4l2 3 2-3" />
          <rect {...s} x="5" y="10" width="14" height="11" rx="1" />
          <circle cx="9" cy="13" r="1" fill="white" />
          <circle cx="15" cy="13" r="1" fill="white" />
          <path {...s} d="M9 15v4M15 15v4" />
        </svg>
      )
    case "cargo":
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <path {...s} d="M6 7l2-3 2 3M14 4l2 3 2-3" />
          <rect {...s} x="4" y="10" width="16" height="11" rx="1" />
          <rect x="7" y="14" width="5" height="5" fill="white" />
          <rect x="13" y="16" width="4" height="3" fill="white" />
        </svg>
      )
    case "escalator":
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <path {...s} d="M3 19h5l8-10h5" />
          <circle cx="12" cy="5" r="1.6" fill="white" />
          <path {...s} d="M12 7v5" />
        </svg>
      )
    case "door":
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <rect {...s} x="3" y="3" width="8" height="18" />
          <circle cx="16" cy="5" r="1.6" fill="white" />
          <path {...s} d="M16 7l-2 5 3 3v5M14 12l-3 4M16 9l4 2" />
        </svg>
      )
    case "cafe":
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <path
            {...s}
            d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2M8 3v3M12 3v3"
          />
        </svg>
      )
    case "info":
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <circle {...s} cx="12" cy="12" r="9" />
          <path {...s} d="M12 11v6" />
          <circle cx="12" cy="7.5" r="1.3" fill="white" />
        </svg>
      )
    case "bank":
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <path {...s} d="M3 9l9-5 9 5zM5 9v9M19 9v9M3 20h18" />
          <circle {...s} cx="12" cy="14" r="3" />
        </svg>
      )
  }
}
