# Rutt

Rutt is a tiny http router designed for use with deno and deno deploy. It is
written in about 200 lines of code and is pretty fast, using an extended type of
the web-standard
[`URLPattern`s](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern) to
provide fast and easy route matching.

```ts
import { router } from "https://deno.land/x/rutt/mod.ts";

await Deno.serve(
  router({
    "/": (_req) => new Response("Hello world!", { status: 200 }),
  }),
).finished;
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

Copyright 2022-2023, the denosaurs team. All rights reserved. MIT license.
