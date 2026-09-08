import assert from "node:assert/strict";
import { test } from "node:test";

import { productionAuthConfigError } from "./validate-production-env.mjs";

test("rejects development auth when enabled for a production build", () => {
  assert.match(
    productionAuthConfigError({ MIRROR_DEV_AUTH: "true" }) ?? "",
    /not allowed during a production build/,
  );
});

test("allows production auth configuration when development auth is disabled", () => {
  assert.equal(productionAuthConfigError({ MIRROR_DEV_AUTH: "false" }), null);
  assert.equal(productionAuthConfigError({}), null);
});
