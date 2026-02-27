# Examples

## Files

- `raw-json.ts`: direct payload objects.
- `runtime-vs-postbuild.tsx`: TSX source used for runtime and postbuild comparison.
- `tag-showcase.tsx`: every supported tag in one file.
- `discordjs-builders.md`: equivalent `discord.js` builder chain.
- `run-comparison.mjs`: prints a runtime-vs-raw equality report and payload preview.

## Commands

Type-check examples:

```bash
yarn examples:check
```

Build examples (without postbuild transform):

```bash
yarn examples:build
```

Run runtime comparison (compiled JS before postbuild transform):

```bash
yarn examples:runtime
```

Run postbuild transform and compare again:

```bash
yarn examples:postbuild
```
