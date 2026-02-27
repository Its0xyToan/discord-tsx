import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runPostbuild } from "../dist/scripts/postbuild.js";

test("postbuild: rewrites compiled JSX calls to plain payload objects", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "discord-tsx-postbuild-"));
  const inputFile = path.join(tempDir, "fixture.js");

  const compiledLikeInput = `import { jsx as _jsx, jsxs as _jsxs } from "discord-tsx/jsx-runtime";
import { DiscordEmbed, Description, DiscordComponent, Text } from "discord-tsx";
const name = "World";
export const embed = _jsx(DiscordEmbed, {
  color: "#ffffff",
  children: _jsxs(Description, { children: ["Hello ", name] })
});
export const components = _jsx(DiscordComponent, {
  children: _jsx(Text, { children: "hello" })
});
`;

  try {
    await writeFile(inputFile, compiledLikeInput, "utf8");
    await runPostbuild(tempDir);
    const output = await readFile(inputFile, "utf8");

    assert.match(output, /export const embed = \{[\s\S]*color: 16777215/);
    assert.match(output, /description:/);
    assert.match(output, /export const components = \{[\s\S]*flags: 32768/);
    assert.match(output, /type: 10/);
    assert.match(output, /content:\s*"hello"/);
    assert.doesNotMatch(output, /export const embed = _jsx\(/);
    assert.doesNotMatch(output, /export const components = _jsx\(/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
