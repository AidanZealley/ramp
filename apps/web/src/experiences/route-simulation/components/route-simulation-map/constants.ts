export const ROUTE_PADDING_PX = 40

export const CAMERA_DURATION_MS = 450
export const CAMERA_MODE_TRANSITION_DURATION_MS = 900
export const CAMERA_FOLLOW_EASE_DURATION_MS = 120
export const CAMERA_WHEEL_ZOOM_DURATION_MS = 0
export const CAMERA_BEARING_SMOOTHING_MS = 350
export const CAMERA_MOVE_THRESHOLD_METERS = 2
export const CAMERA_BEARING_THRESHOLD_DEGREES = 2
export const CAMERA_PITCH_THRESHOLD_DEGREES = 1

export const PERSPECTIVE_MIN_PITCH = 48
export const PERSPECTIVE_MAX_PITCH = 80
export const PERSPECTIVE_MIN_PITCH_ZOOM = 14
export const PERSPECTIVE_MAX_PITCH_ZOOM = 18
export const PERSPECTIVE_ZOOM_FLOOR = 15.5
export const PERSPECTIVE_FOLLOW_OFFSET_PX: [number, number] = [0, 140]
export const PERSPECTIVE_GRADE_PITCH_MULTIPLIER = 0.8
export const PERSPECTIVE_GRADE_PITCH_RANGE = 10

export const ROUTE_WHEEL_ZOOM_SCALE = 0.01
export const ROUTE_MIN_ZOOM = 0
export const ROUTE_MAX_ZOOM = 22

export const TERRAIN_SOURCE_ID = "route-terrain-dem"
export const TERRAIN_TILE_URL =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
export const TERRAIN_ATTRIBUTION =
  '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Terrain data</a>'

export const RIDER_SOURCE_ID = "route-rider"
export const RIDER_RENDER_SEEK_THRESHOLD_METERS = 25
export const RIDER_RENDER_MAX_GAP_MS = 1000
export const RIDER_RENDER_MIN_SPEED_MPS = 0.1
export const RIDER_RENDER_MAX_SPEED_MPS = 30
export const RIDER_RENDER_ARRIVAL_EPSILON_METERS = 0.05
