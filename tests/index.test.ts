import app from "../src";
import { BINDINGS, getMockOpenAI, getMockShodan, setInMemoryD1Database } from "./utils";
import { RequestModel } from "../src/d1/models";

describe("Test if the request is proxied to the designated service", () => {
  // Create an in-memory sqlite database
  beforeAll(async () => {
    BINDINGS["DB"] = await setInMemoryD1Database();
    BINDINGS["API_OPENAI_COM_API_KEY"] = "sk-1234567890";
    BINDINGS["API_SHODAN_IO_API_KEY"] = "shodan-api-key";
  });

  // Intercept the request to the proxied service when the API key is provided in the request headers
  beforeEach(() => {
    getMockOpenAI()
      .intercept({
        method: "POST",
        path: "/v1/chat/completions",
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${BINDINGS["API_OPENAI_COM_API_KEY"]}`,
        },
        body: JSON.stringify({
          "model": "gpt-3.5-turbo",
          "messages": [{"role": "user", "content": "Say this is a test!"}],
          "temperature": 0.7
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
          "apiKey": BINDINGS["API_OPENAI_COM_API_KEY"],
        },
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          "model": "gpt-3.5-turbo",
          "messages": [{"role": "user", "content": "Say this is a test!"}],
          "temperature": 0.7
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
          "model": "gpt-3.5-turbo",
          "messages": [{"role": "user", "content": "Say this is a test!"}],
          "temperature": 0.7
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
          "key": BINDINGS["API_SHODAN_IO_API_KEY"],
        },
      })
      .reply(200);
  });

  it("should throw and error if x-gateway-service-host isn't provided in headers.", async () => {
    const response = await app.request(
      "/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "x-gateway-service-token": BINDINGS["API_OPENAI_COM_API_KEY"],
          "x-gateway-service-auth-type": "HEADER",
          "x-gateway-service-auth-key": "Authorization",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          "model": "gpt-3.5-turbo",
          "messages": [{"role": "user", "content": "Say this is a test!"}],
          "temperature": 0.7
        }),
      },
      BINDINGS,
      new ExecutionContext(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "x-gateway-service-host header is required." });
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
          "x-gateway-identifier-for-vendor": "xxx-yyy-zzz",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          "model": "gpt-3.5-turbo",
          "messages": [{"role": "user", "content": "Say this is a test!"}],
          "temperature": 0.7
        }),
      },
      BINDINGS,
      new ExecutionContext(),
    );

    expect(response.status).toBe(200);

    const { DB } = BINDINGS;
    const request: RequestModel = await DB.prepare(`
        SELECT *
        FROM requests
        WHERE identifier_for_vendor = ?1
    `)
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
          "content-type": "application/json",
          "x-gateway-identifier-for-vendor": "aaa-bbb-ccc",
        },
        body: JSON.stringify({
          "model": "gpt-3.5-turbo",
          "messages": [{"role": "user", "content": "Say this is a test!"}],
          "temperature": 0.7
        }),
      },
      BINDINGS,
      new ExecutionContext(),
    );

    expect(response.status).toBe(200);


    const { DB } = BINDINGS;
    const request: RequestModel = await DB.prepare(`
        SELECT *
        FROM requests
        WHERE identifier_for_vendor = ?1
    `)
      .bind("aaa-bbb-ccc")
      .first();

    expect(request.identifier_for_vendor).toBe("aaa-bbb-ccc");
    expect(request.status_code).toBe(200);
  });

  it("should throw and error if the API key is not found in header and is not set in env.", async () => {
    const response = await app.request(
      "/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "x-gateway-service-host": "api.monapi.io",
          "x-gateway-service-auth-type": "HEADER",
          "x-gateway-service-auth-key": "Authorization",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          "model": "gpt-3.5-turbo",
          "messages": [{"role": "user", "content": "Say this is a test!"}],
          "temperature": 0.7
        }),
      },
      BINDINGS,
      new ExecutionContext(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Cannot find API key for proxied service! Either provide it in the request headers or set it as an environment variable."
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
          "model": "gpt-3.5-turbo",
          "messages": [{"role": "user", "content": "Say this is a test!"}],
          "temperature": 0.7
        }),
      },
      BINDINGS,
      new ExecutionContext(),
    );

    expect(response.status).toBe(200);

    const { DB } = BINDINGS;
    const request: RequestModel = await DB.prepare(`
        SELECT *
        FROM requests
        WHERE identifier_for_vendor = ?1
    `)
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
          "model": "gpt-3.5-turbo",
          "messages": [{"role": "user", "content": "Say this is a test!"}],
          "temperature": 0.7
        }),
      },
      BINDINGS,
      new ExecutionContext(),
    );

    expect(response.status).toBe(200);

    const { DB } = BINDINGS;
    const request: RequestModel = await DB.prepare(`
        SELECT *
        FROM requests
        WHERE identifier_for_vendor = ?1
    `)
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
        },
      },
      BINDINGS,
      new ExecutionContext(),
    );

    expect(response.status).toBe(200);

    const { DB } = BINDINGS;
    const request: RequestModel = await DB.prepare(`
        SELECT *
        FROM requests
        WHERE identifier_for_vendor = ?1
    `)
      .bind("ccc-bbb-aaa")
      .first();

    expect(request.identifier_for_vendor).toBe("ccc-bbb-aaa");
    expect(request.status_code).toBe(200);
  });

  it("should have all the successful request logged in the database", async () => {
    const { DB } = BINDINGS;

    for (let i = 0; i < 10; i++) {
      getMockOpenAI()
        .intercept({
          method: "POST",
          path: "/v1/chat/completions",
          headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${BINDINGS["API_OPENAI_COM_API_KEY"]}`,
          },
          body: JSON.stringify({
            "model": "gpt-3.5-turbo",
            "messages": [{"role": "user", "content": `This is a test for ${i}!`}],
            "temperature": 0.1 * i
          }),
        })
        .reply(200);

      await app.request(
        "/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "x-gateway-service-host": "api.openai.com",
            "x-gateway-service-token": BINDINGS["API_OPENAI_COM_API_KEY"],
            "x-gateway-service-auth-type": "HEADER",
            "x-gateway-service-auth-key": "Authorization",
            "content-type": "application/json",
            "x-gateway-identifier-for-vendor": "aaa-bbb-ccc",
          },
          body: JSON.stringify({
            "model": "gpt-3.5-turbo",
            "messages": [{"role": "user", "content": `This is a test for ${i}!`}],
            "temperature": 0.1 * i
          }),
        },
        BINDINGS,
        new ExecutionContext(),
      );
    }

    const count = await DB.prepare(`
        SELECT count(*) as count
        FROM requests;
    `)
      .first("count");

    expect(count).toBeGreaterThanOrEqual(10);
  });

});
