/**
 * MVP ingest heuristics for catalog keys in the Phase 4 spec.
 * Thresholds are fixed constants (no DB config) until admin tuning exists.
 */

export type HeuristicSeverity = "warning" | "critical";

export interface HeuristicFinding {
  type: string;
  severity: HeuristicSeverity;
  message: string;
}

/** Newest-first measurement history (includes the row just inserted). */
export interface HistoryPoint {
  value: number;
  takenAt: Date;
}

const MS_HOUR = 60 * 60 * 1000;

/** °C — single-step jump. */
const TEMP_SPIKE_WARN = 4;
const TEMP_SPIKE_CRIT = 9;
/** °C — last N points nearly identical → stuck sensor. */
const TEMP_FLAT_EPS = 0.02;
const FLAT_MIN_POINTS = 10;

/** pH / hour — linear slope magnitude. */
const PH_DRIFT_SLOPE_WARN = 0.1;
const PH_DRIFT_MIN_POINTS = 5;
const PH_DRIFT_MAX_WINDOW_MS = 6 * MS_HOUR;

const PH_FLAT_EPS = 0.008;

/** waterLevel is 0–100 (%). */
const LEVEL_DROP_WARN = 18;
const LEVEL_DROP_CRIT = 35;
const LEVEL_FLAT_EPS = 0.12;

const FLOW_PREV_ACTIVE = 8;
const FLOW_STALL_MAX = 0.5;
const FLOW_JUMP_WARN = 120;
const FLOW_FLAT_EPS = 0.01;

function linearSlopePhPerHour(pointsOldestFirst: HistoryPoint[]): number | null {
  if (pointsOldestFirst.length < 2) return null;
  const t0 = pointsOldestFirst[0]!.takenAt.getTime();
  const xs = pointsOldestFirst.map((p) => (p.takenAt.getTime() - t0) / MS_HOUR);
  const ys = pointsOldestFirst.map((p) => p.value);
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - meanX;
    const dy = ys[i]! - meanY;
    sxx += dx * dx;
    sxy += dx * dy;
  }
  if (sxx < 1e-12) return null;
  return sxy / sxx;
}

function newestSliceOldestFirst(newestFirst: HistoryPoint[], count: number): HistoryPoint[] {
  const slice = newestFirst.slice(0, Math.min(count, newestFirst.length));
  return [...slice].reverse();
}

function isFlatBand(pointsOldestFirst: HistoryPoint[], epsilon: number): boolean {
  if (pointsOldestFirst.length < 2) return false;
  const vals = pointsOldestFirst.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  return max - min <= epsilon;
}

function inDriftWindowOldestFirst(newestFirst: HistoryPoint[], windowMs: number, now: Date): HistoryPoint[] {
  const cutoff = now.getTime() - windowMs;
  const asc = [...newestFirst].reverse();
  return asc.filter((p) => p.takenAt.getTime() >= cutoff);
}

