import {
  assert,
  assertEquals,
  assertIsError,
} from "https://deno.land/std@0.200.0/assert/mod.ts";
import {
  type ExtractPathMatch,
  type FilterAndTrimPathParamsToStringUnion,
  type HandlerContext,
  type HandlerContextBase,
  type MatchHandler,
  router,
  type Routes,
  type RoutesBranch,
  type Split,
} from "./mod.ts";
import * as Types from "https://deno.land/std@0.220.1/testing/types.ts";

type EmptyObject = Record<never, never>;

// todo remove
// it is just supersimple demo
export function simpleRouter<
  R extends Routes<R, HandlerContextExtra, "", "">,
  HandlerContextExtra extends HandlerContextBase,
>(routes: R) {
}

simpleRouter({
  "/": (req, ctx, match) => new Response(),
  "/home/:path/something/else/:view": (req, ctx, match) =>
    new Response(`${match.path} ${match.view}`),
  "/a": {
    "/:type": {
      "/details": (r, c, m) => new Response(m.type),
    },
  },
  "/b": {
    "/:bId": (r, c, m) => new Response(m.bId),
  },
  "/c": {
    "/c": (r, c, m) => new Response(),
  },
  "/d": {
    "/:dId": {
      "/wow/its/aBig/:wildcardedRoute/:evenMoooooore": {
        "/details": (r, c, m) => new Response(),
        "/category": {
          "/:categoryId": (r, c, m) =>
            new Response(
              `${m.categoryId} ${m.dId} ${m.evenMoooooore} ${m.wildcardedRoute}`,
            ),
        },
      },
    },
  },
});

Deno.test("typesafety - Split", ({ step }) => {
  step("given empty string, should return empty array", () => {
    Types.assertType<Types.IsExact<Split<"", "">, []>>(true);
    Types.assertType<Types.IsExact<Split<"", " ">, []>>(true);
    Types.assertType<Types.IsExact<Split<"", "/">, []>>(true);
  });
  step(
    "given exact string to split character, should return one result",
    () => {
      Types.assertType<Types.IsExact<Split<" ", " ">, [""]>>(true);
      Types.assertType<Types.IsExact<Split<"/", "/">, [""]>>(true);
    },
  );
  step("given prefixed split character, should return the prefix", () => {
    Types.assertType<Types.IsExact<Split<"a ", " ">, ["a"]>>(true);
    Types.assertType<Types.IsExact<Split<"b/", "/">, ["b"]>>(true);
  });
  step("given suffixed split character, should return 2 results", () => {
    Types.assertType<Types.IsExact<Split<" a", " ">, ["", "a"]>>(true);
    Types.assertType<Types.IsExact<Split<"/b", "/">, ["", "b"]>>(true);
  });
  step("given pathname should return array of defined strings", () => {
    type Param = "/this/is/test";
    type Expected = ["", "this", "is", "test"];
    type Result = Split<Param, "/">;

    Types.assertType<Types.IsExact<Result, Expected>>(true);
  });
  step(
    "should split string into array of defined strings and preserve special characters",
    () => {
      type Param = "/this/is/test/:id/:item/:id/something/asd/asd/asd";
      type Expected = [
        "",
        "this",
        "is",
        "test",
        ":id",
        ":item",
        ":id",
        "something",
        "asd",
        "asd",
        "asd",
      ];
      type Result = Split<Param, "/">;

      Types.assertType<Types.IsExact<Result, Expected>>(true);
    },
  );
});

Deno.test("typesafety - FilterAndTrimPathParamsToStringUnion", ({ step }) => {
  step("given empty array, should return empty union (never)", () => {
    Types.assertType<
      Types.IsExact<FilterAndTrimPathParamsToStringUnion<[], "">, never>
    >(true);
    Types.assertType<
      Types.IsExact<FilterAndTrimPathParamsToStringUnion<[], " ">, never>
    >(true);
    Types.assertType<
      Types.IsExact<FilterAndTrimPathParamsToStringUnion<[], "/">, never>
    >(true);
    Types.assertType<
      Types.IsExact<FilterAndTrimPathParamsToStringUnion<[], ":">, never>
    >(true);
  });
  step("given array without match, should return empty union (never)", () => {
    Types.assertType<
      Types.IsExact<FilterAndTrimPathParamsToStringUnion<[""], "">, never>
    >(true);
    Types.assertType<
      Types.IsExact<
        FilterAndTrimPathParamsToStringUnion<["", "id", "asd", ""], " ">,
        never
      >
    >(true);
    Types.assertType<
      Types.IsExact<
        FilterAndTrimPathParamsToStringUnion<["something"], "/">,
        never
      >
    >(true);
    Types.assertType<
      Types.IsExact<FilterAndTrimPathParamsToStringUnion<["aaaa"], ":">, never>
    >(true);
  });
  step(
    "given array with matches, should return union of matches without the prefix",
    () => {
      Types.assertType<
        Types.IsExact<
          FilterAndTrimPathParamsToStringUnion<
            [":id"],
            ":"
          >,
          "id"
        >
      >(true);
      Types.assertType<
        Types.IsExact<
          FilterAndTrimPathParamsToStringUnion<
            ["", ":id", "something", ":filterId"],
            ":"
          >,
          "id" | "filterId"
        >
      >(true);
    },
  );
  step(
    "given array with duplicated matches, should return union of matches without the prefix and duplicates",
    () => {
      Types.assertType<
        Types.IsExact<
          FilterAndTrimPathParamsToStringUnion<
            [
              "",
              ":id",
              "something",
              ":id",
              ":filterId",
              ":filterId",
              "something",
              ":id",
            ],
            ":"
          >,
          "id" | "filterId"
        >
      >(true);
    },
  );
});

