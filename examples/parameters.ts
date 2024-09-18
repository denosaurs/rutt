import { router } from "jsr:@denosaurs/rutt";

await Deno.serve(
  router({
    "/hello/:name": (_req, _, { name }) =>
      new Response(`Hello ${name}`, { status: 200 }),
  }),
).finished;