export function evaluateHeuristicsForSensor(
  sensorKey: string,
  historyNewestFirst: HistoryPoint[],
  now: Date
): HeuristicFinding[] {
  const out: HeuristicFinding[] = [];

  if (historyNewestFirst.length < 1) {
    return out;
  }

  const latest = historyNewestFirst[0]!;
  const prev = historyNewestFirst[1];

  switch (sensorKey) {
    case "temperature": {
      if (prev) {
        const delta = Math.abs(latest.value - prev.value);
        if (delta >= TEMP_SPIKE_CRIT) {
          out.push({
            type: "temperature_spike",
            severity: "critical",
            message: `Temperature jumped ${delta.toFixed(1)}°C since the previous reading (≥ ${TEMP_SPIKE_CRIT}°C threshold).`
          });
        } else if (delta >= TEMP_SPIKE_WARN) {
          out.push({
            type: "temperature_spike",
            severity: "warning",
            message: `Temperature changed ${delta.toFixed(1)}°C since the previous reading (≥ ${TEMP_SPIKE_WARN}°C threshold).`
          });
        }
      }

      const flatSlice = newestSliceOldestFirst(historyNewestFirst, FLAT_MIN_POINTS);
      if (flatSlice.length >= FLAT_MIN_POINTS && isFlatBand(flatSlice, TEMP_FLAT_EPS)) {
        out.push({
          type: "temperature_flatline",
          severity: "warning",
          message: `Temperature is nearly flat across the last ${flatSlice.length} readings (≤ ${TEMP_FLAT_EPS}°C spread) — sensor may be stuck.`
        });
      }
      break;
    }
    case "ph": {
      const driftPts = inDriftWindowOldestFirst(historyNewestFirst, PH_DRIFT_MAX_WINDOW_MS, now);
      if (driftPts.length >= PH_DRIFT_MIN_POINTS) {
        const slope = linearSlopePhPerHour(driftPts);
        if (slope != null && Math.abs(slope) >= PH_DRIFT_SLOPE_WARN) {
          out.push({
            type: "ph_drift",
            severity: "warning",
            message: `pH is drifting about ${Math.abs(slope).toFixed(3)} pH units per hour over recent readings (threshold ${PH_DRIFT_SLOPE_WARN}).`
          });
        }
      }

      const flatSlice = newestSliceOldestFirst(historyNewestFirst, FLAT_MIN_POINTS);
      if (flatSlice.length >= FLAT_MIN_POINTS && isFlatBand(flatSlice, PH_FLAT_EPS)) {
        out.push({
          type: "ph_flatline",
          severity: "warning",
          message: `pH is nearly unchanged across the last ${flatSlice.length} readings (≤ ${PH_FLAT_EPS} spread) — probe may be stuck.`
        });
      }
      break;
    }
    case "waterLevel": {
      if (prev && prev.value - latest.value >= LEVEL_DROP_CRIT) {
        out.push({
          type: "water_level_issue",
          severity: "critical",
          message: `Water level dropped ${(prev.value - latest.value).toFixed(0)} percentage points in one step (≥ ${LEVEL_DROP_CRIT}).`
        });
      } else if (prev && prev.value - latest.value >= LEVEL_DROP_WARN) {
        out.push({
          type: "water_level_issue",
          severity: "warning",
          message: `Water level dropped ${(prev.value - latest.value).toFixed(0)} percentage points in one step (≥ ${LEVEL_DROP_WARN}).`
        });
      }

      const flatSlice = newestSliceOldestFirst(historyNewestFirst, FLAT_MIN_POINTS);
      if (flatSlice.length >= FLAT_MIN_POINTS && isFlatBand(flatSlice, LEVEL_FLAT_EPS)) {
        out.push({
          type: "water_level_flatline",
          severity: "warning",
          message: `Water level is nearly flat across the last ${flatSlice.length} readings — level sensor may be stuck.`
        });
      }
      break;
    }
    case "waterFlow": {
      if (prev) {
        if (prev.value >= FLOW_PREV_ACTIVE && latest.value <= FLOW_STALL_MAX) {
          out.push({
            type: "water_flow_issue",
            severity: "warning",
            message: `Water flow fell from ${prev.value.toFixed(1)} to ${latest.value.toFixed(1)} L/min — possible pump or blockage issue.`
          });
        } else {
          const jump = Math.abs(latest.value - prev.value);
          if (jump >= FLOW_JUMP_WARN) {
            out.push({
              type: "water_flow_issue",
              severity: "warning",
              message: `Water flow changed by ${jump.toFixed(1)} L/min between consecutive readings (≥ ${FLOW_JUMP_WARN}).`
            });
          }
        }
      }

      const flatSlice = newestSliceOldestFirst(historyNewestFirst, FLAT_MIN_POINTS);
      if (flatSlice.length >= FLAT_MIN_POINTS && isFlatBand(flatSlice, FLOW_FLAT_EPS)) {
        out.push({
          type: "water_flow_flatline",
          severity: "warning",
          message: `Water flow is nearly identical across the last ${flatSlice.length} readings — flow sensor may be stuck.`
        });
      }
      break;
    }
    default:
      break;
  }

  return out;
}

/** All heuristic alert `type` values we may create for a sensor (for resolve-on-disable). */
export function heuristicTypesForSensor(sensorKey: string): string[] {
  switch (sensorKey) {
    case "temperature":
      return ["temperature_spike", "temperature_flatline"];
    case "ph":
      return ["ph_drift", "ph_flatline"];
    case "waterLevel":
      return ["water_level_issue", "water_level_flatline"];
    case "waterFlow":
      return ["water_flow_issue", "water_flow_flatline"];
    default:
      return [];
  }
}
