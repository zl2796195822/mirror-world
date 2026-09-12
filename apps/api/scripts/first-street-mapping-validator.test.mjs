/* eslint-env node */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  loadMapping,
  validateFirstStreetMapping,
} from "./first-street-mapping-validator.mjs";

test("first street mapping is 17/17 and unique", () => {
  const result = validateFirstStreetMapping(loadMapping());
  assert.equal(result.ok, true, result.errors.join("; "));
  assert.equal(result.placeCount, 17);
  assert.equal(result.uniquePlaceIds, 17);
  assert.equal(result.uniquePlaceKeys, 17);
  assert.equal(result.typeCounts.HOME, 12);
  assert.equal(result.typeCounts.OFFICE, 1);
  assert.equal(result.typeCounts.CAFE, 1);
  assert.equal(result.typeCounts.STORE, 1);
  assert.equal(result.typeCounts.PARK, 1);
  assert.equal(result.typeCounts.TRANSIT, 1);
});

test("duplicate placeId fails validation", () => {
  const mapping = loadMapping();
  mapping.places[1].placeId = mapping.places[0].placeId;
  const result = validateFirstStreetMapping(mapping);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("duplicate placeId")));
});

test("missing place fails validation", () => {
  const mapping = loadMapping();
  mapping.places = mapping.places.slice(0, 16);
  const result = validateFirstStreetMapping(mapping);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("expected 17")));
});

test("projection version mismatch fails validation", () => {
  const mapping = loadMapping();
  mapping.compatibleProjectionVersion = "client-projection-v1";
  const result = validateFirstStreetMapping(mapping);
  assert.equal(result.ok, false);
});
