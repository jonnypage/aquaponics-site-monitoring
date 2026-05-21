import { useTranslation } from "react-i18next";

import { CircleDot } from "lucide-react";

import { SensorIcon } from "~/components/sensor-icon";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/utils/cn";
import type { InstallSensorRow } from "~/utils/firmware-sensor-pins";

export interface InstallSensorPinsFieldsetProps {
  rows: InstallSensorRow[];
  onChange: (next: InstallSensorRow[]) => void;
  unassignedSite?: boolean;
}

export function InstallSensorPinsFieldset({
  rows,
  onChange,
  unassignedSite = false
}: InstallSensorPinsFieldsetProps) {
  const { t } = useTranslation();

  function updateRow(sensorKey: string, patch: Partial<InstallSensorRow>) {
    onChange(rows.map((r) => (r.sensorKey === sensorKey ? { ...r, ...patch } : r)));
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("admin.devices.installSensorsEmpty")}</p>
    );
  }

  return (
    <fieldset className="space-y-3 rounded-md border p-3">
      <legend className="px-1 text-sm font-medium">{t("admin.devices.installPins")}</legend>
      {unassignedSite ? (
        <p className="text-xs text-muted-foreground">{t("admin.devices.installSensorsUnassignedHint")}</p>
      ) : null}
      <ul className="space-y-2">
        {rows.map((row) => {
          const canInclude = row.siteEnabled;
          const showPin = canInclude && row.included;

          return (
            <li
              key={row.sensorKey}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-md border border-transparent px-1 py-1",
                !row.siteEnabled && "opacity-50"
              )}
            >
              <label
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 text-sm",
                  canInclude ? "cursor-pointer" : "cursor-not-allowed"
                )}
              >
                <input
                  type="checkbox"
                  className="rounded border-input"
                  checked={row.included}
                  disabled={!canInclude}
                  onChange={(e) => updateRow(row.sensorKey, { included: e.target.checked })}
                />
                {row.icon?.trim() ? (
                  <SensorIcon name={row.icon} className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <CircleDot className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <span className="truncate font-medium">{row.displayName}</span>
                <span className="font-mono text-xs text-muted-foreground">{row.sensorKey}</span>
              </label>
              {!row.siteEnabled ? (
                <span className="text-xs text-muted-foreground">{t("admin.devices.installSensorOffAtSite")}</span>
              ) : showPin ? (
                <div className="flex items-center gap-2">
                  <Label className="sr-only" htmlFor={`pin-${row.sensorKey}`}>
                    {t("admin.devices.installPinGpio", { sensor: row.displayName })}
                  </Label>
                  <span className="text-xs text-muted-foreground">GPIO</span>
                  <Input
                    id={`pin-${row.sensorKey}`}
                    className="w-20"
                    inputMode="numeric"
                    value={row.pin}
                    onChange={(e) => updateRow(row.sensorKey, { pin: e.target.value })}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
