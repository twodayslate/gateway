import { Hono } from "hono";
import { Error, ServiceAuthType } from "./types";
import { streamResponse } from "./utils";
import { Bindings } from "./bindings";
import D1 from "./d1";
import HeaderUtils from "./header_utils";

const app = new Hono<{ Bindings: Bindings }>();

app
  .all("*",
    async (context) => {
      // Clone the request
      const clone = context.req.raw.clone();

      // Get the x-gateway-* headers
      const xGatewayServiceHost = clone.headers.get("x-gateway-service-host");
      const xGatewayServiceToken = clone.headers.get("x-gateway-service-token");
      const xGatewayServiceAuthKey = clone.headers.get("x-gateway-service-auth-key");
      const xGatewayServiceAuthType = clone.headers.get("x-gateway-service-auth-type");

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
        return context.json(<Error>{
          error: "Cannot find API key for proxied service! Either provide it in the request headers or set it as an environment variable."
        }, 400);
      }

      // remove all x-gateway-* headers from the request
      const filteredHeaders = new HeaderUtils(clone.headers).removeGatewayHeaders().get();

      // create a new headers object with the filtered headers
      const headers = new Headers(filteredHeaders);

      if (xGatewayServiceAuthKey && xGatewayServiceAuthType === ServiceAuthType.HEADER) {
        const value = xGatewayServiceAuthKey.toLowerCase() === "authorization" ? `Bearer ${token}` : token;
        headers.append(xGatewayServiceAuthKey, value);
      } else if (xGatewayServiceAuthKey && xGatewayServiceAuthType === ServiceAuthType.QUERY) {
        url.searchParams.append(xGatewayServiceAuthKey, token);
      }

      // Make the request to the designated service
      const response = await fetch(url, {
        method: clone.method,
        body: clone.body ? JSON.stringify(await clone.json()) : null,
        headers: headers,
      });

      // Save analytics params
      context.executionCtx.waitUntil(new D1(context).saveAnalyticsParams(response));

      // If the response is not a stream forward it as it is.
      if (response.headers.get("Content-Type") !== "text/event-stream") {
        return response;
      }
      // If the response is a stream, forward it as a stream.
      return streamResponse(response.body);
    });

export default app;
