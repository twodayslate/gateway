import app from "../src";
import { BINDINGS, getMockComputeRenderer, getMockOpenAI, getMockShodan, setInMemoryD1Database } from "./utils";
import { RequestModel } from "../src/d1/models";

describe("Test if the request is proxied to the designated service", () => {
  // Create an in-memory sqlite database
  beforeAll(async () => {
    BINDINGS["DB"] = await setInMemoryD1Database();
    BINDINGS["API_OPENAI_COM_API_KEY"] = "sk-1234567890";
    BINDINGS["API_SHODAN_IO_API_KEY"] = "shodan-api-key";
    BINDINGS["API_COMPUTERENDER_COM_API_KEY"] = "compute-render-api-key";
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
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: "Say this is a test!" }],
          temperature: 0.7,
        }),
      })
      .reply(200);
  });

  // Intercept the request to the proxied service when the API key is provided in the query params
  beforeEach(() => {
    getMockOpenAI()
      .intercept({
        method: "POST",
        path: "/v1/chat/completions",
        query: {
          apiKey: BINDINGS["API_OPENAI_COM_API_KEY"],
        },
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: "Say this is a test!" }],
          temperature: 0.7,
        }),
      })
      .reply(200);
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
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: "Say this is a test!" }],
          temperature: 0.7,
        }),
      })
      .reply(200);
  });

  // Intercept the request to be proxied to api.shodan.io
  beforeEach(() => {
    getMockShodan()
      .intercept({
        method: "GET",
        path: "/shodan/host/1.1.1.1",
        query: {
          key: BINDINGS["API_SHODAN_IO_API_KEY"],
        },
      })
      .reply(200);
  });

  // Intercept the request to be proxied to api.computerender.com
  beforeEach(() => {
    getMockComputeRenderer()
      .intercept({
        method: "POST",
        path: "/generate",
        headers: {
          "content-type": "application/json",
          authorization: `X-API-Key ${BINDINGS["API_COMPUTERENDER_COM_API_KEY"]}`,
        },
        body: JSON.stringify({
          prompt: "This is a test!",
        }),
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

  it("should use the API key for proxied service from env variables if not provided in request headers.", async () => {
    const response = await app.request(
      "/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "x-gateway-service-host": "api.openai.com",
          "x-gateway-service-auth-type": "HEADER",
          "x-gateway-service-auth-key": "Authorization",
          "x-gateway-service-authorization-type": "Bearer",
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
          "x-gateway-service-authorization-type": "Bearer",
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

  it("should set the API key in QUERY param if x-gateway-service-auth-type is set to QUERY", async () => {
    const response = await app.request(
      "/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "x-gateway-service-host": "api.openai.com",
          "x-gateway-service-auth-type": "QUERY",
          "x-gateway-service-auth-key": "apiKey",
          "content-type": "application/json",
          "x-gateway-identifier-for-vendor": "zzz-yyy-xxx",
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
      .bind("zzz-yyy-xxx")
      .first();

    expect(request.identifier_for_vendor).toBe("zzz-yyy-xxx");
    expect(request.status_code).toBe(200);
  });

  it("should set the API key in HEADER if x-gateway-service-auth-type is set to HEADER and x-gateway-service-auth-key is not set to Authorization", async () => {
    const response = await app.request(
      "/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "x-gateway-service-host": "api.openai.com",
          "x-gateway-service-auth-type": "HEADER",
          "x-gateway-service-auth-key": "x-api-key",
          "content-type": "application/json",
          "x-gateway-identifier-for-vendor": "ppp-qqq-rrr",
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
      .bind("ppp-qqq-rrr")
      .first();

    expect(request.identifier_for_vendor).toBe("ppp-qqq-rrr");
    expect(request.status_code).toBe(200);
  });

  it("should return 200 for request proxied to api.shodan.io", async () => {
    const response = await app.request(
      "/shodan/host/1.1.1.1",
      {
        method: "GET",
        headers: {
          "x-gateway-service-host": "api.shodan.io",
          "x-gateway-service-auth-type": "QUERY",
          "x-gateway-service-auth-key": "key",
          "content-type": "application/json",
          "x-gateway-identifier-for-vendor": "ccc-bbb-aaa",
          "x-gateway-bundle-version": "2.0.0",
        },
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
      .bind("ccc-bbb-aaa")
      .first();

    expect(request.identifier_for_vendor).toBe("ccc-bbb-aaa");
    expect(request.status_code).toBe(200);
    expect(request.bundle_version).toBe("2.0.0");
  });

  it("should prepend the authorization type value for authorization header", async () => {
    const context = new ExecutionContext();
    const response = await app.request(
      "/generate",
      {
        method: "POST",
        headers: {
          "x-gateway-service-host": "api.computerender.com",
          "x-gateway-service-auth-type": "HEADER",
          "x-gateway-service-auth-key": "authorization",
          "x-gateway-service-authorization-type": "X-API-Key",
          "content-type": "application/json",
          "x-gateway-identifier-for-vendor": "compute_renderer",
        },
        body: JSON.stringify({
          prompt: "This is a test!",
        }),
      },
      BINDINGS,
      context,
    );

    await getMiniflareWaitUntil(context);

    expect(response.status).toBe(200);

    const { DB } = BINDINGS;
    const { results }: { results: RequestModel[] } = await DB.prepare(
      `
        SELECT *
        FROM requests
        WHERE identifier_for_vendor = ?1
    `,
    )
      .bind("compute_renderer")
      .all();

    expect(results.length).toBe(1);
  });

  it("should have all the successful request logged in the database", async () => {
    const { DB } = BINDINGS;
    const context = new ExecutionContext();

    for (let i = 0; i < 10; i++) {
      const status = i % 2 === 0 ? 200 : 400;
      const body = i % 2 === 0 ? "Hello World!" : "Bad Request!";

      getMockOpenAI()
        .intercept({
          method: "POST",
          path: "/v1/chat/completions",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${BINDINGS["API_OPENAI_COM_API_KEY"]}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: `This is a test for ${i}!` }],
            temperature: 0.1 * i,
          }),
        })
        .reply(status, body);

      await app.request(
        "/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "x-gateway-service-host": "api.openai.com",
            "x-gateway-service-token": BINDINGS["API_OPENAI_COM_API_KEY"],
            "x-gateway-service-auth-type": "HEADER",
            "x-gateway-service-auth-key": "Authorization",
            "x-gateway-service-authorization-type": "Bearer",
            "content-type": "application/json",
            "x-gateway-identifier-for-vendor": "logging-successful-requests",
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: `This is a test for ${i}!` }],
            temperature: 0.1 * i,
          }),
        },
        BINDINGS,
        context,
      );
    }

    await getMiniflareWaitUntil(context);

    const { results }: { results: RequestModel[] } = await DB.prepare(
      `
        SELECT *
        FROM requests
        WHERE identifier_for_vendor = ?1
    `,
    )
      .bind("logging-successful-requests")
      .all();

    // Test if the requests are logged in the database
    expect(results.length).toBeGreaterThanOrEqual(10);
    expect(results.filter((request) => request.status_code === 200).length).toBeGreaterThanOrEqual(5);

    // Test if the error is logged in the database
    const failed = results.filter((request) => request.status_code === 400);
    expect(failed.length).toBeGreaterThanOrEqual(5);
    expect(failed.map((request) => request.error)).toStrictEqual(Array.from({ length: 5 }, () => "Bad Request!"));
  });
});
