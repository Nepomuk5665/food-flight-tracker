/** Shared, testable configuration for the JourneyMap Mapbox instance. */

/**
 * Initial view state for the globe projection.
 *
 * `minZoom: 1.5` prevents zooming out past the point where Mapbox GL's
 * globe coordinate math becomes unstable, which causes wild viewport jumps
 * when releasing a pinch-zoom gesture.
 */
export const INITIAL_VIEW_STATE = {
  longitude: 10,
  latitude: 30,
  zoom: 2,
  pitch: 20,
  minZoom: 1.5,
  maxZoom: 18,
} as const;

/**
 * Interaction constraints passed to the <Map> component.
 *
 * `touchPitch: false` — disables pitch changes initiated by touch gestures.
 * On globe projection, accidental pitch tilt during pinch-zoom produces violent
 * viewport corrections on release. We still set pitch programmatically via
 * flyTo/fitBounds, so the cinematic tilt is preserved.
 *
 * `maxPitch: 55` — even for programmatic camera moves, cap the pitch to prevent
 * extreme angles that disorient users.
 */
export const MAP_INTERACTION_CONFIG = {
  touchPitch: false,
  maxPitch: 55,
} as const;
