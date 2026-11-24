/**
 * Single source of truth for wayfinding sign colours (2D plans, 3D pins, lists, legend).
 * Every tile carries a white pictogram; the ratio after each colour is its measured contrast against white.
 * Hue meanings are kept consistent across the app: green = stairs and exits, red only for "you are here" and warnings,
 * blue = information / transport, so one hue never means two different things. These are design choices, not an audit.
 */
export const SIGN = {
  lift: "#2f6fed", // Lift G–19 (zone A) · 4.55:1
  liftB: "#7c3aed", // Lift 19–33 (zone B) · 5.70:1
  cargo: "#b45309", // service lift · 5.02:1
  escalator: "#6d28d9", // 7.10:1
  escape: "#15803d", // emergency stairs + exits (safety green) · 5.02:1
  info: "#8a6a37", // reception / offices (darker brand gold) · 5.00:1
  cafe: "#7a5236", // 6.80:1
  bank: "#1e40af", // 8.72:1
  parking: "#1d4ed8", // 6.70:1
  men: "#2563eb", // 5.17:1
  women: "#db2777", // 4.60:1
  toilet: "#0e7490", // 5.36:1
  lab: "#0e7490",
  computer: "#4f46e5", // 6.29:1
  library: "#a16207", // 4.92:1
  lounge: "#9a3412", // 7.31:1
  staff: "#0f766e", // 5.47:1
  room: "#475569", // 7.58:1
  mosque: "#047857", // 5.48:1
  wudhu: "#155e75", // 7.27:1
  security: "#0f172a",
  storage: "#78716c", // 4.80:1
  canteen: "#7a5236",
  ramp: "#334155",
  gate: "#0f172a",
  smoking: "#57534e", // 7.63:1
  off: "#64748b", // out of service · 4.76:1
  route: "#f97316", // route line (drawn with a white casing)
  routeInk: "#c2410c", // route colour behind white text · 5.18:1
} as const
