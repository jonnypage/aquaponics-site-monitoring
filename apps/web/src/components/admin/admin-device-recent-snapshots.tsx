import { Camera } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { EntityKeyBadge } from "~/components/ui/entity-key-badge";
import { useRelativeTimeTick } from "~/hooks/useRelativeTimeTick";
import { formatRelativeTime } from "~/utils/format";

export interface DeviceSnapshotRow {
  id: string;
  takenAt: string | Date;
  imageUrl: string;
  byteSize: number;
}

interface AdminDeviceRecentSnapshotsProps {
  deviceId: string;
  snapshots: readonly DeviceSnapshotRow[];
}

function formatByteSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AdminDeviceRecentSnapshots({ deviceId, snapshots }: AdminDeviceRecentSnapshotsProps) {
  const { t } = useTranslation();
  useRelativeTimeTick();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-muted-foreground" aria-hidden />
          <CardTitle className="text-base">{t("admin.devices.recentSnapshotsTitle")}</CardTitle>
        </div>
        <CardDescription>{t("admin.devices.recentSnapshotsDescription", { deviceId })}</CardDescription>
      </CardHeader>
      <CardContent>
        {snapshots.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("admin.devices.recentSnapshotsEmpty")}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {snapshots.map((snap) => (
              <li key={snap.id} className="min-w-0 space-y-2 rounded-md border border-border p-2">
                <a href={snap.imageUrl} target="_blank" rel="noreferrer" className="block">
                  <img
                    src={snap.imageUrl}
                    alt={t("admin.devices.recentSnapshotsImageAlt")}
                    className="aspect-video w-full rounded-md border bg-muted/30 object-contain"
                  />
                </a>
                <p className="text-xs text-muted-foreground">
                  {t("admin.devices.recentSnapshotsCaptured", {
                    time: formatRelativeTime(new Date(snap.takenAt))
                  })}
                  {" · "}
                  {formatByteSize(snap.byteSize)}
                </p>
                <EntityKeyBadge className="text-xs">{snap.id}</EntityKeyBadge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
