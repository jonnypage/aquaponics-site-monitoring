import type { User } from "@aquaponics/db";
import type { Request, Response } from "express";

export interface GqlContext {
  req: Request;
  res: Response;
  currentUser: User | null;
}
