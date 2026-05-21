import { useTranslation } from "react-i18next";

import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { DurationUnit, DurationValue } from "~/utils/duration-input";

const UNITS: DurationUnit[] = ["seconds", "minutes", "hours"];

export interface DurationFieldProps {
  id: string;
  label: string;
  value: DurationValue;
  onChange: (next: DurationValue) => void;
}

export function DurationField({ id, label, value, onChange }: DurationFieldProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-amount`}>{label}</Label>
      <div className="flex flex-wrap gap-2">
        <Input
          id={`${id}-amount`}
          className="w-28"
          inputMode="numeric"
          min={1}
          value={value.amount}
          onChange={(e) => onChange({ ...value, amount: e.target.value })}
        />
        <select
          id={`${id}-unit`}
          aria-label={t("admin.devices.durationUnit")}
          className="flex h-10 min-w-[7rem] rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={value.unit}
          onChange={(e) => onChange({ ...value, unit: e.target.value as DurationUnit })}
        >
          {UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {t(`admin.devices.durationUnit_${unit}`)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
