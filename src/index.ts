import { Context, Hono } from "hono";
import { Error, ServiceAuthType } from "./types";
import { streamResponse } from "./utils";
import { Bindings } from "./bindings";
import HeaderUtils from "./header_utils";
import analytics from "./middleware/analytics";
import cron from "./crons/cron";

export const app = new Hono<{ Bindings: Bindings }>();

app.use("*", analytics());

app.all("*", async (context: Context<{Bindings: Bindings}>) => {
  // Clone the request
  const clone = context.req.raw.clone();

  // Get the x-gateway-* headers
  const xGatewayServiceHost = clone.headers.get("x-gateway-service-host");
  const xGatewayServiceToken = clone.headers.get("x-gateway-service-token");
  const xGatewayServiceAuthKey = clone.headers.get("x-gateway-service-auth-key");
  const xGatewayServiceAuthType = clone.headers.get("x-gateway-service-auth-type");
  const xGatewayAuthorizationType = clone.headers.get("x-gateway-service-auth-prefix");

  // Create a new URL object from the cloned request URL
  const url = new URL(clone.url);

  if (!xGatewayServiceHost) {
    return context.json(<Error>{ error: "x-gateway-service-host header is required." }, 400);
  }

  // Set the host to the proxied service host
  url.host = xGatewayServiceHost;

  // If the service token is not provided in the request headers, try to get it from the environment variables.
  // The environment variable name is the service host name in uppercase with all non-alphanumeric characters replaced with "_".
  const apiKey = `${url.host.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase()}_API_KEY`;
  const token = xGatewayServiceToken || context.env[apiKey];

  if (!token) {
    return context.json(
      <Error>{
        error: "Cannot find API key for proxied service! Either provide it in the request headers or set it as an environment variable.",
      },
      400,
    );
  }

  // remove all x-gateway-* headers from the request
  const filteredHeaders = new HeaderUtils(clone.headers).removeGatewayHeaders().get();

  // create a new headers object with the filtered headers
  const headers = new Headers(filteredHeaders);

  const tokenValue = xGatewayAuthorizationType ? `${xGatewayAuthorizationType} ${token}` : token;
  if (xGatewayServiceAuthKey && xGatewayServiceAuthType === ServiceAuthType.HEADER) {
    headers.append(xGatewayServiceAuthKey, tokenValue);
  } else if (xGatewayServiceAuthKey && xGatewayServiceAuthType === ServiceAuthType.QUERY) {
    url.searchParams.append(xGatewayServiceAuthKey, tokenValue);
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
