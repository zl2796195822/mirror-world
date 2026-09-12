import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { URL } from "node:url";

const pagePath = new URL("../app/world/page.tsx", import.meta.url);

test("Observer V0 world page keeps LIVE projection honest", async () => {
  const source = await readFile(pagePath, "utf8");

  for (const requiredText of [
    "LIVE",
    "WORLD STATUS",
    "FIRST STREET LIVE",
    "LIVE WORLD EVENTS",
    "loadClientObserverBundle",
    "Client Projection 暂不可用",
  ]) {
    assert.ok(
      source.includes(requiredText),
      `World Observer must include ${requiredText}`,
    );
  }

  assert.match(source, /requireUser\(\)/);
  assert.doesNotMatch(source, /居民正在吃|伪造事件|模拟世界已启动/);
});
