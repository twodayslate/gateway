import { Hono } from "hono";
import { Error, ServiceAuthType } from "./types";
import { streamResponse } from "./utils";
import { AppContext, Bindings, Variables } from "./bindings";
import HeaderUtils from "./header_utils";
import analytics from "./middleware/analytics";
import validate from "./middleware/validate";
import cron from "./crons/cron";

export const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", analytics());
app.use("*", validate());

app.all("*", async (context: AppContext) => {
  const clone = context.req.raw.clone();
  const url = new URL(clone.url);
  const token = context.get("token");

  // Get the x-gateway-* headers
  const xGatewayServiceHost = clone.headers.get("x-gateway-service-host")!;
  const xGatewayServiceAuthKey = clone.headers.get("x-gateway-service-auth-key");
  const xGatewayServiceAuthType = clone.headers.get("x-gateway-service-auth-type");
  const xGatewayAuthorizationPrefix = clone.headers.get("x-gateway-service-auth-prefix");

  // Set the host to the proxied service host
  url.host = xGatewayServiceHost;

  // remove all x-gateway-* headers from the request
  const headers = new HeaderUtils(clone.headers).removeGatewayHeaders().get();
  const tokenValue = xGatewayAuthorizationPrefix ? `${xGatewayAuthorizationPrefix} ${token}` : token;

  if (!xGatewayServiceAuthKey) {
    return context.json(<Error>{ error: "x-gateway-service-auth-key is required!" });
  }

  switch (xGatewayServiceAuthType) {
    case ServiceAuthType.HEADER:
      headers.append(xGatewayServiceAuthKey, tokenValue);
      break;
    case ServiceAuthType.QUERY:
      url.searchParams.append(xGatewayServiceAuthKey, tokenValue);
      break;
    default:
      return context.json(<Error>{ error: "x-gateway-service-auth-type should be either of HEADER or QUERY" });
  }

  // Make the request to the designated service
  const response = await fetch(url, {
    method: clone.method,
    body: clone.body,
    headers: headers,
  });

  // If the response is not a stream forward it as it is.
  if (response.headers.get("Content-Type") !== "text/event-stream") {
    return response;
  }
  // If the response is a stream, forward it as a stream.
  return streamResponse(response.body);
});

export default {
  fetch: app.fetch,
  scheduled: cron,
};
