import type { Loader, ResolvedMigration } from "@effect/sql/Migrator";
import type { Migrations } from "./migration.js";

import * as Option from "effect/Option";

import { Effect } from "effect";

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

export type { Migrations };
