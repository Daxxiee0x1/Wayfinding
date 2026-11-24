/** Detect phones / low-end devices once, so 3D scenes can scale their graphics down automatically. */
const nav =
  typeof navigator !== "undefined"
    ? navigator as Navigator & { deviceMemory?: number }
    : undefined
const touch =
  typeof window !== "undefined" &&
  window.matchMedia("(pointer: coarse)").matches
const mobileUA = !!nav && /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent)
const weak =
  !!nav && ((nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4)

/** phones / tablets */
export const MOBILE = mobileUA || touch
// phones / tablets, and any device with few cores or little memory (also low-end laptops)
export const LOW = MOBILE || weak

export const Q = {
  /** low-spec: no real-time shadows at all (the biggest per-pixel cost) */
  shadows: !LOW,
  /** fixed render resolution (never changed while moving, which made the picture jump / flicker). Phones get 1.5x:
   *  with antialiasing it stays sharp on dense screens while keeping low-end phones smooth. */
  dpr: (MOBILE ? [1, 1.5] : weak ? [1, 1.25] : [1, 1.5]) as [number, number],
  /** MSAA is nearly free on the tile-based GPUs of phones and removes the jagged edges */
  antialias: true,
  shadowMap: LOW ? 1024 : 2048,
  outdoorShadowMap: LOW ? 1024 : 2048,
  contactRes: LOW ? 256 : 512,
  envRes: LOW ? 64 : 128,
}
