import { Config, Effect, Layer, pipe } from "effect";
import { LibsqlClient, LibsqlMigrator } from "@effect/sql-libsql";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { SqlClient } from "@effect/sql";
import { fromArray } from "@akoenig/effect-sql-inline-migrations";

const SqlLive = LibsqlClient.layerConfig({
  url: Config.succeed("file:scratchpad.db"),
});

const MigratorLive = LibsqlMigrator.layer({
  loader: fromArray([
    {
      name: "001_create_users_table",
      effect: Effect.flatMap(
        SqlClient.SqlClient,
        (sql) => sql`
            CREATE TABLE users (
              id serial PRIMARY KEY,
              name varchar(255) NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
          `,
      ),
    },
    {
      name: "002_create_tasks_table",
      effect: Effect.flatMap(
        SqlClient.SqlClient,
        (sql) => sql`
            CREATE TABLE tasks (
              id serial PRIMARY KEY,
              description varchar(255) NOT NULL,
              created_at TEXT NOT NULL
            )
          `,
      ),
    },
    {
      name: "003_drop_tasks_table",
      effect: Effect.flatMap(
        SqlClient.SqlClient,
        (sql) => sql`
            DROP TABLE tasks;
        `,
      ),
    },
  ]),
}).pipe(Layer.provide(SqlLive));

const EnvLive = Layer.mergeAll(SqlLive, MigratorLive).pipe(
  Layer.provide(NodeContext.layer),
);

const program = Effect.gen(function* () {
  yield* Effect.log("Your program is running");
});

pipe(program, Effect.provide(EnvLive), NodeRuntime.runMain);
