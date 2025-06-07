import type { Loader, ResolvedMigration } from "@effect/sql/Migrator";
import type * as Sql from "@effect/sql";
import type { SqlError } from "@effect/sql/SqlError";

import * as Option from "effect/Option";
import { Effect } from "effect";

interface Migration {
  readonly name: string;
  readonly effect: Effect.Effect<
    readonly Sql.SqlConnection.Row[],
    SqlError,
    Sql.SqlClient.SqlClient
  >;
}

export type Migrations = Migration[];

export const fromArray = (migrations: Migrations): Loader => {
  return Effect.succeed(
    migrations
      .map((migration) => ({
        name: Option.fromNullable(migration.name.match(/^(\d+)_([^.]+)$/)),
        effect: migration.effect,
      }))
      .flatMap((migration) =>
        Option.match(migration.name, {
          onNone: () => [],
          onSome: ([_base, id, name]): ReadonlyArray<ResolvedMigration> => {
            return [[Number(id), name, Effect.succeed(migration.effect)]];
          },
        }),
      )
      .sort(([a], [b]) => a - b),
  );
};
