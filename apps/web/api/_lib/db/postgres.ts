import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let sql: NeonQueryFunction<false, false> | undefined;

export function getSql(databaseUrl: string): NeonQueryFunction<false, false> {
  if (!sql) {
    sql = neon(databaseUrl);
  }
  return sql;
}

export function resetSqlForTests(): void {
  sql = undefined;
}

export function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}
