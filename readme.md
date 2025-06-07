# Effect SQL Inline Migrations

A migration loader that doesn't consult the filesystem for fetching your database migrations.

## When is this useful?

Whenever you have a use case where the filesystem is too slow.

For example, I had a use case where each tenant has its own SQLite database. Now, when I'm rolling out a new release, I have to ensure that the migrations get applied for every tenant. Doing that from the outside is too cumbersome and error-prone. I decided to perform the migration on each request that hits the respective tenant. Sounds crazy, right? Well, when utilizing the filesystem, it would be crazy, yes. I encountered that using the built-in [filesystem loader](https://github.com/Effect-TS/effect/tree/main/packages/sql#migrations) adds around 120 ms to every request. This would be unacceptable for sure.

By inlining the migrations (and therefore not reaching for the filesystem), I was able to execute the migrations in 2 ms. So, in my opinion, adding 2 ms to every request sounds acceptable to me.

## Usage

Using this loader is a drop-in replacement. You just swap the `fromFileSystem` loader that comes with the respective `@effect/sql` database adapter for the `fromArray` loader that is included in this very package.

```typescript
import { Config, Effect, Layer, pipe } from "effect";
import { LibsqlClient, LibsqlMigrator } from "@effect/sql-libsql";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { SqlClient } from "@effect/sql";
import { fromArray } from "src/mod.js";

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

When your migrations are growing, you can separate them into their own files and import them accordingly in order to create the `migrations` array.