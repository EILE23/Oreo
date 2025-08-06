// mikro-orm.config.ts
import { SqliteDriver } from "@mikro-orm/sqlite";
import { Options, EntityManager, MikroORM } from "@mikro-orm/core";
import { User } from "./entities/User";
import { Class } from "./entities/Class";
import { Apply } from "./entities/Apply";

// DI 객체 선언
export const DI = {} as {
  orm: MikroORM;
  em: EntityManager;
};

const config: Options<SqliteDriver> = {
  driver: SqliteDriver,
  dbName: "./db/oreo.db",
  entities: [User, Class, Apply], // 엔티티 추가
  debug: true,
};

export default config;
