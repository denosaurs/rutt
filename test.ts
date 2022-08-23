import type { ConnInfo } from "https://deno.land/std@0.152.0/http/server.ts";
import {
  assert,
  assertEquals,
  assertIsError,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import { METHODS, router } from "./mod.ts";

const TEST_CONN_INFO: ConnInfo = {
  localAddr: {
    transport: "tcp",
    hostname: "test",
    port: 80,
  },
  remoteAddr: {
    transport: "tcp",
    hostname: "test",
    port: 80,
  },
};

Deno.test("handlers", async ({ step }) => {
  await step("other", async ({ step }) => {
    await step("default", async () => {
      const route = router({
        "/test": () => new Response(),
      });
      let response: Response;

      response = await route(
        new Request("https://example.com/"),
        TEST_CONN_INFO,
      );
      assert(!response.ok);
      assertEquals(response.body, null);
      assertEquals(response.status, 404);

      response = await route(
        new Request("https://example.com/test"),
        TEST_CONN_INFO,
      );
      assert(response.ok);
      assertEquals(response.body, null);
      assertEquals(response.status, 200);
    });

    await step("custom", async () => {
      const route = router({
        "/test": () => new Response(),
      }, () => {
        return new Response("test", {
          status: 418,
        });
      });
      let response: Response;

      response = await route(
        new Request("https://example.com/"),
        TEST_CONN_INFO,
      );
      assert(!response.ok);
      assertEquals(await response.text(), "test");
      assertEquals(response.status, 418);

      response = await route(
        new Request("https://example.com/test"),
        TEST_CONN_INFO,
      );
      assert(response.ok);
      assertEquals(response.body, null);
      assertEquals(response.status, 200);
    });
  });

  await step("error", async ({ step }) => {
    await step("default", async () => {
      const route = router({
        "/error": () => {
          throw new Error("error");
        },
      });

      const response = await route(
        new Request("https://example.com/error"),
        TEST_CONN_INFO,
      );
      assert(!response.ok);
      assertEquals(response.body, null);
      assertEquals(response.status, 500);
    });

    await step("custom", async () => {
      const route = router(
        {
          "/error/:message": (_req, _ctx, match) => {
            throw new Error(match.message);
          },
          "/error": () => {
            throw new Error("error");
          },
        },
        undefined,
        (_req, _ctx, err) => {
          assertIsError(err);

          return new Response(err.message, {
            status: 500,
          });
        },
      );
      let response: Response;

      response = await route(
        new Request("https://example.com/error"),
        TEST_CONN_INFO,
      );
      assert(!response.ok);
      assertEquals(await response.text(), "error");
      assertEquals(response.status, 500);

      response = await route(
        new Request("https://example.com/error/message"),
        TEST_CONN_INFO,
      );
      assert(!response.ok);
      assertEquals(await response.text(), "message");
      assertEquals(response.status, 500);
    });
  });

  await step("unknown method", async ({ step }) => {
    await step("default", async () => {
      const route = router({
        "GET@/test": () => new Response(),
        "PATCH@/test": () => new Response(),
      });
      let response: Response;

      response = await route(
        new Request("https://example.com/test"),
        TEST_CONN_INFO,
      );
      assert(response.ok);
      assertEquals(response.body, null);
      assertEquals(response.status, 200);

      response = await route(
        new Request("https://example.com/test", {
          method: "PATCH",
        }),
        TEST_CONN_INFO,
      );
      assert(response.ok);
      assertEquals(response.body, null);
      assertEquals(response.status, 200);

      response = await route(
        new Request("https://example.com/test", {
          method: "POST",
        }),
        TEST_CONN_INFO,
      );
      assert(!response.ok);
      assertEquals(response.body, null);
      assertEquals(response.status, 405);
      assertEquals(response.headers.get("Accept"), "GET, PATCH");
    });

    await step("custom", async () => {
      const route = router(
        {
          "GET@/test": () => new Response(),
          "PATCH@/test": () => new Response(),
        },
        undefined,
        undefined,
        (_req, _ctx, knownMethods) => {
          assert(Array.isArray(knownMethods));
          assert(
            knownMethods.every((
              method,
            ) =>
              METHODS.includes(
                method as (
                  | "GET"
                  | "HEAD"
                  | "POST"
                  | "PUT"
                  | "DELETE"
                  | "OPTIONS"
                  | "PATCH"
                ),
              )
            ),
          );
          assertEquals(knownMethods, ["GET", "PATCH"]);

          return new Response("unknown method", {
            status: 405,
            headers: {
              Accept: knownMethods.join(", "),
            },
          });
        },
      );
      let response: Response;

      response = await route(
        new Request("https://example.com/test"),
        TEST_CONN_INFO,
      );
      assert(response.ok);
      assertEquals(response.body, null);
      assertEquals(response.status, 200);

      response = await route(
        new Request("https://example.com/test", {
          method: "PATCH",
        }),
        TEST_CONN_INFO,
      );
      assert(response.ok);
      assertEquals(response.body, null);
      assertEquals(response.status, 200);

      response = await route(
        new Request("https://example.com/test", {
          method: "POST",
        }),
        TEST_CONN_INFO,
      );
      assert(!response.ok);
      assertEquals(await response.text(), "unknown method");
      assertEquals(response.status, 405);
      assertEquals(response.headers.get("Accept"), "GET, PATCH");
    });
  });
});
