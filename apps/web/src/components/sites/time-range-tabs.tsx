import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useTranslation } from "react-i18next";

import { TimeRange } from "~/gql/generated/graphql";

interface TimeRangeTabsProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

const RANGES: { value: TimeRange; labelKey: string }[] = [
  { value: TimeRange.Last_24H, labelKey: "timeRangeTabs.last24h" },
  { value: TimeRange.Last_7D, labelKey: "timeRangeTabs.last7d" },
  { value: TimeRange.Last_30D, labelKey: "timeRangeTabs.last30d" }
];

export function TimeRangeTabs({ value, onChange }: TimeRangeTabsProps) {
  const { t } = useTranslation();
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as TimeRange)}>
      <TabsList>
        {RANGES.map((r) => (
          <TabsTrigger key={r.value} value={r.value}>
            {t(r.labelKey)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
