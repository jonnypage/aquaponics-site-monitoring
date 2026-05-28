import { useTranslation } from "react-i18next";

import {
  formatAllowedGpioList,
  validateGpioForBoard,
  type DeviceBoardId,
  type GpioBlockReason
} from "~/utils/device-board-gpio";

function reasonMessageKey(reason: GpioBlockReason | "invalid" | "warning_gpio"): string {
  switch (reason) {
    case "flash":
      return "admin.devices.installGpioErrorFlash";
    case "boot":
      return "admin.devices.installGpioErrorBoot";
    case "serial":
      return "admin.devices.installGpioErrorSerial";
    case "out_of_range":
      return "admin.devices.installGpioErrorOutOfRange";
    case "board_unsupported":
      return "admin.devices.installGpioErrorBoardUnsupported";
    case "invalid":
      return "admin.devices.installGpioErrorInvalid";
    case "warning_gpio":
      return "admin.devices.installGpioWarnDiscouraged";
    default:
      return "admin.devices.installGpioErrorInvalid";
  }
}

export interface GpioPinInputFeedbackProps {
  board: DeviceBoardId;
  value: string;
}

export function GpioPinInputFeedback({ board, value }: GpioPinInputFeedbackProps) {
  const { t } = useTranslation();
  const validation = validateGpioForBoard(board, value);
  if (!validation) {
    return null;
  }

  const key = reasonMessageKey(validation.reason);
  const isError = validation.level === "error";

  return (
    <p
      className={isError ? "text-xs text-destructive" : "text-xs text-amber-600 dark:text-amber-500"}
      role={isError ? "alert" : "status"}
    >
      {t(key, {
        gpio: validation.gpio >= 0 ? validation.gpio : undefined,
        pins: formatAllowedGpioList(board)
      })}
    </p>
  );
}
