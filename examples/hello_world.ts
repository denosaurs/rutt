import { router } from "../mod.ts";

await Deno.serve(
  router({
    "/": (_req) => new Response("Hello world!", { status: 200 }),
  }),
).finished;
