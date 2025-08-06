import { Entity, PrimaryKey, Property, ManyToOne } from "@mikro-orm/core";
import { User } from "./User";
import { Class } from "./Class";

@Entity()
export class Apply {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => User)
  user!: User; // 신청한 유저

  @ManyToOne(() => Class)
  class!: Class; // 신청한 클래스

  @Property({ onCreate: () => new Date() })
  createdAt!: Date;
}
