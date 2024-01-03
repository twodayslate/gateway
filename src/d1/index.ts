import { Context } from "hono";
import { Bindings } from "../bindings";
import HeaderUtils from "../header_utils";

class D1 {
  constructor(readonly context: Context<{ Bindings: Bindings }>) {}

  async saveAnalyticsParams() {
    const userAgent = this.context.req.raw.headers.get("user-agent");
    const cfConnectingIP = this.context.req.raw.headers.get("cf-connecting-ip");
    const cfIPCountry = this.context.req.raw.headers.get("cf-ipcountry");
    const xServiceId = this.context.req.raw.headers.get("x-gateway-service-id");
    const xServiceName = this.context.req.raw.headers.get("x-gateway-service-name");
    const xIdentifierForVendor = this.context.req.raw.headers.get("x-gateway-identifier-for-vendor");
    const xBundleIdentifier = this.context.req.raw.headers.get("x-gateway-bundle-identifier");
    const xBundleVersion = this.context.req.raw.headers.get("x-gateway-bundle-version");
    const url = this.context.req.raw.url;
    const headers = new HeaderUtils(this.context.req.raw.headers).removeSensitiveHeaders().toJsonString();
    const response = this.context.res.clone();

    await this.context.env.DB.prepare(
      `
        INSERT INTO requests (user_agent,
                              cf_connecting_ip,
                              cf_ip_country,
                              service_id,
                              service_name,
                              identifier_for_vendor,
                              bundle_identifier,
                              url,
                              headers,
                              status_code,
                              error,
                              bundle_version
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
    `,
    )
      .bind(
        userAgent,
        cfConnectingIP,
        cfIPCountry,
        xServiceId,
        xServiceName,
        xIdentifierForVendor,
        xBundleIdentifier,
        url,
        headers,
        response.status,
        response.ok ? null : await response.text(),
        xBundleVersion,
      )
      .run();
  }
}

export default D1;
