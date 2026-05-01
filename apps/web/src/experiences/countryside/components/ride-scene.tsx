import { Canvas } from "@react-three/fiber"
import { Sky } from "@react-three/drei"
import { RideCamera } from "./camera"
import { RideWorld } from "./world"
import { RiderMarker } from "./rider-marker"
import type { RideTelemetry } from "@ramp/ride-core"

type RideSceneProps = {
  telemetry: RideTelemetry
}

export function RideScene({ telemetry }: RideSceneProps) {
  return (
    <Canvas
      className="ride-canvas h-full w-full"
      shadows
      orthographic
      camera={{
        position: [72, 58, 72],
        rotation: [-Math.PI / 4, Math.PI / 4, 0],
        zoom: 9,
        near: 0.1,
        far: 1200,
      }}
      gl={{
        antialias: true,
        alpha: false,
      }}
      data-testid="ride-canvas"
    >
      <color attach="background" args={["#b9d6d0"]} />
      <fog attach="fog" args={["#b9d6d0", 120, 360]} />
      <ambientLight intensity={0.7} />
      <directionalLight
        castShadow
        intensity={2.1}
        position={[45, 90, 35]}
        shadow-mapSize={[2048, 2048]}
      />
      <Sky
        azimuth={0.28}
        distance={450000}
        inclination={0.51}
        mieCoefficient={0.004}
        mieDirectionalG={0.72}
        rayleigh={1.1}
        turbidity={4}
      />
      <RideCamera distanceMeters={telemetry.distanceMeters} />
      <RideWorld distanceMeters={telemetry.distanceMeters} />
      <RiderMarker distanceMeters={telemetry.distanceMeters} />
    </Canvas>
  )
}
