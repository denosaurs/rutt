import { serve } from "https://deno.land/std@0.173.0/http/server.ts";
import { router } from "../mod.ts";

await serve(
  router({
    "/hello": {
      "/world": (_req) => new Response("Hello world!", { status: 200 }),
    },
  }),
);
