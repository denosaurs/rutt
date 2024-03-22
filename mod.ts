/**
 * Rutt is a tiny http router designed for use with deno and deno deploy.
 * It is written in about 300 lines of code and is fast enough, using an
 * extended type of the web-standard {@link URLPattern} to provide fast and
 * easy route matching.
 *
 * @example
 * ```ts
 * import { router } from "https://deno.land/x/rutt/mod.ts";
 *
 * await Deno.serve(
 *   router({
 *     "/": (_req) => new Response("Hello world!", { status: 200 }),
 *   }),
 * ).finished;
 * ```
 *
 * @module
 */

// deno-lint-ignore no-explicit-any
export type TemplateWildcard = any;
type EmptyObject = Record<never, never>;
export type RoutePath = string; // number | symbol | ;
export type UnknownRouteNesting = Record<string, unknown>;

export type EnsureString<A extends string | symbol | number> = A extends string
  ? A
  : "";
export type JoinStrings<A extends string, B extends string> = `${A}${B}`;

// deno-fmt-ignore formatting Split will make it unreadable
export type Split<S extends RoutePath, D extends string> =
  string extends S
  ? string[]
  : S extends ""
    ? []
    : S extends `${infer T}${D}${infer U}`
      ? [T, ...Split<U, D>]
      : [S];

// deno-fmt-ignore formatting FilterAndTrimPathParamsToStringUnion will make it unreadable
export type FilterAndTrimPathParamsToStringUnion<A extends RoutePath[], P extends string> =
  {
    // This "object" is an array of nevers and path segments
    [K in keyof A]:
      string extends A[K]
      ? never
      : A[K] extends ""
        ? never
        : A[K] extends `${P}` // when matched ":" alone - drop it
          ? P
          : A[K] extends `${P}${infer R}`
            ? R
            : never
  }[number]; // if you get array[number] like this - TS will drop nevers and create union of strings

/**
 * ```typescript
 *  type Path = "/api/items/:itemId/filter/:filterId"
 *  const extracted: ExtractPathMatch<Path> = {
 *    // TypeScript will expect itemId and filterId as defined strings here
 *  };
 * ```
 */
export type ExtractPathMatch<
  T extends RoutePath,
  P extends string = string,
  S extends string = ":",
> = Record<
  FilterAndTrimPathParamsToStringUnion<
    Split<T, "/">,
    S
  >,
  P
>;

export type HandlerContextBase = Deno.ServeHandlerInfo;

/**
 * Provides arbitrary context to {@link Handler} functions along with
 * {@link ConnInfo connection information}.
 */
export type HandlerContext<
  HandlerContextExtra extends Record<string, TemplateWildcard> = Record<
    string,
    unknown
  >,
> = HandlerContextBase & HandlerContextExtra;

/**
 * A handler for HTTP requests. Consumes a request and {@link HandlerContext}
 * and returns an optionally async response.
 */
export type Handler<HandlerContextExtra extends HandlerContextBase> = (
  req: Request,
  ctx: HandlerContext<HandlerContextExtra>,
) => Response | Promise<Response>;

/**
 * A handler type for anytime the `MatchHandler` or `other` parameter handler
 * fails
 */
export type ErrorHandler<HandlerContextExtra extends HandlerContextBase> = (
  req: Request,
  ctx: HandlerContext<HandlerContextExtra>,
  err: unknown,
) => Response | Promise<Response>;

/**
 * A handler type for anytime a method is received that is not defined
 */
export type UnknownMethodHandler<
  HandlerContextExtra extends HandlerContextBase,
> = (
  req: Request,
  ctx: HandlerContext<HandlerContextExtra>,
  knownMethods: KnownMethod[],
) => Response | Promise<Response>;

/**
 * A handler type for a router path match which gets passed the matched values
 */
export type MatchHandler<
  HandlerContextExtra extends HandlerContextBase,
  _PatternMatch extends Record<string, string> = Record<string, string>,
> = <__PatternMatch extends _PatternMatch>(
  req: Request,
  ctx: HandlerContext<HandlerContextExtra>,
  match: _PatternMatch,
) => Response | Promise<Response>;

export type RoutesBranch<
  RoutesWithHandlers extends UnknownRouteNesting,
  HandlerContextExtra extends HandlerContextBase,
  Key extends RoutePath,
  FullPath extends RoutePath,
> = Routes<
  RoutesWithHandlers,
  HandlerContextExtra,
  Key,
  FullPath
>;

