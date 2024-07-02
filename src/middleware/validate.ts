import { MiddlewareHandler } from "hono";
import { ServiceType, TError } from "../types";
import { toEnvKey } from "../utils";
import { AppContext } from "../bindings";

function validate(): MiddlewareHandler {
  return async (context: AppContext, next) => {
    const headers = context.req.raw.headers;
    const xGatewayServiceHost = headers.get("x-gateway-service-host");
    const xGatewayServiceType = ServiceType.parse(headers.get("x-gateway-service-type"))
    const xGatewayServiceProxy = headers.get("x-gateway-service-proxy");
    const xGatewayServiceToken = headers.get("x-gateway-service-token");

    if (!xGatewayServiceHost) {
      return context.json(<TError>{ error: "x-gateway-service-host header is required." }, 400);
    }

    if (xGatewayServiceType === "DIRECT" && xGatewayServiceProxy) {
      return context.json(<TError>{ error: "x-gateway-service-proxy header is not allowed for direct service type." }, 400);
    }

    if (xGatewayServiceType === "GATEWAY" && !xGatewayServiceProxy) {
      return context.json(<TError>{ error: "x-gateway-service-proxy header is required." }, 400);
    }

    // If the service token is not provided in the request headers, try to get it from the environment variables.
    // The environment variable name is the service host name in uppercase with all non-alphanumeric characters replaced with "_".
    const apiKey = toEnvKey(xGatewayServiceHost, xGatewayServiceProxy);
    const token = xGatewayServiceToken || context.env[apiKey];

    if (!token) {
      return context.json(
        <TError>{
          error: "Cannot find API key for proxied service! Either provide it in the request headers or set it as an environment variable.",
        },
        400,
      );
    }

    context.set("token", token);

    return next();
  };
}

export default validate;
