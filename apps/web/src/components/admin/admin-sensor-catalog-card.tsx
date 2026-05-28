import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SensorIcon } from "~/components/sensor-icon";
import { Card, CardContent } from "~/components/ui/card";
import { EntityKeyBadge } from "~/components/ui/entity-key-badge";
import { cn } from "~/utils/cn";
import { sensorTypeLabelKey } from "~/utils/sensor-display-label";
import type { SensorType } from "~/utils/sensor-types";

export interface AdminSensorCatalogCardProps {
  sensorKey: string;
  sensorType: SensorType;
  model: string;
  displayName: string;
  unit: string;
  icon?: string | null;
  className?: string;
}

export function AdminSensorCatalogCard({
  sensorKey,
  sensorType,
  model,
  displayName,
  unit,
  icon,
  className
}: AdminSensorCatalogCardProps) {
  const { t } = useTranslation();

  return (
    <Link
      to="/admin/sensors/$sensorKey/edit"
      params={{ sensorKey }}
      className={cn("group block min-w-0", className)}
    >
      <Card className="h-full transition-colors hover:bg-accent/50">
        <CardContent className="flex items-center gap-3 py-4">
          {icon ? (
            <SensorIcon name={icon} className="h-5 w-5 shrink-0 text-muted-foreground" />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium group-hover:text-primary">
              {t(sensorTypeLabelKey(sensorType))}{" "}
              <span className="font-normal text-muted-foreground">({model})</span>
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {displayName} · {unit}
            </p>
            <EntityKeyBadge className="mt-1">{sensorKey}</EntityKeyBadge>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </CardContent>
      </Card>
    </Link>
  );
}
