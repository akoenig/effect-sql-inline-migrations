import type * as Sql from "@effect/sql";
import type { SqlError } from "@effect/sql/SqlError";
import type { Effect } from "effect";

export interface Migration {
  readonly name: string;
  readonly effect: Effect.Effect<
    readonly Sql.SqlConnection.Row[],
    SqlError,
    Sql.SqlClient.SqlClient
  >;
}

export type Migrations = Migration[];
