import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { SensorIcon } from "~/components/sensor-icon";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/utils/cn";

export interface AdminSensorCatalogCardProps {
  sensorKey: string;
  displayName: string;
  unit: string;
  icon?: string | null;
  className?: string;
}

export function AdminSensorCatalogCard({
  sensorKey,
  displayName,
  unit,
  icon,
  className
}: AdminSensorCatalogCardProps) {
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
          <p className="min-w-0 flex-1 truncate text-sm font-medium group-hover:text-primary">
            {displayName}{" "}
            <span className="font-normal text-muted-foreground">({unit})</span>
          </p>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </CardContent>
      </Card>
    </Link>
  );
}
