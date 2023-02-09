/**
 * Rutt is a tiny http router designed for use with deno and deno deploy.
 * It is written in about 300 lines of code and is fast enough, using an
 * extended type of the web-standard {@link URLPattern} to provide fast and
 * easy route matching.
 *
 * @module
 */

import type { ConnInfo } from "https://deno.land/std@0.177.0/http/server.ts";

/**
 * Provides arbitrary context to {@link Handler} functions along with
 * {@link ConnInfo connection information}.
 */
export type HandlerContext<T = unknown> = T & ConnInfo;

/**
 * A handler for HTTP requests. Consumes a request and {@link HandlerContext}
 * and returns an optionally async response.
 */
export type Handler<T = unknown> = (
  req: Request,
  ctx: HandlerContext<T>,
) => Response | Promise<Response>;

/**
 * A handler type for anytime the `MatchHandler` or `other` parameter handler
 * fails
 */
export type ErrorHandler<T = unknown> = (
  req: Request,
  ctx: HandlerContext<T>,
  err: unknown,
) => Response | Promise<Response>;

/**
 * A handler type for anytime a method is received that is not defined
 */
export type UnknownMethodHandler<T = unknown> = (
  req: Request,
  ctx: HandlerContext<T>,
  knownMethods: KnownMethod[],
) => Response | Promise<Response>;

/**
 * A handler type for a router path match which gets passed the matched values
 */
export type MatchHandler<T = unknown> = (
  req: Request,
  ctx: HandlerContext<T>,
  match: Record<string, string>,
) => Response | Promise<Response>;

/**
 * A record of route paths and {@link MatchHandler}s which are called when a match is
 * found along with it's values.
 *
 * The route paths follow the {@link URLPattern} format with the addition of
 * being able to prefix a route with a method name and the `@` sign. For
 * example a route only accepting `GET` requests would look like: `GET@/`.
 */
// deno-lint-ignore ban-types
export interface Routes<T = {}> {
  [key: string]: Routes<T> | MatchHandler<T>;
}

/**
 * The internal route object contains either a {@link RegExp} pattern or
 * {@link URLPattern} which is matched against the incoming request
 * URL. If a match is found for both the pattern and method the associated
 * {@link MatchHandler} is called.
 */
// deno-lint-ignore ban-types
export type InternalRoute<T = {}> = {
  pattern: RegExp | URLPattern;
  methods: Record<string, MatchHandler<T>>;
};

/**
 * An array of {@link InternalRoute internal route} objects which the
 * {@link Routes routes} record is mapped into. This array is used internally
 * in the {@link router} function and can even be passed directly to it if you
 * do not wish to use the {@link Routes routes} record or want more fine grained
 * control over matches, for example by using a {@link RegExp} pattern instead
 * of a {@link URLPattern}.
 */
// deno-lint-ignore ban-types
export type InternalRoutes<T = {}> = InternalRoute<T>[];

/**
 * Additional options for the {@link router} function.
 */
export interface RouterOptions<T> {
  /**
   * An optional property which contains a handler for anything that doesn't
   * match the `routes` parameter
   */
  otherHandler?: Handler<T>;
  /**
   * An optional property which contains a handler for any time it fails to run
   * the default request handling code
   */
  errorHandler?: ErrorHandler<T>;
  /**
   * An optional property which contains a handler for any time a method that
   * is not defined is used
   */
  unknownMethodHandler?: UnknownMethodHandler<T>;
}

/**
 * A known HTTP method.
 */
export type KnownMethod = typeof KnownMethods[number];

/**
 * All known HTTP methods.
 */
export const KnownMethods = [
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
export function defaultErrorHandler(
  _req: Request,
  _ctx: HandlerContext,
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
 * {@link KnownMethods known methods}.
 */
export function defaultUnknownMethodHandler(
  _req: Request,
  _ctx: HandlerContext,
  knownMethods: KnownMethod[],
): Response {
  return new Response(null, {
    status: 405,
    headers: {
      Accept: knownMethods.join(", "),
    },
  });
}

const knownMethodRegex = new RegExp(`(?<=^(?:${KnownMethods.join("|")}))@`);

function joinPaths(a: string, b: string): string {
  if (a.endsWith("/")) {
    a = a.slice(0, -1);
  }

  if (!b.startsWith("/") && !b.startsWith("{/}?")) {
    b = "/" + b;
  }

  return a + b;
}

/**
 * Builds an {@link InternalRoutes} array from a {@link Routes} record.
 *
 * @param routes A {@link Routes} record
 * @returns The built {@link InternalRoutes}
 */
export function buildInternalRoutes<T = unknown>(
  routes: Routes<T>,
  basePath = "/",
): InternalRoutes<T> {
  const internalRoutesRecord: Record<string, InternalRoute<T>> = {};
  for (const [route, handler] of Object.entries(routes)) {
    let [methodOrPath, path] = route.split(knownMethodRegex);
    let method = methodOrPath;
    if (!path) {
      path = methodOrPath;
      method = "any";
    }

    path = joinPaths(basePath, path);

    if (typeof handler === "function") {
      const r = internalRoutesRecord[path] ?? {
        pattern: new URLPattern({ pathname: path }),
        methods: {},
      };
      r.methods[method] = handler;
      internalRoutesRecord[path] = r;
    } else {
      const subroutes = buildInternalRoutes(handler, path);
      for (const subroute of subroutes) {
        internalRoutesRecord[(subroute.pattern as URLPattern).pathname] ??=
          subroute;
      }
    }
  }

  return Object.values(internalRoutesRecord);
}

/**
 * A simple and tiny router for deno
 *
 * @example
 * ```ts
 * import { serve } from "https://deno.land/std/http/server.ts";
 * import { router } from "https://deno.land/x/rutt/mod.ts";
 *
 * await serve(
 *   router({
 *     "/": (_req) => new Response("Hello world!", { status: 200 }),
 *   }),
 * );
 * ```
 *
 * @param routes A record of all routes and their corresponding handler functions
 * @param options An object containing all of the possible configuration options
 * @returns A deno std compatible request handler
 */
export function router<T = unknown>(
  routes: Routes<T> | InternalRoutes<T>,
  { otherHandler, errorHandler, unknownMethodHandler }: RouterOptions<T> = {
    otherHandler: defaultOtherHandler,
    errorHandler: defaultErrorHandler,
    unknownMethodHandler: defaultUnknownMethodHandler,
  },
): Handler<T> {
  otherHandler ??= defaultOtherHandler;
  errorHandler ??= defaultErrorHandler;
  unknownMethodHandler ??= defaultUnknownMethodHandler;

  const internalRoutes = Array.isArray(routes)
    ? routes
    : buildInternalRoutes(routes);

  return async (req, ctx) => {
    try {
      for (const { pattern, methods } of internalRoutes) {
        const res = pattern.exec(req.url);
        const groups = (pattern instanceof URLPattern
          ? (res as URLPatternResult | null)?.pathname.groups
          : (res as RegExpExecArray | null)?.groups) ?? {};

        for (const key in groups) {
          groups[key] = decodeURIComponent(groups[key]);
        }

        if (res !== null) {
          for (const [method, handler] of Object.entries(methods)) {
            if (req.method === method) {
              return await handler(req, ctx, groups);
            }
          }

          if (methods["any"]) {
            return await methods["any"](req, ctx, groups);
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