// export type NestedRoutes<
//   ParentKey extends string,
//   HandlerContextExtra extends HandlerContextBase,
//   RoutesDefinition extends UnknownRouteNesting,
// > = {
//   [Key in keyof RoutesDefinition]: RoutesBranch<
//     JoinStrings<ParentKey, EnsureString<Key>>,
//     HandlerContextExtra
//   >;
// };

/**
 * A record of route paths and {@link MatchHandler}s which are called when a match is
 * found along with it's values.
 *
 * The route paths follow the {@link URLPattern} format with the addition of
 * being able to prefix a route with a method name and the `@` sign. For
 * example a route only accepting `GET` requests would look like: `GET@/`.
 */
export type Routes<
  RoutesWithHandlers extends UnknownRouteNesting,
  HandlerContextExtra extends HandlerContextBase,
  ParentKey extends RoutePath,
  FullPath extends RoutePath,
> = {
  [Key in keyof RoutesWithHandlers]:
    RoutesWithHandlers[EnsureString<Key>] extends UnknownRouteNesting
      ? RoutesBranch<
        RoutesWithHandlers[EnsureString<Key>],
        HandlerContextExtra,
        EnsureString<Key>,
        JoinStrings<FullPath, EnsureString<Key>>
      >
      : MatchHandler<
        HandlerContextExtra,
        ExtractPathMatch<JoinStrings<FullPath, EnsureString<Key>>>
      >;
};

/**
 * The internal route object contains either a {@link RegExp} pattern or
 * {@link URLPattern} which is matched against the incoming request
 * URL. If a match is found for both the pattern and method the associated
 * {@link MatchHandler} is called.
 */
export type InternalRoute<
  PatternMatch extends Record<string, string>,
  HandlerContextExtra extends HandlerContextBase,
> = {
  pattern: RegExp | URLPattern;
  methods: Record<string, MatchHandler<HandlerContextExtra, PatternMatch>>;
};

/**
 * An array of {@link InternalRoute internal route} objects which the
 * {@link Routes routes} record is mapped into. This array is used internally
 * in the {@link router} function and can even be passed directly to it if you
 * do not wish to use the {@link Routes routes} record or want more fine grained
 * control over matches, for example by using a {@link RegExp} pattern instead
 * of a {@link URLPattern}.
 */
export type InternalRoutes<
  PatternMatch extends Record<string, string>,
  HandlerContextExtra extends HandlerContextBase,
> = InternalRoute<
  PatternMatch,
  HandlerContextExtra
>[];

/**
 * Additional options for the {@link router} function.
 */
export interface RouterOptions<HandlerContextExtra extends HandlerContextBase> {
  /**
   * An optional property which contains a handler for anything that doesn't
   * match the `routes` parameter
   */
  otherHandler?: Handler<HandlerContextExtra>;
  /**
   * An optional property which contains a handler for any time it fails to run
   * the default request handling code
   */
  errorHandler?: ErrorHandler<HandlerContextExtra>;
  /**
   * An optional property which contains a handler for any time a method that
   * is not defined is used
   */
  unknownMethodHandler?: UnknownMethodHandler<HandlerContextExtra>;
}

/**
 * A known HTTP method.
 */
export type KnownMethod = (typeof knownMethods)[number];

/**
 * All known HTTP methods.
 */
export const knownMethods = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "DELETE",
  "OPTIONS",
  "PATCH",
] as const;

/**
 * The default other handler for the router. By default it responds with `null`
 * body and a status of 404.
 */
export function defaultOtherHandler(_req: Request): Response {
  return new Response(null, {
    status: 404,
  });
}

/**
 * The default error handler for the router. By default it responds with `null`
 * body and a status of 500 along with `console.error` logging the caught error.
 */
export function defaultErrorHandler<
  HandlerContextExtra extends HandlerContextBase,
>(
  _req: Request,
  _ctx: HandlerContextExtra,
  err: unknown,
): Response {
  console.error(err);

  return new Response(null, {
    status: 500,
  });
}

/**
 * The default unknown method handler for the router. By default it responds
 * with `null` body, a status of 405 and the `Accept` header set to all
 * {@link KnownMethod known methods}.
 */
export function defaultUnknownMethodHandler<
  HandlerContextExtra extends HandlerContextBase,
>(
  _req: Request,
  _ctx: HandlerContextExtra,
  knownMethods: KnownMethod[],
): Response {
  return new Response(null, {
    status: 405,
    headers: {
      Accept: knownMethods.join(", "),
    },
  });
}

const knownMethodRegex = new RegExp(`(?<=^(?:${knownMethods.join("|")}))@`);

function joinPaths(a: string, b: string): string {
  if (a.endsWith("/")) {
    a = a.slice(0, -1);
  }

  if (!b.startsWith("/") && !b.startsWith("{/}?")) {
    b = "/" + b;
  }

  return a + b;
}

