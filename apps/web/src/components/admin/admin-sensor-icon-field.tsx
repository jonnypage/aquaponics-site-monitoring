import { useTranslation } from "react-i18next";

import { SensorIcon } from "~/components/sensor-icon";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export const ICON_SUGGESTIONS = [
  "Thermometer",
  "FlaskConical",
  "Gauge",
  "Waves",
  "Droplets",
  "Activity",
  "WifiOff",
  "AlertTriangle"
] as const;

interface AdminSensorIconFieldProps {
  id: string;
  value: string;
  onChange: (next: string) => void;
}

export function AdminSensorIconField({ id, value, onChange }: AdminSensorIconFieldProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{t("admin.sensors.icon")}</Label>
      <div className="flex flex-wrap gap-2">
        {ICON_SUGGESTIONS.map((s) => (
          <Button key={s} type="button" variant="outline" size="sm" className="font-mono text-xs" onClick={() => onChange(s)}>
            {s}
          </Button>
        ))}
      </div>
      <Input
        id={id}
        className="font-mono"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("admin.sensors.iconPlaceholder")}
        autoComplete="off"
      />
      <p className="text-xs text-muted-foreground">
        {t("admin.sensors.iconHelp")}{" "}
        <a href="https://lucide.dev/icons" className="text-primary underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
          lucide.dev/icons
        </a>
      </p>
      <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
        <span>{t("admin.sensors.iconPreview")}</span>
        {value.trim() ? <SensorIcon name={value} className="h-5 w-5 shrink-0 text-foreground" /> : <span>—</span>}
      </div>
    </div>
  );
}
