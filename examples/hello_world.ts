import { router } from "jsr:@denosaurs/rutt";

await Deno.serve(
  router({
    "/": (_req) => new Response("Hello world!", { status: 200 }),
  }),
).finished;
