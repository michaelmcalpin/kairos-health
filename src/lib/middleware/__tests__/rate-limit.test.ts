import { describe, it, expect } from "vitest";
import { applyRateLimit, type RateLimitConfig } from "../rate-limit";

function mockRequest(ip = "127.0.0.1"): Request {
  return new Request("http://localhost/api/test", {
    headers: { "x-forwarded-for": ip },
  });
}

describe("Rate Limiter", () => {
  it("allows requests under the limit", async () => {
    const config: RateLimitConfig = { maxRequests: 5, windowMs: 60000 };
    const req = mockRequest("test-allow-1");

    const result = await applyRateLimit(req, config);
    expect(result.allowed).toBe(true);
    expect(parseInt(result.headers["X-RateLimit-Remaining"])).toBe(4);
  });

  it("blocks requests over the limit", async () => {
    const config: RateLimitConfig = { maxRequests: 3, windowMs: 60000 };
    const ip = `test-block-${Date.now()}`;

    // Use up the limit
    await applyRateLimit(mockRequest(ip), config);
    await applyRateLimit(mockRequest(ip), config);
    await applyRateLimit(mockRequest(ip), config);

    // Fourth request should be blocked
    const result = await applyRateLimit(mockRequest(ip), config);
    expect(result.allowed).toBe(false);
    expect(result.response).toBeDefined();
    expect(result.response?.status).toBe(429);
  });

  it("returns correct rate limit headers", async () => {
    const config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 };
    const ip = `test-headers-${Date.now()}`;
    const result = await applyRateLimit(mockRequest(ip), config);

    expect(result.headers["X-RateLimit-Limit"]).toBe("10");
    expect(result.headers["X-RateLimit-Remaining"]).toBeDefined();
    expect(result.headers["X-RateLimit-Reset"]).toBeDefined();
  });

  it("tracks different IPs separately", async () => {
    const config: RateLimitConfig = { maxRequests: 2, windowMs: 60000 };
    const ip1 = `test-ip1-${Date.now()}`;
    const ip2 = `test-ip2-${Date.now()}`;

    await applyRateLimit(mockRequest(ip1), config);
    await applyRateLimit(mockRequest(ip1), config);

    // ip1 should be blocked
    expect((await applyRateLimit(mockRequest(ip1), config)).allowed).toBe(false);
    // ip2 should still be allowed
    expect((await applyRateLimit(mockRequest(ip2), config)).allowed).toBe(true);
  });
});
