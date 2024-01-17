export enum ServiceAuthType {
  HEADER = "HEADER",
  QUERY = "QUERY",
}

export type Error = {
  error: string;
};

export type D1ResultMeta = {
  served_by: string,
  duration: number,
  changes: number,
  last_row_id: number,
  changed_db: boolean,
  size_after: number
}
