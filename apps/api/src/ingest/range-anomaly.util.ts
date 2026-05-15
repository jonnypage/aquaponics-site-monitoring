/** Effective normal band from spec (sensor_thresholds + sensor_catalog fallbacks). */
export function effectiveNormalBounds(
  physicalMin: number | null,
  physicalMax: number | null,
  threshold: { normal_min: number | null; normal_max: number | null } | undefined
): { normalMin: number; normalMax: number } | null {
  const normalMin = threshold?.normal_min ?? physicalMin;
  const normalMax = threshold?.normal_max ?? physicalMax;
  if (normalMin == null || normalMax == null) {
    return null;
  }
  if (normalMin > normalMax) {
    return null;
  }
  return { normalMin, normalMax };
}

export type RangeAnomalyDecision =
  | {
      severity: "critical";
      type: string;
      message: string;
    }
  | {
      severity: "warning";
      type: string;
      message: string;
    };

/**
 * Alert severity decision tree (short-circuit) for one reading + one sensor key.
 * `warningDelta` / `criticalDelta` use null = skip step per spec (not implicit zero).
 */
export function classifyRangeAnomaly(
  sensorKey: string,
  value: number,
  normalMin: number,
  normalMax: number,
  warningDelta: number | null | undefined,
  criticalDelta: number | null | undefined
): RangeAnomalyDecision | null {
  const warnD = warningDelta ?? null;
  const critD = criticalDelta ?? null;

  if (critD != null) {
    const criticalLow = normalMin - critD;
    const criticalHigh = normalMax + critD;
    if (value < criticalLow || value > criticalHigh) {
      return {
        severity: "critical",
        type: `range_violation:${sensorKey}`,
        message: `Reading ${value} is outside critical band for ${sensorKey} (normal ${normalMin}–${normalMax}, ±${critD}).`
      };
    }
  }

  if (warnD != null) {
    const warningLow = normalMin - warnD;
    const warningHigh = normalMax + warnD;
    if (value < warningLow || value > warningHigh) {
      return {
        severity: "warning",
        type: `range_warning:${sensorKey}`,
        message: `Reading ${value} is outside warning band for ${sensorKey} (normal ${normalMin}–${normalMax}, ±${warnD}).`
      };
    }
  }

  if (value < normalMin || value > normalMax) {
    return {
      severity: "warning",
      type: `range_warning:${sensorKey}`,
      message: `Reading ${value} is outside normal range for ${sensorKey} (${normalMin}–${normalMax}).`
    };
  }

  return null;
}