const isHandler = <
  RoutePath extends string,
  HandlerContextExtra extends HandlerContextBase,
>(
  handler: unknown,
): handler is MatchHandler<HandlerContextExtra, ExtractPathMatch<RoutePath>> =>
  typeof handler === "function";

/**
 * Builds an {@link InternalRoutes} array from a {@link Routes} record.
 *
 * @param routes A {@link Routes} record
 * @returns The built {@link InternalRoutes}
 */
export function buildInternalRoutes<
  RoutePath extends string,
  BaseRoutes extends Routes<BaseRoutes, HandlerContextExtra, RoutePath, "">,
  HandlerContextExtra extends HandlerContextBase,
>(
  routes: BaseRoutes,
  basePath: RoutePath,
): InternalRoutes<ExtractPathMatch<RoutePath>, HandlerContextExtra> {
  const internalRoutesRecord: Record<
    string,
    InternalRoute<ExtractPathMatch<RoutePath>, HandlerContextExtra>
  > = {};
  for (const [_route, handler] of Object.entries(routes)) {
    const route = _route as keyof BaseRoutes & string;
    let [methodOrPath, path] = route.split(knownMethodRegex);
    let method = methodOrPath;
    if (!path) {
      path = methodOrPath;
      method = "any";
    }

    path = joinPaths(basePath, path);

    if (isHandler<RoutePath, HandlerContextExtra>(handler)) {
      const r = internalRoutesRecord[path] ?? {
        pattern: new URLPattern({ pathname: path }),
        methods: {},
      };
      r.methods[method] = handler;
      internalRoutesRecord[path] = r;
    } else {
      const subroutes = buildInternalRoutes<
        RoutePath,
        BaseRoutes,
        HandlerContextExtra
      >(
        handler as any,
        path as RoutePath,
      );
      for (const subroute of subroutes) {
        internalRoutesRecord[(subroute.pattern as URLPattern).pathname] ??=
          subroute;
      }
    }
  }

  return Object.values(internalRoutesRecord);
}

/**
 * A simple and tiny router for deno. This function provides a way of
 * constructing a HTTP request handler for the provided {@link routes} and any
 * provided {@link RouterOptions}.
 *
 * @example
 * ```ts
 * import { router } from "https://deno.land/x/rutt/mod.ts";
 *
 * await Deno.serve(
 *   router({
 *     "/": (_req) => new Response("Hello world!", { status: 200 }),
 *   }),
 * ).finished;
 * ```
 *
 * @param routes A record of all routes and their corresponding handler functions
 * @param options An object containing all of the possible configuration options
 * @returns A deno std compatible request handler
 */
export function router<
  R extends Routes<R, HandlerContextExtra, "", "">,
  HandlerContextExtra extends HandlerContextBase,
>(
  routes: R | InternalRoutes<EmptyObject, HandlerContextExtra>,
  { otherHandler, errorHandler, unknownMethodHandler }: RouterOptions<
    HandlerContextExtra
  > = {
    otherHandler: defaultOtherHandler,
    errorHandler: defaultErrorHandler,
    unknownMethodHandler: defaultUnknownMethodHandler,
  },
): Handler<HandlerContextExtra> {
  otherHandler ??= defaultOtherHandler;
  errorHandler ??= defaultErrorHandler;
  unknownMethodHandler ??= defaultUnknownMethodHandler;

  const internalRoutes = Array.isArray(routes) ? routes : buildInternalRoutes<
    "/",
    R,
    HandlerContextExtra
  >(routes, "/");

  return async (req, ctx) => {
    try {
      for (const { pattern, methods } of internalRoutes) {
        pattern;
        const res = pattern.exec(req.url);
        const groups = (pattern instanceof URLPattern
          ? ((res as URLPatternResult | null)?.pathname.groups as
            | Record<string, string>
            | undefined)
          : (res as RegExpExecArray | null)?.groups) ?? {};

        for (const key in groups) {
          groups[key] = decodeURIComponent(groups[key]);
        }

        if (res !== null) {
          for (const [method, handler] of Object.entries(methods)) {
            if (req.method === method) {
              return await handler(req, ctx, groups as never);
            }
          }

          if (methods["any"]) {
            return await methods["any"](req, ctx, groups as never);
          } else {
            return await unknownMethodHandler!(
              req,
              ctx,
              Object.keys(methods) as KnownMethod[],
            );
          }
        }
      }

      return await otherHandler!(req, ctx);
    } catch (err) {
      return errorHandler!(req, ctx, err);
    }
  };
}
