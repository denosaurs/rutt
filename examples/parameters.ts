import { router } from "https://deno.land/x/rutt/mod.ts";

await Deno.serve(
  router({
    "/hello/:name": (_req, _, { name }) =>
      new Response(`Hello ${name}`, { status: 200 }),
  }),
).finished;
