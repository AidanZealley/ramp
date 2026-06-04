import { Canvas } from "@react-three/fiber"
import { FogExp2 } from "three"
import {
  FREE_RIDE_CAMERA,
  FREE_RIDE_FOG,
  FREE_RIDE_FX,
  FREE_RIDE_PALETTE,
} from "../../free-ride-config"
import { FloatingStructures } from "../floating-structures"
import { PostFx } from "../post-fx"
import { RideCamera } from "../ride-camera"
import { RideMotion } from "../ride-motion"
import { RideSky } from "../ride-sky"
import { SceneryField } from "../scenery-field"
import { TrackEdges } from "../track-edges"
import { TrackRibbon } from "../track-ribbon"
import type { RideState } from "../../ride-state"

type FreeRideSceneProps = {
  rideState: RideState
}

/**
 * Full-bleed r3f canvas for the first-person flight. `RideMotion` runs first so
 * it advances the shared ride-state before the camera and geometry read it. No
 * shadows — the look is purely emissive + bloom, which keeps it fast.
 */
export function FreeRideScene({ rideState }: FreeRideSceneProps) {
  return (
    <Canvas
      className="h-full w-full"
      data-testid="free-ride-canvas"
      dpr={FREE_RIDE_FX.dpr}
      camera={{
        fov: FREE_RIDE_CAMERA.baseFov,
        near: 0.1,
        far: 5000,
        position: [0, FREE_RIDE_CAMERA.eyeHeightMeters, 0],
      }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ scene }) => {
        scene.fog = new FogExp2(FREE_RIDE_PALETTE.fog, FREE_RIDE_FOG.density)
      }}
    >
      <color attach="background" args={[FREE_RIDE_PALETTE.fog]} />
      <ambientLight intensity={0.36} color={FREE_RIDE_PALETTE.neonViolet} />
      <directionalLight intensity={0.55} position={[40, 100, -30]} color="#9bb2ff" />

      <RideSky />
      <RideMotion rideState={rideState} />
      <RideCamera rideState={rideState} />
      <TrackRibbon rideState={rideState} />
      <TrackEdges rideState={rideState} />
      <SceneryField rideState={rideState} />
      <FloatingStructures rideState={rideState} />

      <PostFx />
    </Canvas>
  )
}