Deno.test("typesafety - ExtractPathMatch", ({ step }) => {
  step("given path without params, should return Record<never, string>", () => {
    Types.assertType<
      Types.IsExact<
        ExtractPathMatch<
          "/"
        >,
        Record<never, string>
      >
    >(true);
    Types.assertType<
      Types.IsExact<
        ExtractPathMatch<
          "/home"
        >,
        Record<never, string>
      >
    >(true);
    Types.assertType<
      Types.IsExact<
        ExtractPathMatch<
          "/api/v1/user"
        >,
        Record<never, string>
      >
    >(true);
  });
  step(
    "given path with params, should return record with params as keys",
    () => {
      Types.assertType<
        Types.IsExact<
          ExtractPathMatch<
            "/:path"
          >,
          Record<"path", string>
        >
      >(true);
      Types.assertType<
        Types.IsExact<
          ExtractPathMatch<
            "/home/:path/something/else/:view"
          >,
          Record<"path" | "view", string>
        >
      >(true);
      Types.assertType<
        Types.IsExact<
          ExtractPathMatch<
            "/api/v1/user/:userId/friends/:friendId/shares/:shareId"
          >,
          Record<"userId" | "friendId" | "shareId", string>
        >
      >(true);
    },
  );
});

Deno.test("typesafety - HandlerContext", ({ step }) => {
  step(
    "given, should expose HandlerContextBase members",
    () => {
      Types.assertType<
        Types.IsExact<
          HandlerContext,
          {
            remoteAddr: Deno.NetAddr;
          }
        >
      >(true);
    },
  );
  step(
    "given HandlerContextBase, should expose HandlerContextBase members",
    () => {
      Types.assertType<
        Types.IsExact<
          HandlerContext<HandlerContextBase>,
          {
            remoteAddr: Deno.NetAddr;
          }
        >
      >(true);
    },
  );
  step(
    `given { something: number }, should expose HandlerContextBase members and the passed object member`,
    () => {
      type Given = {
        something: number;
      };
      type Expected = Given & {
        remoteAddr: Deno.NetAddr;
      };
      Types.assertType<
        Types.IsExact<
          HandlerContext<Given>,
          Expected
        >
      >(true);
    },
  );
});

Deno.test("typesafety - MatchHandler", ({ step }) => {
  step(
    `given "/" as route, should be empty on match`,
    () => {
      type Result = MatchHandler<
        HandlerContextBase,
        ExtractPathMatch<
          "/"
        >
      >;
      Types.assertType<
        Types.IsExact<
          Parameters<Result>,
          [
            Request,
            {
              remoteAddr: Deno.NetAddr;
            },
            EmptyObject,
          ]
        >
      >(true);
      Types.assertType<
        Types.IsExact<
          ReturnType<Result>,
          Response | Promise<Response>
        >
      >(true);
    },
  );
  step(
    `given "/home/:path/something/else/:view" as route, should expose path and view as params`,
    () => {
      type Result = MatchHandler<
        HandlerContextBase,
        ExtractPathMatch<
          "/home/:path/something/else/:view"
        >
      >;
      Types.assertType<
        Types.IsExact<
          Parameters<Result>,
          [
            Request,
            {
              remoteAddr: Deno.NetAddr;
            },
            {
              path: string;
              view: string;
            },
          ]
        >
      >(true);
      Types.assertType<
        Types.IsExact<
          ReturnType<Result>,
          Response | Promise<Response>
        >
      >(true);
    },
  );
});

Deno.test("typesafety - Routes", () => {
  type Result = Routes<
    {
      "/": unknown;
      "/home/:path/something/else/:view": unknown;
    },
    HandlerContextBase,
    "",
    ""
  >;
  Types.assertType<
    Types.IsExact<
      Parameters<Result["/home/:path/something/else/:view"]>,
      [
        Request,
        {
          remoteAddr: Deno.NetAddr;
        },
        {
          path: string;
          view: string;
        },
      ]
    >
  >(true);
  Types.assertType<
    Types.IsExact<
      Parameters<Result["/"]>,
      [
        Request,
        {
          remoteAddr: Deno.NetAddr;
        },
        EmptyObject,
      ]
    >
  >(true);
  Types.assertType<
    Types.IsExact<
      ReturnType<Result["/home/:path/something/else/:view"]>,
      Response | Promise<Response>
    >
  >(true);
  Types.assertType<
    Types.IsExact<
      ReturnType<Result["/"]>,
      Response | Promise<Response>
    >
  >(true);
});

Deno.test("typesafety - router with direct typings", () => {
  const r = router<
    Routes<
      {
        "/": unknown;
        "/home/:path/something/else/:view": unknown;
      },
      HandlerContextBase,
      "",
      ""
    >,
    HandlerContextBase
  >({
    "/": (req, ctx, match) => new Response(),
    "/home/:path/something/else/:view": (req, ctx, match) => new Response(),
  });
});

Deno.test("typesafety - router with inferred typings", () => {
  const r = router({
    "/": (req, ctx, match) => new Response(),
    "/home/:path/something/else/:view": (req, ctx, match) => new Response(),
  });
});

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
        "/test/more": (req, ctx, match) => {
          return new Response();
        },
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
        "/abc": (req, ctx, match) => new Response(),
        "/123": () => new Response(),
      },
      "/item": {
        "/:itemId": {
          "/details": (req, ctx, match) => new Response(),
        },
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
