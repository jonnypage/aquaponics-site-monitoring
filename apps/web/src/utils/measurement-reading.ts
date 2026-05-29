export function formatMeasurementReading(value: number, unit: string): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  let formatted: string;
  if (Number.isInteger(value)) {
    formatted = String(value);
  } else {
    const abs = Math.abs(value);
    if (abs >= 100) {
      formatted = value.toFixed(1);
    } else if (abs >= 10) {
      formatted = value.toFixed(2);
    } else {
      formatted = value.toFixed(3);
    }
  }
  const trimmedUnit = unit.trim();
  return trimmedUnit ? `${formatted} ${trimmedUnit}` : formatted;
}
