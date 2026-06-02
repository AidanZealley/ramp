import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Vignette,
} from "@react-three/postprocessing"
import { useMemo } from "react"
import { Vector2 } from "three"
import { FREE_RIDE_FX } from "../../free-ride-config"

/**
 * The post stack that sells the Redout look: strong, threshold-tuned bloom over
 * the HDR neon, a vignette to frame the speed, and a hint of chromatic
 * aberration at the edges.
 */
export function PostFx() {
  const chromaticOffset = useMemo(
    () => new Vector2(FREE_RIDE_FX.chromaticOffset, FREE_RIDE_FX.chromaticOffset),
    []
  )

  return (
    <EffectComposer>
      <Bloom
        intensity={FREE_RIDE_FX.bloomIntensity}
        luminanceThreshold={FREE_RIDE_FX.bloomThreshold}
        luminanceSmoothing={FREE_RIDE_FX.bloomSmoothing}
        mipmapBlur
      />
      <ChromaticAberration offset={chromaticOffset} radialModulation={false} modulationOffset={0} />
      <Vignette darkness={FREE_RIDE_FX.vignetteDarkness} eskil={false} offset={0.2} />
    </EffectComposer>
  )
}
