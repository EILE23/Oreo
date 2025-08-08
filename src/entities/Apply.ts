import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  Unique,
} from "@mikro-orm/core";
import { User } from "./User";
import { Class } from "./Class";

export enum ApplyStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

@Entity()
export class Apply {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Class)
  class!: Class;

  @ManyToOne(() => User)
  user!: User;

  @Property({ type: "string" })
  status: ApplyStatus = ApplyStatus.PENDING;

  @Property()
  createdAt: Date = new Date();
}
