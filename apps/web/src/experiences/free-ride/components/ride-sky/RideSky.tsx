import { Stars } from "@react-three/drei"
import { useFrame, useThree } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import { BackSide, Color, ShaderMaterial } from "three"
import { FREE_RIDE_PALETTE } from "../../free-ride-config"
import type { Group } from "three"

/**
 * Dark dusk backdrop: a large inverted sphere with a vertical gradient (deep
 * indigo overhead fading to a magenta horizon that matches the scene fog), plus
 * a subtle starfield. The backdrop ignores fog so it stays crisp behind the
 * fogged geometry.
 */
export function RideSky() {
  const material = useMemo(() => {
    return new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        topColor: { value: new Color(FREE_RIDE_PALETTE.skyTop) },
        horizonColor: { value: new Color(FREE_RIDE_PALETTE.skyHorizon) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDirection;
        void main() {
          vDirection = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vDirection;
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        void main() {
          float h = clamp(vDirection.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 color = mix(horizonColor, topColor, smoothstep(0.32, 0.72, h));
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    })
  }, [])

  // The backdrop is "at infinity", so it tracks the camera as we travel.
  const groupRef = useRef<Group>(null)
  const camera = useThree((state) => state.camera)
  useFrame(() => {
    groupRef.current?.position.copy(camera.position)
  })

  return (
    <group ref={groupRef}>
      <mesh material={material} frustumCulled={false} scale={3000}>
        <sphereGeometry args={[1, 32, 16]} />
      </mesh>
      <Stars radius={600} depth={120} count={2200} factor={6} saturation={0.4} fade speed={0.6} />
    </group>
  )
}
