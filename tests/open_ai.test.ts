import { app } from "../src";
import { BINDINGS, getMockOpenAI, setInMemoryD1Database } from "./utils";
import { RequestModel } from "../src/d1/models";

describe("it should test all the proxied endpoints for openai", () => {
  // Create an in-memory sqlite database
  beforeAll(async () => {
    BINDINGS["DB"] = await setInMemoryD1Database();
    BINDINGS["API_OPENAI_COM_API_KEY"] = "sk-1234567890";
  });

  // Intercept the request to the proxied service when the API key is provided in the request headers
  beforeEach(() => {
    getMockOpenAI()
      .intercept({
        method: "POST",
        path: "/v1/chat/completions",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${BINDINGS["API_OPENAI_COM_API_KEY"]}`,
        },
        body: undefined,
      })
      .reply(200);
  });

  it("should use the API key for proxied service from env variables if not provided in request headers.", async () => {
    const response = await app.request(
      "/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "x-gateway-service-host": "api.openai.com",
          "x-gateway-service-auth-type": "HEADER",
          "x-gateway-service-auth-key": "Authorization",
          "x-gateway-service-auth-prefix": "Bearer",
          "x-gateway-identifier-for-vendor": "xxx-yyy-zzz",
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
      .bind("xxx-yyy-zzz")
      .first();

    expect(request.identifier_for_vendor).toBe("xxx-yyy-zzz");
    expect(request.status_code).toBe(200);
  });

  it("should use the API key provided in headers to proxy the request to designated service", async () => {
    const response = await app.request(
      "/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "x-gateway-service-host": "api.openai.com",
          "x-gateway-service-token": BINDINGS["API_OPENAI_COM_API_KEY"],
          "x-gateway-service-auth-type": "HEADER",
          "x-gateway-service-auth-key": "Authorization",
          "x-gateway-service-auth-prefix": "Bearer",
          "content-type": "application/json",
          "x-gateway-identifier-for-vendor": "aaa-bbb-ccc",
          "x-gateway-bundle-version": "1.0.0",
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
      .bind("aaa-bbb-ccc")
      .first();

    expect(request.identifier_for_vendor).toBe("aaa-bbb-ccc");
    expect(request.status_code).toBe(200);
    expect(request.bundle_version).toBe("1.0.0");
  });

});
