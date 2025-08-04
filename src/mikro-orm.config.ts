import { SqliteDriver } from "@mikro-orm/sqlite";
import { Options } from "@mikro-orm/core";
import { User } from "./entities/User";

const config: Options<SqliteDriver> = {
  driver: SqliteDriver,
  dbName: "./db/oreo.db",
  entities: [User],
  debug: true,
};

export default config;
