import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { router } from "https://deno.land/x/rutt/mod.ts";

await serve(
  router({
    "/hello/:name": (_req, _, { name }) =>
      new Response(`Hello ${name}`, { status: 200 }),
  }),
);
