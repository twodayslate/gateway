export type Bindings = {
  [key: string]: string | null | undefined
} & {
  DB: D1Database,
  DELETE_OLD_DATA_BEFORE: string
  DELETE_OLD_DATA_CRON: string
};
