## Effect SQL Inline Migrations

A migration loader that doesn't consult the filesystem when fetching database migrations.

## When is this useful?

This is useful whenever you have a use case where filesystem access is too slow when running migrations.

For example, consider a use case where each tenant has its own database. When rolling out a new release, you need to ensure that migrations are applied for every tenant. Doing this from the outside can be too cumbersome and error-prone, so you might decide to perform the migration on each request that hits the respective tenant. Sounds crazy, right? Well, when utilizing the filesystem, it would be crazy, yes. The built-in filesystem loader can add around 50 ms to every request, which would be unacceptable in most scenarios.

By inlining the migrations (and therefore not accessing the filesystem), it is possible to execute the migrations in 2 ms. Adding 2 ms to every request sounds acceptable. (Disclaimer: I was using SQLite for the benchmark).

## Usage

This loader is a drop-in replacement. Simply swap the `⁠fromFileSystem` loader that comes with the respective `⁠@effect/sql` database adapter for the `⁠fromArray` loader included in this package.

```ts
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
```

As your migrations grow, you can separate them into their own files and import them to create the ⁠migrations array.

## License

MIT License