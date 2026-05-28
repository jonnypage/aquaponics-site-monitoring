import { registerEnumType } from "@nestjs/graphql";

export enum SensorType {
  temperature = "temperature",
  ph = "ph",
  waterLevel = "waterLevel",
  waterFlow = "waterFlow"
}

registerEnumType(SensorType, { name: "SensorType" });
