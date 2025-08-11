import { Entity, PrimaryKey, Property } from "@mikro-orm/core";

@Entity()
export class User {
  @PrimaryKey()
  id!: number;

  @Property({ unique: true })
  email!: string;

  @Property()
  password!: string;

  @Property()
  name!: string;

  @Property({ default: false })
  isAdmin: boolean = false;

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
