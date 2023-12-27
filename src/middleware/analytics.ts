import { MiddlewareHandler } from "hono";
import D1 from "../d1";

function analytics(): MiddlewareHandler {
  return async (context, next) => {
    await next();
    // Asynchronously save analytics params
    context.executionCtx.waitUntil(new D1(context).saveAnalyticsParams());
  };
}

export default analytics;
