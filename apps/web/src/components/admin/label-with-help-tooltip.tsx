import { CircleHelp } from "lucide-react";

import { Label } from "~/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "~/components/ui/tooltip";
import { cn } from "~/utils/cn";

export interface LabelWithHelpTooltipProps {
  label: string;
  tooltip: string;
  htmlFor?: string;
  className?: string;
  tooltipAriaLabel?: string;
}

export function LabelWithHelpTooltip({
  label,
  tooltip,
  htmlFor,
  className,
  tooltipAriaLabel
}: LabelWithHelpTooltipProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Label htmlFor={htmlFor} className="text-xs leading-none">
        {label}
      </Label>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex shrink-0 rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={tooltipAriaLabel ?? label}
            >
              <CircleHelp className="h-3.5 w-3.5" aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-sm text-xs leading-relaxed">
            <p className="whitespace-pre-line">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
