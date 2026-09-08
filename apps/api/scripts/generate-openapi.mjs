import { writeFile } from "node:fs/promises";
import { buildApp } from "../dist/app.js";

const app = await buildApp({ database: null });

try {
  await app.ready();
  const document = app.swagger();
  await writeFile(
    new URL("../openapi.json", import.meta.url),
    `${JSON.stringify(document, null, 2)}\n`,
  );
} finally {
  await app.close();
}
