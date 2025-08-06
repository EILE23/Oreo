// src/mikro-orm.test.config.ts
import { Options } from "@mikro-orm/core";
import { SqliteDriver } from "@mikro-orm/sqlite";
import { User } from "./entities/User";
import { Class } from "./entities/Class";
import { Apply } from "./entities/Apply";

const testConfig: Options<SqliteDriver> = {
  driver: SqliteDriver,
  dbName: ":memory:",
  entities: [User, Class, Apply],
  debug: false,
  allowGlobalContext: true,
};

export default testConfig;
