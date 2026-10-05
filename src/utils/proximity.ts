import { getDistanceInMeters } from '@/src/core/geo/distance';

export { getDistanceInMeters };

export type ProximityStage = 'far' | 'near' | 'very_near' | 'arrived';

export const ALERT_THRESHOLDS = {
  FAR: 200,
  NEAR: 100,
  VERY_NEAR: 30,
  ARRIVED: 10,
} as const;

export type ProximityThresholdSet = {
  near: number;
  veryNear: number;
  arrived: number;
};

export type BusAlertThresholdSet = {
  nextStation: number;
  prepareDrop: number;
  arrived: number;
};

export const PROXIMITY_ALERT_MIN_INTERVAL_MS = 12000;

export type ProximityAlertSettings = {
  voiceAlerts: boolean;
  vibrationAlerts: boolean;
};

export const DEFAULT_PROXIMITY_ALERT_SETTINGS: ProximityAlertSettings = {
  voiceAlerts: true,
  vibrationAlerts: true,
};

const PROXIMITY_STAGE_ORDER: Record<ProximityStage, number> = {
  far: 0,
  near: 1,
  very_near: 2,
  arrived: 3,
};

export function getAdaptiveProximityThresholds(options?: {
  speedMps?: number | null;
  accuracy?: number | null;
}): ProximityThresholdSet {
  const speedMps = options?.speedMps ?? null;
  const accuracy = options?.accuracy ?? null;
  const speedAdjustment =
    speedMps == null
      ? 0
      : speedMps >= 4
        ? 35
        : speedMps >= 2
          ? 15
          : speedMps <= 0.8
            ? -15
            : 0;
  const accuracyAdjustment = accuracy != null && accuracy > 35 ? 12 : 0;

  return {
    near: Math.max(70, ALERT_THRESHOLDS.NEAR + speedAdjustment + accuracyAdjustment),
    veryNear: Math.max(22, ALERT_THRESHOLDS.VERY_NEAR + Math.round(speedAdjustment / 2) + accuracyAdjustment),
    arrived: Math.max(10, ALERT_THRESHOLDS.ARRIVED + Math.round(accuracyAdjustment / 2)),
  };
}

export function getAdaptiveBusAlertThresholds(options?: {
  speedMps?: number | null;
  accuracy?: number | null;
}): BusAlertThresholdSet {
  const speedMps = options?.speedMps ?? null;
  const accuracy = options?.accuracy ?? null;
  const speedAdjustment =
    speedMps == null
      ? 0
      : speedMps >= 9
        ? 70
        : speedMps >= 5
          ? 35
          : speedMps <= 1.5
            ? -20
            : 0;
  const accuracyAdjustment = accuracy != null && accuracy > 35 ? 15 : 0;

  return {
    nextStation: Math.max(110, 150 + speedAdjustment + accuracyAdjustment),
    prepareDrop: Math.max(60, 80 + Math.round(speedAdjustment / 2) + accuracyAdjustment),
    arrived: Math.max(28, 35 + Math.round(accuracyAdjustment / 2)),
  };
}

export function getProximityStage(
  distanceMeters: number,
  thresholds: ProximityThresholdSet = {
    near: ALERT_THRESHOLDS.NEAR,
    veryNear: ALERT_THRESHOLDS.VERY_NEAR,
    arrived: ALERT_THRESHOLDS.ARRIVED,
  }
): ProximityStage {
  if (distanceMeters <= thresholds.arrived) {
    return 'arrived';
  }

  if (distanceMeters <= thresholds.veryNear) {
    return 'very_near';
  }

  if (distanceMeters <= thresholds.near) {
    return 'near';
  }

  return 'far';
}

export function shouldTriggerProximityAlert(params: {
  lastObservedStage: ProximityStage | null;
  lastAlertStage: ProximityStage | null;
  nextStage: ProximityStage;
  lastAlertTimestamp: number;
  now?: number;
  minIntervalMs?: number;
}) {
  const {
    lastObservedStage,
    lastAlertStage,
    nextStage,
    lastAlertTimestamp,
    now = Date.now(),
    minIntervalMs = PROXIMITY_ALERT_MIN_INTERVAL_MS,
  } = params;

  if (nextStage === 'far') {
    return false;
  }

  if (lastObservedStage === nextStage) {
    return false;
  }

  const nextStageRank = PROXIMITY_STAGE_ORDER[nextStage];
  const previousObservedRank =
    lastObservedStage == null ? -1 : PROXIMITY_STAGE_ORDER[lastObservedStage];
  const previousAlertRank = lastAlertStage == null ? -1 : PROXIMITY_STAGE_ORDER[lastAlertStage];
  const isForwardProgress = nextStageRank > previousObservedRank;
  const hasRecentAlert = now - lastAlertTimestamp < minIntervalMs;

  if (!isForwardProgress && hasRecentAlert) {
    return false;
  }

  if (lastAlertStage === nextStage && hasRecentAlert) {
    return false;
  }

  if (nextStageRank <= previousAlertRank && hasRecentAlert) {
    return false;
  }

  return true;
}
