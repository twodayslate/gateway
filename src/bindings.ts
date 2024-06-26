import { Context } from "hono";

/**
 * Bindings are the environment variables that are set by the Cloudflare Worker.
 */
export type Bindings = {
  [key: string]: string | null | undefined;
} & {
  DB: D1Database;
  DELETE_OLD_DATA_BEFORE: string;
  DELETE_OLD_DATA_CRON: string;
};

/**
 * Variables are the environment variables that are set by one of the middleware functions.
 * They are available in the Hono context throughout the request lifecycle.
 */
export type Variables = {
  token: string;
};

export type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>;
