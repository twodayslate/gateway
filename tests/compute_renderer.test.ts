import { app } from "../src";
import { BINDINGS, getMockComputeRenderer, setInMemoryD1Database } from "./utils";
import { RequestModel } from "../src/d1/models";

describe("it should test all the proxied endpoints for compute renderer", () => {
  // This is a hack to make sure that the database is initialized before the tests are run
  beforeAll(async () => {
    BINDINGS["DB"] = await setInMemoryD1Database();
    BINDINGS["API_COMPUTERENDER_COM_API_KEY"] = "compute-render-api-key";
  });

  // Intercept the request to be proxied to api.computerender.com
  beforeEach(() => {
    const formData = new FormData();
    formData.append("prompt", "This is a test!");

    getMockComputeRenderer()
      .intercept({
        method: "POST",
        path: "/generate",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          authorization: `X-API-Key ${BINDINGS["API_COMPUTERENDER_COM_API_KEY"]}`,
        },
        body: () => true
      })
      .reply<never>(200, null, {
        headers: {
          "x-compute-renderer": "true",
        },
      });
  });

  it("should prepend the authorization type value for authorization header", async () => {
    const context = new ExecutionContext();
    const formData = new FormData();
    formData.append("prompt", "This is a test!");

    const response = await app.request(
      "/generate",
      {
        method: "POST",
        headers: {
          "x-gateway-service-host": "api.computerender.com",
          "x-gateway-service-auth-type": "HEADER",
          "x-gateway-service-auth-key": "authorization",
          "x-gateway-service-auth-prefix": "X-API-Key",
          "content-type": "application/x-www-form-urlencoded",
          "x-gateway-identifier-for-vendor": "compute_renderer",
        },
        body: formData,
      },
      BINDINGS,
      context,
    );

    await getMiniflareWaitUntil(context);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-compute-renderer")).toBe("true");

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
    expect(results[0].status_code).toBe(200);
    expect(results[0].identifier_for_vendor).toBe("compute_renderer");
  });
});
