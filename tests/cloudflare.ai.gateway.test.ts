import { app } from "../src";
import { RequestModel } from "../src/d1/models";
import { BINDINGS, getMockCloudflareAIGateway, setInMemoryD1Database } from "./utils";

describe("Cloudflare AI Gateway", () => {
  beforeAll(async () => {
    BINDINGS["DB"] = await setInMemoryD1Database();
    BINDINGS["GATEWAY_AI_CLOUDFLARE_COM_MISTRAL_API_KEY"] = "cloudflare-ai-mistral";
  });

  beforeEach(() => {
    getMockCloudflareAIGateway()
      .intercept({
        method: "POST",
        path: "/v1/acc_123/gateway_123/openai/chat/completions",
        headers: {
          "content-type": "application/json",
          Authorization: "Bearer cloudflare-ai-mistral",
        },
        body: undefined,
      })
      .reply(200);
  });

  it("should response with a failure response if the service type is DIRECT and a proxy is provided", async () => {
    const response = await app.request(
      "/v1/acc_123/gateway_123/openai/chat/completions",
      {
        method: "POST",
        headers: {
          "x-gateway-service-host": "gateway.ai.cloudflare.com",
          "x-gateway-service-auth-type": "HEADER",
          "x-gateway-service-auth-key": "Authorization",
          "x-gateway-service-auth-prefix": "Bearer",
          "x-gateway-identifier-for-vendor": "ccc-ddd-eee",
          "x-gateway-service-proxy": "MISTRAL",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: "Say this is a test!" }],
          temperature: 0.7,
        }),
      },
      BINDINGS,
      new ExecutionContext(),
    );

    expect(response.status).toEqual(400);
    expect(await response.json()).toMatchObject({
      error: "x-gateway-service-proxy header is not allowed for direct service type.",
    });
  });

  it("should respond with a failure response if the service type is GATEWAY and no proxy is provided", async () => {
    const response = await app.request(
      "/v1/acc_123/gateway_123/openai/chat/completions",
      {
        method: "POST",
        headers: {
          "x-gateway-service-host": "gateway.ai.cloudflare.com",
          "x-gateway-service-auth-type": "HEADER",
          "x-gateway-service-auth-key": "Authorization",
          "x-gateway-service-auth-prefix": "Bearer",
          "x-gateway-identifier-for-vendor": "ccc-ddd-eee",
          "x-gateway-service-type": "GATEWAY",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: "Say this is a test!" }],
          temperature: 0.7,
        }),
      },
      BINDINGS,
      new ExecutionContext(),
    );

    expect(response.status).toEqual(400);
    expect(await response.json()).toMatchObject({
      error: "x-gateway-service-proxy header is required.",
    });
  });

  it("should use the API key for cloudflare gateway proxied service from env variables if not provided in request headers.", async () => {
    const response = await app.request(
      "/v1/acc_123/gateway_123/openai/chat/completions",
      {
        method: "POST",
        headers: {
          "x-gateway-service-host": "gateway.ai.cloudflare.com",
          "x-gateway-service-auth-type": "HEADER",
          "x-gateway-service-auth-key": "Authorization",
          "x-gateway-service-auth-prefix": "Bearer",
          "x-gateway-identifier-for-vendor": "ccc-ddd-eee",
          "x-gateway-service-type": "GATEWAY",
          "x-gateway-service-proxy": "MISTRAL",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: "Say this is a test!" }],
          temperature: 0.7,
        }),
      },
      BINDINGS,
      new ExecutionContext(),
    );

    expect(response.status).toBe(200);

    const { DB } = BINDINGS;
    const request: RequestModel = await DB.prepare(
      `
            SELECT *
            FROM requests
            WHERE identifier_for_vendor = ?1
        `,
    )
      .bind("ccc-ddd-eee")
      .first();

    expect(request.identifier_for_vendor).toBe("ccc-ddd-eee");
    expect(request.status_code).toBe(200);
  });
});
