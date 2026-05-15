import { z } from "zod";

export const ingestBodySchema = z.object({
  deviceId: z.string().min(1),
  timestamp: z.string().refine((s) => s.endsWith("Z") && Number.isFinite(Date.parse(s)), {
    message: "timestamp must be ISO 8601 UTC with Z suffix"
  }),
  readings: z.record(z.string(), z.unknown()).superRefine((readings, ctx) => {
    const keys = Object.keys(readings);
    if (keys.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "at least one reading is required"
      });
      return;
    }
    for (const key of keys) {
      const v = readings[key];
      if (typeof v !== "number" || !Number.isFinite(v)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `reading "${key}" must be a finite number`,
          path: ["readings", key]
        });
      }
    }
  })
});

export type IngestBody = z.infer<typeof ingestBodySchema>;
