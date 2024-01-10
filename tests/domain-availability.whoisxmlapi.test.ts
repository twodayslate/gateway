import app from "../src";
import { BINDINGS, getMockDomainAvailabilityWhoIsXmlApi, setInMemoryD1Database } from "./utils";
import { RequestModel } from "../src/d1/models";

describe("it should test all the proxied endpoints for domain-availability.whoisxmlapi", () => {
  // Create an in-memory sqlite database
  beforeAll(async () => {
    BINDINGS["DB"] = await setInMemoryD1Database();
    BINDINGS["DOMAIN_AVAILABILITY_WHOISXMLAPI_COM_API_KEY"] = "domain-availability-whoisxmlapi-api-key";
  });

  // Intercept the request to the proxied service when the API key is provided in the query params
  beforeEach(() => {
    getMockDomainAvailabilityWhoIsXmlApi()
      .intercept({
        method: "GET",
        path: "/api/v1",
        query: {
          apiKey: BINDINGS["DOMAIN_AVAILABILITY_WHOISXMLAPI_COM_API_KEY"],
        },
      })
      .reply(200);
  });

  it("should set the API key in QUERY param if x-gateway-service-auth-type is set to QUERY", async () => {
    const response = await app.request(
      "/api/v1",
      {
        method: "GET",
        headers: {
          "x-gateway-service-host": "domain-availability.whoisxmlapi.com",
          "x-gateway-service-auth-type": "QUERY",
          "x-gateway-service-auth-key": "apiKey",
          "content-type": "application/json",
          "x-gateway-identifier-for-vendor": "zzz-yyy-xxx",
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
      .bind("zzz-yyy-xxx")
      .first();

    expect(request.identifier_for_vendor).toBe("zzz-yyy-xxx");
    expect(request.status_code).toBe(200);
  });

});
