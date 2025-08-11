// entities/Class.ts
import {
  Entity,
  PrimaryKey,
  Property,
  OneToMany,
  Collection,
} from "@mikro-orm/core";
import { Apply } from "./Apply";

@Entity()
export class Class {
  @PrimaryKey()
  id!: number;

  @Property()
  title!: string;

  @Property({ type: "text" })
  description!: string;

  @Property()
  startAt!: Date;

  @Property()
  endAt!: Date;

  @Property()
  maxParticipants!: number;

  @Property()
  hostId!: number;

  // 현재까지 신청된 인원 수
  @Property({ default: 0 })
  seatsTaken: number = 0;

  @Property({ version: true })
  version: number = 1;

  @OneToMany(() => Apply, (apply: Apply) => apply.class)
  applies = new Collection<Apply>(this);
}
