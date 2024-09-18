import { router } from "../mod.ts";

export default {
  fetch: router({
    "/hello/:name": (_req, _, { name }) =>
      new Response(`Hello ${name}`, { status: 200 }),
  }),
};
