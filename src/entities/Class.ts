import {
  Entity,
  PrimaryKey,
  Property,
  OneToMany,
  Collection,
} from "@mikro-orm/core";
import { Apply } from "./Apply"; // 유저 신청 엔티티

@Entity()
export class Class {
  @PrimaryKey()
  id!: number;

  @Property()
  title!: string;

  @Property({ type: "text" })
  description!: string;

  @Property()
  startDate!: Date;

  @Property()
  endDate!: Date;

  @Property()
  maxCapacity!: number;

  @OneToMany(() => Apply, (apply: Apply) => apply.class)
  applies = new Collection<Apply>(this);
}
