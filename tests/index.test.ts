import app from "../src";
import { BINDINGS, getMockOpenAI } from "./utils";

describe("Test if the request is proxied to the designated service", () => {
  // Set the API key for proxied service in env variables
  beforeEach(() => {
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
    expect(await response.json<Error>()).toEqual({ error: "x-gateway-service-host header is required." });
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
    expect(await response.json<Error>()).toEqual({
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
  });

});
