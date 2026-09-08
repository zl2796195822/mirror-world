import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { URL } from "node:url";

const pagePath = new URL("../app/world/page.tsx", import.meta.url);

test("World Overview keeps M1-T03 data honest and complete", async () => {
  const source = await readFile(pagePath, "utf8");

  for (const requiredText of [
    "世界时间",
    "运行状态",
    "30 个占位",
    "最近事件",
    "未接入",
  ]) {
    assert.ok(
      source.includes(requiredText),
      `World Overview must include ${requiredText}`,
    );
  }

  assert.match(source, /requireUser\(\)/);
  assert.doesNotMatch(source, /居民正在|事件已经发生|世界正在运行/);
});
