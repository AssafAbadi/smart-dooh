/**
 * Re-exports from backend geo util (avoids shared-geo rootDir build issue).
 */
export {
  haversineMeters,
  bearingDegrees,
  bearingToDirection,
  hasMovedMoreThanMeters,
  boundingBox,
  type DirectionArrow,
} from '../../core/utils/geo.util';
