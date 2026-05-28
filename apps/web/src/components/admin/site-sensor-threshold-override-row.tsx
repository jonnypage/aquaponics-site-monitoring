import { ChevronRight, CircleDot } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { LabelWithHelpTooltip } from "~/components/admin/label-with-help-tooltip";
import { SensorIcon } from "~/components/sensor-icon";
import { EntityKeyBadge } from "~/components/ui/entity-key-badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/utils/cn";

export interface SiteSensorThresholdRowState {
  nm: string;
  nM: string;
  wd: string;
  cd: string;
}

export interface SiteSensorThresholdOverrideRowProps {
  sensorKey: string;
  /** Unique id for accordion panel (defaults to `sensorKey`). */
  rowId?: string;
  sensorLabel?: string;
  icon?: string | null;
  catalogPhysicalMin?: number | null;
  catalogPhysicalMax?: number | null;
  row: SiteSensorThresholdRowState;
  onChange: (next: SiteSensorThresholdRowState) => void;
}

function catalogDefaultText(
  value: number | null | undefined,
  unsetLabel: string,
  defaultLabel: string
): string {
  if (value == null) {
    return `${defaultLabel}: ${unsetLabel}`;
  }
  return `${defaultLabel}: ${value}`;
}

export function SiteSensorThresholdOverrideRow({
  sensorKey,
  rowId,
  sensorLabel,
  icon,
  catalogPhysicalMin,
  catalogPhysicalMax,
  row,
  onChange
}: SiteSensorThresholdOverrideRowProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const panelId = rowId ?? sensorKey;
  const defaultLabel = t("admin.sites.catalogDefaultLabel");
  const unset = t("admin.sites.catalogDefaultNone");
  const title = sensorLabel ?? sensorKey;

  return (
    <div className="min-w-0 w-full rounded-md border">
      <button
        type="button"
        className="flex w-full min-w-0 items-center gap-2 rounded-md p-3 text-left hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-expanded={expanded}
        aria-controls={`threshold-panel-${panelId}`}
        onClick={() => setExpanded((open) => !open)}
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-90"
          )}
          aria-hidden
        />
        {icon?.trim() ? (
          <SensorIcon name={icon} className="h-5 w-5 shrink-0 text-muted-foreground" />
        ) : (
          <CircleDot className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">
          {sensorLabel && sensorLabel !== sensorKey ? (
            <>
              <span className="truncate">{sensorLabel}</span>
              <EntityKeyBadge>{sensorKey}</EntityKeyBadge>
            </>
          ) : (
            <EntityKeyBadge>{sensorKey}</EntityKeyBadge>
          )}
        </span>
        <span className="sr-only">
          {expanded
            ? t("admin.sites.thresholdAccordionCollapse", { sensor: title })
            : t("admin.sites.thresholdAccordionExpand", { sensor: title })}
        </span>
      </button>
      {expanded ? (
        <div
          id={`threshold-panel-${panelId}`}
          className="border-t px-3 pb-3 pt-3"
        >
      <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:items-end">
        <div className="min-w-0 space-y-1">
          <Label className="text-xs leading-none">{t("admin.sites.normalMin")}</Label>
          <p className="text-[11px] leading-tight text-muted-foreground">
            {catalogDefaultText(catalogPhysicalMin, unset, defaultLabel)}
          </p>
          <Input
            className="h-9"
            value={row.nm}
            onChange={(e) => onChange({ ...row, nm: e.target.value })}
          />
        </div>
        <div className="min-w-0 space-y-1">
          <Label className="text-xs leading-none">{t("admin.sites.normalMax")}</Label>
          <p className="text-[11px] leading-tight text-muted-foreground">
            {catalogDefaultText(catalogPhysicalMax, unset, defaultLabel)}
          </p>
          <Input
            className="h-9"
            value={row.nM}
            onChange={(e) => onChange({ ...row, nM: e.target.value })}
          />
        </div>
        <div className="min-w-0 space-y-1">
          <LabelWithHelpTooltip
            label={t("admin.sites.warningDelta")}
            tooltip={t("admin.sites.warningDeltaHelp")}
            tooltipAriaLabel={t("admin.sites.thresholdFieldHelp", {
              field: t("admin.sites.warningDelta")
            })}
          />
          <p className="text-[11px] leading-tight text-transparent select-none" aria-hidden>
            {catalogDefaultText(null, unset, defaultLabel)}
          </p>
          <Input
            className="h-9"
            value={row.wd}
            onChange={(e) => onChange({ ...row, wd: e.target.value })}
          />
        </div>
        <div className="min-w-0 space-y-1">
          <LabelWithHelpTooltip
            label={t("admin.sites.criticalDelta")}
            tooltip={t("admin.sites.criticalDeltaHelp")}
            tooltipAriaLabel={t("admin.sites.thresholdFieldHelp", {
              field: t("admin.sites.criticalDelta")
            })}
          />
          <p className="text-[11px] leading-tight text-transparent select-none" aria-hidden>
            {catalogDefaultText(null, unset, defaultLabel)}
          </p>
          <Input
            className="h-9"
            value={row.cd}
            onChange={(e) => onChange({ ...row, cd: e.target.value })}
          />
        </div>
      </div>
        </div>
      ) : null}
    </div>
  );
}
