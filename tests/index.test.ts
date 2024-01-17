import { app } from "../src";
import { BINDINGS, getMockOpenAI, setInMemoryD1Database } from "./utils";
import { RequestModel } from "../src/d1/models";

describe("Test if a request has all the details required to proxy the request to upstream service", () => {
  // Create an in-memory sqlite database
  beforeAll(async () => {
    BINDINGS["DB"] = await setInMemoryD1Database();
    BINDINGS["API_OPENAI_COM_API_KEY"] = "sk-1234567890";
    BINDINGS["API_SHODAN_IO_API_KEY"] = "shodan-api-key";
    BINDINGS["API_COMPUTERENDER_COM_API_KEY"] = "compute-render-api-key";
  });

  // Intercept the request to the proxied service when the API key is provided in the request headers and is not a Bearer token
  beforeEach(() => {
    getMockOpenAI()
      .intercept({
        method: "POST",
        path: "/v1/chat/completions",
        headers: {
          "content-type": "application/json",
          "x-api-key": BINDINGS["API_OPENAI_COM_API_KEY"],
        },
        body: undefined,
      })
      .reply(200);
  });

  it("should throw and error if x-gateway-service-host isn't provided in headers.", async () => {
    const context = new ExecutionContext();
    const response = await app.request(
      "/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "x-gateway-service-token": BINDINGS["API_OPENAI_COM_API_KEY"],
          "x-gateway-service-auth-type": "HEADER",
          "x-gateway-service-auth-key": "Authorization",
          "content-type": "application/json",
          "x-gateway-identifier-for-vendor": "x-gateway-service-host-not-found",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: "Say this is a test!" }],
          temperature: 0.7,
        }),
      },
      BINDINGS,
      context,
    );

    await getMiniflareWaitUntil(context);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "x-gateway-service-host header is required." });

    const { DB } = BINDINGS;

    const request: RequestModel = await DB.prepare(
      `
        SELECT *
        FROM requests
        WHERE identifier_for_vendor = ?1
    `,
    )
      .bind("x-gateway-service-host-not-found")
      .first();

    expect(request.status_code).toBe(400);
    expect(JSON.parse(request.error)).toStrictEqual({ error: "x-gateway-service-host header is required." });
  });

  it("should throw and error if the API key is not found in header and is not set in env.", async () => {
    const context = new ExecutionContext();
    const response = await app.request(
      "/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "x-gateway-service-host": "api.monapi.io",
          "x-gateway-service-auth-type": "HEADER",
          "x-gateway-service-auth-key": "Authorization",
          "content-type": "application/json",
          "x-gateway-identifier-for-vendor": "api-key-not-found",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: "Say this is a test!" }],
          temperature: 0.7,
        }),
      },
      BINDINGS,
      context,
    );

    await getMiniflareWaitUntil(context);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Cannot find API key for proxied service! Either provide it in the request headers or set it as an environment variable.",
    });

    const { DB } = BINDINGS;
    const request: RequestModel = await DB.prepare(
      `
        SELECT *
        FROM requests
        WHERE identifier_for_vendor = ?1
    `,
    )
      .bind("api-key-not-found")
      .first();

    expect(request.status_code).toBe(400);
    expect(request.identifier_for_vendor).toBe("api-key-not-found");
    expect(JSON.parse(request.error)).toStrictEqual({
      error: "Cannot find API key for proxied service! Either provide it in the request headers or set it as an environment variable.",
    });
  });

});
