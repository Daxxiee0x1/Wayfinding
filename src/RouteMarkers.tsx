import * as THREE from "three"
import { Tag } from "./Tags"
import { legLabel, type Leg, type Pt } from "./Wayfinding"
import { usePrefs, useT } from "./prefs"
import { SIGN } from "./palette"

type Conv = (x: number, y: number) => Pt

/** Flat route ribbon with rounded joints and a destination pin */
export function RouteLine({
  leg,
  conv,
  width,
  y,
  pin,
}: {
  leg: Leg
  conv: Conv
  width: number
  y: number
  pin: number
}) {
  const { lang } = usePrefs()
  const w = leg.pts.map(([x, yy]) => conv(x, yy))
  const end = w[w.length - 1]
  return (
    <group>
      {w.slice(1).map((b, i) => {
        const a = w[i]
        const len = Math.hypot(b[0] - a[0], b[1] - a[1])
        return (
          <group
            key={i}
            position={[(a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2]}
            rotation={[0, Math.atan2(b[0] - a[0], b[1] - a[1]), 0]}
          >
            <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}>
              <planeGeometry args={[width, len]} />
              <meshBasicMaterial
                color={SIGN.route}
                toneMapped={false}
                polygonOffset
                polygonOffsetFactor={-4}
              />
            </mesh>
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0.005, 0]}
              renderOrder={6}
            >
              <planeGeometry args={[width * 0.3, len]} />
              <meshBasicMaterial
                color="#fff7ed"
                toneMapped={false}
                polygonOffset
                polygonOffsetFactor={-5}
              />
            </mesh>
          </group>
        )
      })}
      {w.map((p, i) => (
        <mesh
          key={"j" + i}
          position={[p[0], y, p[1]]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={5}
        >
          <circleGeometry args={[width / 2, 24]} />
          <meshBasicMaterial
            color={SIGN.route}
            toneMapped={false}
            polygonOffset
            polygonOffsetFactor={-4}
          />
        </mesh>
      ))}
      {/* destination pin */}
      <group position={[end[0], y, end[1]]}>
        <mesh position={[0, pin * 0.5, 0]}>
          <cylinderGeometry args={[pin * 0.04, pin * 0.04, pin]} />
          <meshStandardMaterial color={SIGN.route} />
        </mesh>
        <mesh position={[0, pin, 0]} castShadow>
          <sphereGeometry args={[pin * 0.16, 24, 16]} />
          <meshStandardMaterial
            color={SIGN.route}
            emissive={SIGN.route}
            emissiveIntensity={0.5}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[width * 0.7, width * 1.1, 32]} />
          <meshBasicMaterial color={SIGN.route} side={THREE.DoubleSide} />
        </mesh>
        <Tag
          position={[0, pin * 1.35, 0]}
          distanceFactor={60}
          style={{ pointerEvents: "none" }}
          keep
        >
          <div
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold text-white shadow-lg ring-2 ring-white ${
              leg.final ? "bg-orange-700" : "bg-slate-900"
            }`}
          >
            {legLabel(leg, lang)}
          </div>
        </Tag>
      </group>
    </group>
  )
}

export function YouAreHere({
  p,
  conv,
  size,
  y,
}: {
  p: Pt
  conv: Conv
  size: number
  y: number
}) {
  const t = useT()
  const [x, z] = conv(p[0], p[1])
  return (
    <group position={[x, y, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={7}>
        <circleGeometry args={[size, 32]} />
        <meshBasicMaterial
          color="#ef4444"
          transparent
          opacity={0.25}
          depthWrite={false}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        renderOrder={8}
      >
        <circleGeometry args={[size * 0.45, 32]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      <mesh position={[0, size * 1.6, 0]}>
        <cylinderGeometry args={[size * 0.06, size * 0.06, size * 3.2]} />
        <meshStandardMaterial color="#b91c1c" />
      </mesh>
      <mesh position={[0, size * 3.3, 0]} castShadow>
        <sphereGeometry args={[size * 0.35, 24, 16]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#ef4444"
          emissiveIntensity={0.5}
        />
      </mesh>
      <Tag
        position={[0, size * 4.4, 0]}
        distanceFactor={60}
        style={{ pointerEvents: "none" }}
        keep
      >
        <div className="whitespace-nowrap rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-lg ring-2 ring-white">
          {t("Anda di sini", "You are here")}
        </div>
      </Tag>
    </group>
  )
}
