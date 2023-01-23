import { serve } from "https://deno.land/std@0.173.0/http/server.ts";
import { router } from "https://deno.land/x/rutt/mod.ts";

await serve(
  router({
    "/": (_req) => new Response("Hello world!", { status: 200 }),
  }),
);
