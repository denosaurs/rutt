import { assert, assertEquals, assertIsError } from "jsr:@std/assert@1.0.5";
import { router } from "./mod.ts";

/// @ts-ignore - Deno doesn't have this type
const TEST_CONN_INFO: Deno.ServeHandlerInfo = {
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
      const route = router(
        {
          "/test": () => new Response(),
        },
        {
          otherHandler: () => {
            return new Response("test", {
              status: 418,
            });
          },
        },
      );
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
        {
          errorHandler: (_req, _ctx, err) => {
            assertIsError(err);

            return new Response(err.message, {
              status: 500,
            });
          },
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
        new Request("https://example.com/error/message\u2019"),
        TEST_CONN_INFO,
      );
      assert(!response.ok);
      assertEquals(await response.text(), "message\u2019");
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
        {
          unknownMethodHandler: (_req, _ctx, knownMethods) => {
            assert(Array.isArray(knownMethods));
            assert(
              knownMethods.every((method) => knownMethods.includes(method)),
            );
            assertEquals(knownMethods, ["GET", "PATCH"]);

            return new Response("unknown method", {
              status: 405,
              headers: {
                Accept: knownMethods.join(", "),
              },
            });
          },
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

Deno.test("nesting", async ({ step }) => {
  await step("slash", async () => {
    const route = router({
      "/": () => new Response(),
      "/test/": {
        "/abc": () => new Response(),
        "/123": () => new Response(),
      },
    });
    let response: Response;

    response = await route(new Request("https://example.com/"), TEST_CONN_INFO);
    assert(response.ok);
    assertEquals(response.body, null);
    assertEquals(response.status, 200);

    response = await route(
      new Request("https://example.com/test"),
      TEST_CONN_INFO,
    );
    assert(!response.ok);
    assertEquals(response.body, null);
    assertEquals(response.status, 404);

    response = await route(
      new Request("https://example.com/test/abc"),
      TEST_CONN_INFO,
    );
    assert(response.ok);
    assertEquals(response.body, null);
    assertEquals(response.status, 200);

    response = await route(
      new Request("https://example.com/test/123"),
      TEST_CONN_INFO,
    );
    assert(response.ok);
    assertEquals(response.body, null);
    assertEquals(response.status, 200);
  });

  await step("no slash", async () => {
    const route = router({
      "": () => new Response(),
      test: {
        abc: () => new Response(),
        "123": () => new Response(),
      },
    });
    let response: Response;

    response = await route(new Request("https://example.com/"), TEST_CONN_INFO);
    assert(response.ok);
    assertEquals(response.body, null);
    assertEquals(response.status, 200);

    response = await route(
      new Request("https://example.com/test"),
      TEST_CONN_INFO,
    );
    assert(!response.ok);
    assertEquals(response.body, null);
    assertEquals(response.status, 404);

    response = await route(
      new Request("https://example.com/test/abc"),
      TEST_CONN_INFO,
    );
    assert(response.ok);
    assertEquals(response.body, null);
    assertEquals(response.status, 200);

    response = await route(
      new Request("https://example.com/test/123"),
      TEST_CONN_INFO,
    );
    assert(response.ok);
    assertEquals(response.body, null);
    assertEquals(response.status, 200);
  });

  await step("parameters", async () => {
    const route = router({
      ":test": {
        abc: () => new Response(),
        "123": () => new Response(),
      },
    });
    let response: Response;

    response = await route(
      new Request("https://example.com/foo"),
      TEST_CONN_INFO,
    );
    assert(!response.ok);
    assertEquals(response.body, null);
    assertEquals(response.status, 404);

    response = await route(
      new Request("https://example.com/bar/abc"),
      TEST_CONN_INFO,
    );
    assert(response.ok);
    assertEquals(response.body, null);
    assertEquals(response.status, 200);

    response = await route(
      new Request("https://example.com/baz/123"),
      TEST_CONN_INFO,
    );
    assert(response.ok);
    assertEquals(response.body, null);
    assertEquals(response.status, 200);
  });

  await step("nested parent handler", async () => {
    const route = router({
      "/test": {
        "/abc": () => new Response(),
        "{/}?": () => new Response(),
      },
    });
    let response: Response;

    response = await route(
      new Request("https://example.com/test/123"),
      TEST_CONN_INFO,
    );
    assert(!response.ok);
    assertEquals(response.body, null);
    assertEquals(response.status, 404);

    response = await route(
      new Request("https://example.com/test/abc"),
      TEST_CONN_INFO,
    );
    assert(response.ok);
    assertEquals(response.body, null);
    assertEquals(response.status, 200);

    response = await route(
      new Request("https://example.com/test/"),
      TEST_CONN_INFO,
    );
    assert(response.ok);
    assertEquals(response.body, null);
    assertEquals(response.status, 200);

    response = await route(
      new Request("https://example.com/test"),
      TEST_CONN_INFO,
    );
    assert(response.ok);
    assertEquals(response.body, null);
    assertEquals(response.status, 200);
  });

  await step("methods shallow", async () => {
    const route = router({
      "/": () => new Response(),
      "/test/": {
        "GET@/abc": () => new Response("1"),
        "POST@/abc": () => new Response("2"),
        "DELETE@{/}?": () => new Response(),
      },
    });
    let response: Response;

    response = await route(new Request("https://example.com/"), TEST_CONN_INFO);
    assert(response.ok);
    assertEquals(response.body, null);
    assertEquals(response.status, 200);

    response = await route(
      new Request("https://example.com/test"),
      TEST_CONN_INFO,
    );
    assert(!response.ok);
    assertEquals(response.body, null);
    assertEquals(response.status, 405);
    assertEquals(response.headers.get("Accept"), "DELETE");

    response = await route(
      new Request("https://example.com/test/", { method: "DELETE" }),
      TEST_CONN_INFO,
    );
    assert(response.ok);
    assertEquals(response.status, 200);
    assertEquals(response.body, null);

    response = await route(
      new Request("https://example.com/test/abc", { method: "DELETE" }),
      TEST_CONN_INFO,
    );
    assert(!response.ok);
    assertEquals(response.body, null);
    assertEquals(response.status, 405);
    assertEquals(response.headers.get("Accept"), "GET, POST");

    response = await route(
      new Request("https://example.com/test/abc"),
      TEST_CONN_INFO,
    );
    assert(response.ok);
    assertEquals(response.status, 200);
    assertEquals(await response.text(), "1");

    response = await route(
      new Request("https://example.com/test/abc", { method: "POST" }),
      TEST_CONN_INFO,
    );
    assert(response.ok);
    assertEquals(response.status, 200);
    assertEquals(await response.text(), "2");
  });

  await step("methods deep", async () => {
    const route = router({
      "/": () => new Response(),
      "/test/": {
        "/abc/": {
          "GET@/def": () => new Response("1"),
          "POST@/def": () => new Response("2"),
          "DELETE@{/}?": () => new Response(),
        },
      },
    });
    let response: Response;

    response = await route(new Request("https://example.com/"), TEST_CONN_INFO);
    assert(response.ok);
    assertEquals(response.body, null);
    assertEquals(response.status, 200);

    response = await route(
      new Request("https://example.com/test/abc/"),
      TEST_CONN_INFO,
    );
    assert(!response.ok);
    assertEquals(response.body, null);
    assertEquals(response.status, 405);
    assertEquals(response.headers.get("Accept"), "DELETE");

    response = await route(
      new Request("https://example.com/test/abc/", { method: "DELETE" }),
      TEST_CONN_INFO,
    );
    assert(response.ok);
    assertEquals(response.status, 200);
    assertEquals(response.body, null);

    response = await route(
      new Request("https://example.com/test/abc/def", { method: "DELETE" }),
      TEST_CONN_INFO,
    );
    assert(!response.ok);
    assertEquals(response.body, null);
    assertEquals(response.status, 405);
    assertEquals(response.headers.get("Accept"), "GET, POST");

    response = await route(
      new Request("https://example.com/test/abc/def"),
      TEST_CONN_INFO,
    );
    assert(response.ok);
    assertEquals(response.status, 200);
    assertEquals(await response.text(), "1");

    response = await route(
      new Request("https://example.com/test/abc/def", { method: "POST" }),
      TEST_CONN_INFO,
    );
    assert(response.ok);
    assertEquals(response.status, 200);
    assertEquals(await response.text(), "2");
  });
});

Deno.test("internal routes", async ({ step }) => {
  await step("RegExp", async () => {
    const route = router([
      {
        pattern: /^https:\/\/example\.com\/test$/,
        methods: { any: () => new Response() },
      },
    ]);
    let response: Response;

    response = await route(new Request("https://example.com/"), TEST_CONN_INFO);
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

  await step("URLPattern", async () => {
    const route = router([
      {
        pattern: new URLPattern({ pathname: "/test" }),
        methods: { any: () => new Response() },
      },
    ]);
    let response: Response;

    response = await route(new Request("https://example.com/"), TEST_CONN_INFO);
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
});
