class HeaderUtils {
  private readonly headers: Headers;
  constructor(headers: Headers) {
    this.headers = new Headers(headers);
  }

  /**
   * A function to remove sensitive headers from a Headers object.
   */
  removeSensitiveHeaders() {
    const sensitiveHeaders = ["Authorization", "x-gateway-service-token"];

    for (const header of sensitiveHeaders) {
      this.headers.delete(header);
    }

    return this;
  }

  /**
   * A function to remove all x-gateway-* headers from a Headers object.
   */
  removeGatewayHeaders() {
    for (const [key] of this.headers) {
      if (key.startsWith("x-gateway-")) {
        this.headers.delete(key);
      }
    }

    return this;
  }

  get() {
    return this.headers;
  }

  toJsonObject() {
    return Object.fromEntries(this.headers.entries());
  }

  toJsonString() {
    return JSON.stringify(this.toJsonObject());
  }
}

export default HeaderUtils;
