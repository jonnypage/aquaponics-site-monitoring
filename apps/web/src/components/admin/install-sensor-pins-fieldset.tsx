import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CircleDot } from "lucide-react";

import { SensorIcon } from "~/components/sensor-icon";
import { Button } from "~/components/ui/button";
import { EntityKeyBadge } from "~/components/ui/entity-key-badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { GpioPinInputFeedback } from "~/components/admin/gpio-pin-input-feedback";
import { cn } from "~/utils/cn";
import { formatAllowedGpioList, validateGpioForBoard, type DeviceBoardId } from "~/utils/device-board-gpio";
import type { InstallExtraWire, InstallSensorRow } from "~/utils/firmware-sensor-pins";
import { slugWireIdFromLabel } from "~/utils/sensor-wiring";
import { WireColorPicker } from "~/components/admin/wire-color-picker";
import { resolveWireColorCss } from "~/utils/wire-color";

export interface InstallSensorPinsFieldsetProps {
  board: DeviceBoardId;
  rows: InstallSensorRow[];
  onChange: (next: InstallSensorRow[]) => void;
  unassignedSite?: boolean;
}

export function InstallSensorPinsFieldset({
  board,
  rows,
  onChange,
  unassignedSite = false
}: InstallSensorPinsFieldsetProps) {
  const { t } = useTranslation();
  const [addingExtraFor, setAddingExtraFor] = useState<string | null>(null);
  const [extraLabel, setExtraLabel] = useState("");
  const [extraColor, setExtraColor] = useState("gray");

  function updateRow(sensorKey: string, patch: Partial<InstallSensorRow>) {
    onChange(rows.map((r) => (r.sensorKey === sensorKey ? { ...r, ...patch } : r)));
  }

  function setWireGpio(sensorKey: string, wireId: string, gpio: string) {
    const row = rows.find((r) => r.sensorKey === sensorKey);
    if (!row) {
      return;
    }
    updateRow(sensorKey, { wireMap: { ...row.wireMap, [wireId]: gpio } });
  }

  function confirmAddExtra(sensorKey: string) {
    const row = rows.find((r) => r.sensorKey === sensorKey);
    if (!row || !extraLabel.trim()) {
      return;
    }
    const max = row.wiringTemplate.maxExtraWires ?? 2;
    if (row.extraWires.length >= max) {
      return;
    }
    const id = slugWireIdFromLabel(extraLabel);
    const exists = row.extraWires.some((e) => e.id === id);
    if (exists) {
      return;
    }
    updateRow(sensorKey, {
      extraWires: [
        ...row.extraWires,
        { id, label: extraLabel.trim(), color: extraColor, gpio: "" }
      ]
    });
    setAddingExtraFor(null);
    setExtraLabel("");
    setExtraColor("gray");
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("admin.devices.installSensorsEmpty")}</p>
    );
  }

  return (
    <fieldset className="space-y-3 rounded-md border p-3">
      <legend className="px-1 text-sm font-medium">{t("admin.devices.installPins")}</legend>
      <p className="text-xs text-muted-foreground">
        {t("admin.devices.installGpioAllowedHint", { pins: formatAllowedGpioList(board) })}
      </p>
      {unassignedSite ? (
        <p className="text-xs text-muted-foreground">{t("admin.devices.installSensorsUnassignedHint")}</p>
      ) : null}
      <ul className="space-y-3">
        {rows.map((row) => {
          const canInclude = row.siteEnabled;
          const showWiring = canInclude && row.included;

          return (
            <li
              key={row.sensorKey}
              className={cn(
                "rounded-md border px-3 py-2",
                !row.siteEnabled && "opacity-50"
              )}
            >
              <label
                className={cn(
                  "flex items-center gap-2 text-sm",
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
                <span className="font-medium">{row.displayName}</span>
                <EntityKeyBadge>{row.sensorKey}</EntityKeyBadge>
              </label>

              {!row.siteEnabled ? (
                <p className="mt-2 text-xs text-muted-foreground">{t("admin.devices.installSensorOffAtSite")}</p>
              ) : null}

              {showWiring ? (
                <div className="mt-3 space-y-2 border-l-2 border-muted pl-3">
                  {row.wiringTemplate.wires.map((wire) => {
                    const gpioValue = row.wireMap[wire.id] ?? "";
                    const gpioValidation = validateGpioForBoard(board, gpioValue);
                    return (
                      <div key={wire.id} className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="h-4 w-4 shrink-0 rounded-full border border-border"
                            style={{ backgroundColor: resolveWireColorCss(wire.color) }}
                            title={wire.label}
                          />
                          <span className="min-w-[5rem] text-sm">{wire.label}</span>
                          <span className="text-xs text-muted-foreground">GPIO</span>
                          <Input
                            className={cn(
                              "w-20",
                              gpioValidation?.level === "error" && "border-destructive"
                            )}
                            inputMode="numeric"
                            aria-invalid={gpioValidation?.level === "error"}
                            aria-label={t("admin.devices.installMapWireGpio", { label: wire.label })}
                            value={gpioValue}
                            onChange={(e) => setWireGpio(row.sensorKey, wire.id, e.target.value)}
                          />
                          {wire.required === false ? (
                            <span className="text-xs text-muted-foreground">
                              ({t("admin.sensors.wiringOptional")})
                            </span>
                          ) : null}
                        </div>
                        <GpioPinInputFeedback board={board} value={gpioValue} />
                      </div>
                    );
                  })}

                  {row.extraWires.map((extra) => {
                    const gpioValidation = validateGpioForBoard(board, extra.gpio);
                    return (
                      <div key={extra.id} className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="h-4 w-4 shrink-0 rounded-full border"
                            style={{ backgroundColor: resolveWireColorCss(extra.color) }}
                          />
                          <span className="text-sm">{extra.label}</span>
                          <span className="text-xs text-muted-foreground">GPIO</span>
                          <Input
                            className={cn(
                              "w-20",
                              gpioValidation?.level === "error" && "border-destructive"
                            )}
                            inputMode="numeric"
                            aria-invalid={gpioValidation?.level === "error"}
                            value={extra.gpio}
                            onChange={(e) => {
                              updateRow(row.sensorKey, {
                                extraWires: row.extraWires.map((x) =>
                                  x.id === extra.id ? { ...x, gpio: e.target.value } : x
                                )
                              });
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              updateRow(row.sensorKey, {
                                extraWires: row.extraWires.filter((x) => x.id !== extra.id)
                              })
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <GpioPinInputFeedback board={board} value={extra.gpio} />
                      </div>
                    );
                  })}

                  {row.wiringTemplate.allowExtraWires &&
                  row.extraWires.length < (row.wiringTemplate.maxExtraWires ?? 2) ? (
                    addingExtraFor === row.sensorKey ? (
                      <div className="flex flex-wrap items-end gap-2 rounded-md bg-muted/40 p-2">
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs leading-none">{t("admin.devices.installExtraWireLabel")}</Label>
                          <Input value={extraLabel} onChange={(e) => setExtraLabel(e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs leading-none">{t("admin.sensors.wiringWireColor")}</Label>
                          <div className="flex h-10 items-center">
                            <WireColorPicker value={extraColor} onChange={setExtraColor} />
                          </div>
                        </div>
                        <div className="flex h-10 items-center gap-2">
                          <Button type="button" size="sm" onClick={() => confirmAddExtra(row.sensorKey)}>
                            {t("admin.sensors.wiringAddWire")}
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setAddingExtraFor(null)}>
                            {t("admin.shared.cancel")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAddingExtraFor(row.sensorKey)}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        {t("admin.devices.installAddWire")}
                      </Button>
                    )
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
