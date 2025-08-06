import { Options } from "@mikro-orm/core";
import { SqliteDriver } from "@mikro-orm/sqlite";
import { User } from "./entities/User";
import { Class } from "./entities/Class";
import { Apply } from "./entities/Apply";

const testConfig: Options<SqliteDriver> = {
  driver: SqliteDriver,
  dbName: ":memory:", // 메모리 DB로 빠르게 테스트용
  entities: [User, Class, Apply],
  debug: false,
  allowGlobalContext: true,
};

export default testConfig;
