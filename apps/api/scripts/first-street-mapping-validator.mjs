/* eslint-env node */
// Validates first-street-place-mapping-v0.json against client-projection expectations.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const mappingPath = path.resolve(
  here,
  "../../../docs/client/first-street/first-street-place-mapping-v0.json",
);

export function validateFirstStreetMapping(mapping) {
  const errors = [];
  if (mapping.manifestVersion !== "first-street-visual-v0") {
    errors.push("manifestVersion must be first-street-visual-v0");
  }
  if (mapping.compatibleProjectionVersion !== "client-projection-v0") {
    errors.push("compatibleProjectionVersion must be client-projection-v0");
  }
  if (!mapping.fallbackAnchor?.anchorId) {
    errors.push("fallbackAnchor.anchorId is required");
  }

  const places = mapping.places ?? [];
  if (places.length !== 17) {
    errors.push(`expected 17 places, got ${places.length}`);
  }

  const placeIds = new Set();
  const placeKeys = new Set();
  for (const place of places) {
    if (!place.placeId) errors.push(`missing placeId for ${place.placeKey}`);
    if (!place.placeKey) errors.push(`missing placeKey for ${place.placeId}`);
    if (!place.placeType)
      errors.push(`missing placeType for ${place.placeKey}`);
    if (!place.anchorId) errors.push(`missing anchorId for ${place.placeKey}`);
    if (!place.sceneZone)
      errors.push(`missing sceneZone for ${place.placeKey}`);
    if (!place.entryAnchor) {
      errors.push(`missing entryAnchor for ${place.placeKey}`);
    }
    if (
      !Array.isArray(place.approxPositionCm) ||
      place.approxPositionCm.length !== 3
    ) {
      errors.push(`invalid approxPositionCm for ${place.placeKey}`);
    }
    if (placeIds.has(place.placeId)) {
      errors.push(`duplicate placeId ${place.placeId}`);
    }
    if (placeKeys.has(place.placeKey)) {
      errors.push(`duplicate placeKey ${place.placeKey}`);
    }
    placeIds.add(place.placeId);
    placeKeys.add(place.placeKey);
  }

  const typeCounts = places.reduce((acc, place) => {
    acc[place.placeType] = (acc[place.placeType] ?? 0) + 1;
    return acc;
  }, {});

  return {
    ok: errors.length === 0,
    errors,
    placeCount: places.length,
    uniquePlaceIds: placeIds.size,
    uniquePlaceKeys: placeKeys.size,
    typeCounts,
  };
}

export function loadMapping() {
  return JSON.parse(readFileSync(mappingPath, "utf8"));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = validateFirstStreetMapping(loadMapping());
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
  else assert.equal(result.placeCount, 17);
}
