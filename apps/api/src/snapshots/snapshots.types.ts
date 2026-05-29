import { Field, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class DeviceSnapshotModel {
  @Field()
  id!: string;

  @Field()
  deviceId!: string;

  @Field(() => String, { nullable: true })
  deviceName?: string | null;

  @Field()
  siteId!: string;

  @Field()
  takenAt!: Date;

  @Field()
  ingestedAt!: Date;

  @Field()
  contentType!: string;

  @Field(() => Int)
  byteSize!: number;

  @Field()
  imageUrl!: string;
}
