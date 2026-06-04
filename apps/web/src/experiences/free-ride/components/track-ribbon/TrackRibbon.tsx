import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from "three"
import {
  FREE_RIDE_MARKINGS,
  FREE_RIDE_PALETTE,
  FREE_RIDE_TRACK,
  FREE_RIDE_TRACK_SURFACE,
} from "../../free-ride-config"
import { getVisualTrackY, sampleTrack } from "../../track"
import type { RideState } from "../../ride-state"
import type { TrackSample } from "../../track"

type TrackRibbonProps = {
  rideState: RideState
}

type CrossSectionVertex = {
  lateral: number
  lift: number
}

const { segmentCount, segmentSpacingMeters, behindMeters } = FREE_RIDE_TRACK
const {
  centerHalfWidthMeters,
  innerPanelHalfWidthMeters,
  shoulderOuterMeters,
  wallOuterMeters,
  wallBaseLiftMeters,
  shoulderDropMeters,
} = FREE_RIDE_TRACK_SURFACE

const CROSS_SECTION: Array<CrossSectionVertex> = [
  { lateral: -wallOuterMeters, lift: wallBaseLiftMeters },
  { lateral: -shoulderOuterMeters, lift: shoulderDropMeters },
  { lateral: -innerPanelHalfWidthMeters, lift: 0 },
  { lateral: -centerHalfWidthMeters, lift: 0.015 },
  { lateral: centerHalfWidthMeters, lift: 0.015 },
  { lateral: innerPanelHalfWidthMeters, lift: 0 },
  { lateral: shoulderOuterMeters, lift: shoulderDropMeters },
  { lateral: wallOuterMeters, lift: wallBaseLiftMeters },
]

const VERTICES_PER_SEGMENT = CROSS_SECTION.length

function writeDeckVertex(
  sample: TrackSample,
  crossSection: CrossSectionVertex,
  out: Float32Array,
  offset: number
): void {
  const visualY = getVisualTrackY(sample)
  out[offset] =
    sample.position[0] +
    sample.right[0] * crossSection.lateral +
    sample.up[0] * crossSection.lift
  out[offset + 1] =
    visualY + sample.right[1] * crossSection.lateral + sample.up[1] * crossSection.lift
  out[offset + 2] =
    sample.position[2] +
    sample.right[2] * crossSection.lateral +
    sample.up[2] * crossSection.lift
}

function makeTrackMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    side: DoubleSide,
    fog: true,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        time: { value: 0 },
        speed: { value: 0 },
        markingIntensity: { value: FREE_RIDE_MARKINGS.intensity },
        panelSpacing: { value: FREE_RIDE_MARKINGS.panelSpacingMeters },
        centerTraceWidth: { value: FREE_RIDE_MARKINGS.centerTraceWidthMeters },
        gridSpacing: { value: FREE_RIDE_MARKINGS.gridSpacingMeters },
        deckAlpha: { value: FREE_RIDE_TRACK_SURFACE.deckAlpha },
        baseColor: { value: new Color(FREE_RIDE_PALETTE.trackSurface) },
        panelColor: { value: new Color(FREE_RIDE_PALETTE.trackPanel) },
        shoulderColor: { value: new Color(FREE_RIDE_PALETTE.trackShoulder) },
      wallColor: { value: new Color(FREE_RIDE_PALETTE.trackWall) },
      cyan: { value: new Color(FREE_RIDE_PALETTE.neonCyan) },
      violet: { value: new Color(FREE_RIDE_PALETTE.neonViolet) },
      neutralLine: { value: new Color("#7f8a96") },
      },
    ]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>

      varying vec2 vRoad;
      varying vec3 vNormal;
      varying vec3 vViewDir;

      void main() {
        vRoad = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(cameraPosition - worldPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>

      uniform float time;
      uniform float speed;
      uniform float markingIntensity;
      uniform float panelSpacing;
      uniform float centerTraceWidth;
      uniform float gridSpacing;
      uniform float deckAlpha;
      uniform vec3 baseColor;
      uniform vec3 panelColor;
      uniform vec3 shoulderColor;
      uniform vec3 wallColor;
      uniform vec3 cyan;
      uniform vec3 violet;
      uniform vec3 neutralLine;

      varying vec2 vRoad;
      varying vec3 vNormal;
      varying vec3 vViewDir;

      float lineMask(float coordinate, float width) {
        float d = abs(fract(coordinate) - 0.5);
        return 1.0 - smoothstep(width, width + 0.018, d);
      }

      void main() {
        float lateral = abs(vRoad.x);
        float centerDeck = 1.0 - smoothstep(3.75, 4.15, lateral);
        float shoulder = smoothstep(5.1, 6.9, lateral);
        float wall = smoothstep(6.55, 7.1, lateral);

        vec3 color = mix(panelColor, baseColor, centerDeck);
        color = mix(color, shoulderColor, shoulder * 0.75);
        color = mix(color, wallColor, wall);

        float centerTrace =
          1.0 - smoothstep(centerTraceWidth, centerTraceWidth * 3.5, abs(vRoad.x));
        float pulse = 0.65 + 0.35 * sin(vRoad.y * 0.23 - time * (1.5 + speed * 0.015));
        float seam = lineMask(vRoad.y / panelSpacing, 0.012) * (1.0 - smoothstep(5.0, 6.2, lateral));
        float longitudinalGrid =
          lineMask((abs(vRoad.x) + 0.18) / gridSpacing, 0.018) *
          smoothstep(0.8, 4.4, lateral) *
          (1.0 - smoothstep(4.7, 5.4, lateral));
        float transverseInlay =
          lineMask((vRoad.y + 2.0) / (panelSpacing * 0.5), 0.006) *
          smoothstep(1.2, 4.6, lateral) *
          (1.0 - smoothstep(4.7, 5.5, lateral));

        vec3 marking =
          neutralLine * centerTrace * pulse * 0.42 +
          neutralLine * seam * 0.13 +
          cyan * longitudinalGrid * 0.055 +
          neutralLine * transverseInlay * 0.075;
        color += marking * markingIntensity;

        float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 2.4);
        color += neutralLine * fresnel * 0.045;

        gl_FragColor = vec4(color, 1.0);
        gl_FragColor.rgb *= mix(0.86, 1.0, deckAlpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  })
}

export const TrackRibbon = ({ rideState }: TrackRibbonProps) => {
  const positions = useMemo(
    () => new Float32Array(segmentCount * VERTICES_PER_SEGMENT * 3),
    []
  )
  const roadUvs = useMemo(
    () => new Float32Array(segmentCount * VERTICES_PER_SEGMENT * 2),
    []
  )

  const geometry = useMemo(() => {
    const geom = new BufferGeometry()
    geom.setAttribute("position", new BufferAttribute(positions, 3))
    geom.setAttribute("uv", new BufferAttribute(roadUvs, 2))

    const indices: Array<number> = []
    for (let i = 0; i < segmentCount - 1; i += 1) {
      for (let j = 0; j < VERTICES_PER_SEGMENT - 1; j += 1) {
        const base = i * VERTICES_PER_SEGMENT + j
        const next = base + VERTICES_PER_SEGMENT
        indices.push(base, base + 1, next, base + 1, next + 1, next)
      }
    }
    geom.setIndex(indices)
    geom.computeVertexNormals()
    return geom
  }, [positions, roadUvs])

  const material = useMemo(() => makeTrackMaterial(), [])
  const materialRef = useRef(material)
  materialRef.current = material

  useFrame((state) => {
    const start = rideState.distance - behindMeters
    for (let i = 0; i < segmentCount; i += 1) {
      const distanceAlong = start + i * segmentSpacingMeters
      const sample = sampleTrack(distanceAlong)
      for (let j = 0; j < VERTICES_PER_SEGMENT; j += 1) {
        const positionOffset = (i * VERTICES_PER_SEGMENT + j) * 3
        const uvOffset = (i * VERTICES_PER_SEGMENT + j) * 2
        const crossSection = CROSS_SECTION[j]
        writeDeckVertex(sample, crossSection, positions, positionOffset)
        roadUvs[uvOffset] = crossSection.lateral
        roadUvs[uvOffset + 1] = distanceAlong
      }
    }
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.uv.needsUpdate = true
    geometry.computeVertexNormals()
    const uniforms = materialRef.current.uniforms
    if (uniforms.time) uniforms.time.value = state.clock.elapsedTime
    if (uniforms.speed) uniforms.speed.value = rideState.speed
  })

  return <mesh geometry={geometry} material={material} frustumCulled={false} />
}
