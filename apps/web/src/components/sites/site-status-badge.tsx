import { CheckCircle2, CircleHelp } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "~/components/ui/badge";
import { SiteStatus } from "~/gql/generated/graphql";

interface SiteStatusBadgeProps {
  status: SiteStatus;
}

export function SiteStatusBadge({ status }: SiteStatusBadgeProps) {
  const { t } = useTranslation();
  if (status === SiteStatus.Ok) {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        {t("siteStatusBadge.ok")}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <CircleHelp className="h-3 w-3" />
      {t("siteStatusBadge.unknown")}
    </Badge>
  );
}
