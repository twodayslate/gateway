import { app } from "../src";
import { BINDINGS, getMockShodan, setInMemoryD1Database } from "./utils";
import { RequestModel } from "../src/d1/models";

describe("it should test all the proxied endpoints for shodan", () => {
  // Create an in-memory sqlite database
  beforeAll(async () => {
    BINDINGS["DB"] = await setInMemoryD1Database();
    BINDINGS["API_SHODAN_IO_API_KEY"] = "shodan-api-key";
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
});
