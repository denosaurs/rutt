import { router } from "https://deno.land/x/rutt/mod.ts";

await Deno.serve(
  router({
    "/hello/:andThisNot": (_req, _, { thisShouldBeUndefined, andThisNot }) =>
      new Response(`Hello ${thisShouldBeUndefined} and ${andThisNot}`, {
        status: 200,
      }),
  }),
).finished;
