import { describe, expect, it, vi, beforeEach } from "vitest";

import { listStreams, getStream, ApiError } from "./api";

describe("api client — non-success responses", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("listStreams error handling", () => {
    it("converts a 500 server error response to a descriptive Error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(listStreams({})).rejects.toThrow("Failed to load streams (500)");
    });

    it("converts a 503 service unavailable response to a descriptive Error with status code", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
      });

      const promise = listStreams({});
      await expect(promise).rejects.toThrow(Error);
      await expect(promise).rejects.toThrow("Failed to load streams (503)");
    });

    it("converts a 400 bad request response to an Error carrying status information", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      });

      await expect(listStreams({ sender: "invalid-key" })).rejects.toThrow(
        "Failed to load streams (400)",
      );
    });

    it("preserves backend code, error, and requestId when present in a JSON error body", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({
          code: "INVALID_PARAMETERS",
          error: "Sender address is invalid",
          requestId: "req-abc-123",
        }),
      });

      try {
        await listStreams({});
        expect.unreachable("should have thrown");
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.message).toBe("Sender address is invalid");
        expect(apiErr.code).toBe("INVALID_PARAMETERS");
        expect(apiErr.error).toBe("Sender address is invalid");
        expect(apiErr.backendError).toBe("Sender address is invalid");
        expect(apiErr.requestId).toBe("req-abc-123");
        expect(apiErr.status).toBe(400);
      }
    });

    it("handles a non-JSON error body gracefully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
        json: async () => {
          throw new Error("SyntaxError: Unexpected token < in JSON at position 0");
        },
      });

      try {
        await listStreams({});
        expect.unreachable("should have thrown");
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.message).toBe("Failed to load streams (502)");
        expect(apiErr.code).toBeUndefined();
        expect(apiErr.error).toBeUndefined();
        expect(apiErr.requestId).toBeUndefined();
        expect(apiErr.status).toBe(502);
      }
    });

    it("propagates a network error unchanged", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network connection refused"));

      await expect(listStreams({})).rejects.toThrow("Network connection refused");
    });
  });

  describe("getStream error handling", () => {
    it("converts a 500 server error response on getStream to a descriptive Error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(getStream("stream-123")).rejects.toThrow(
        "Failed to load stream stream-123 (500)",
      );
    });

    it("converts a 403 forbidden response on getStream to a descriptive Error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      });

      await expect(getStream("stream-456")).rejects.toThrow(
        "Failed to load stream stream-456 (403)",
      );
    });

    it("preserves backend code, error, and requestId on getStream with JSON error body", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      const notFoundResult = await getStream("non-existent");
      expect(notFoundResult).toBeNull();

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({
          code: "STREAM_READ_FAILED",
          error: "Stream corrupted or unreadable",
          requestId: "req-xyz-789",
        }),
      });

      try {
        await getStream("stream-corrupt");
        expect.unreachable("should have thrown");
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.message).toBe("Stream corrupted or unreadable");
        expect(apiErr.code).toBe("STREAM_READ_FAILED");
        expect(apiErr.requestId).toBe("req-xyz-789");
        expect(apiErr.status).toBe(500);
      }
    });

    it("returns null for a 404 not found without throwing an error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      const result = await getStream("non-existent");
      expect(result).toBeNull();
    });
  });
});
