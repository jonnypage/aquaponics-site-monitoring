import { z } from "zod";

export const checkinBodySchema = z.object({
  deviceId: z.string().min(1),
  timestamp: z.string().refine((s) => s.endsWith("Z") && Number.isFinite(Date.parse(s)), {
    message: "timestamp must be ISO 8601 UTC with Z suffix"
  })
});

export type CheckinBody = z.infer<typeof checkinBodySchema>;
