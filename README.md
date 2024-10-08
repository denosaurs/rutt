# Rutt

Rutt is a tiny http router designed for use with deno and deno deploy. It is
written in about 200 lines of code and is pretty fast, using an extended type of
the web-standard
[`URLPattern`s](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern) to
provide fast and easy route matching.

```ts
import { router } from "jsr:@denosaurs/rutt";

await Deno.serve(
  router({
    "/": (_req) => new Response("Hello world!", { status: 200 }),
  }),
).finished;
```

## Usage with `deno serve`

```ts
import { router } from "jsr:@denosaurs/rutt";

export default {
  fetch: router({
    "/hello/:name": (_req, _, { name }) =>
      new Response(`Hello ${name}`, { status: 200 }),
  }),
};
```

## Projects using `rutt`

- [denoland/fresh](https://github.com/denoland/fresh)

## Maintainers

- Elias Sjögreen ([@eliassjogreen](https://github.com/eliassjogreen))
- Dean Srebnik ([@load1n9](https://github.com/load1n9))
- Leo Kettmeir ([@crowlKats](https://github.com/crowlKats))

### Contribution

Pull request, issues and feedback are very welcome. Code style is formatted with
`deno fmt` and commit messages are done following Conventional Commits spec.

### Licence

Copyright 2022-2024, the denosaurs team. All rights reserved. MIT license.
